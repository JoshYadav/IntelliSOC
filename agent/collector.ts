import { exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface AgentConfig {
  backendUrl: string;
  intervalSeconds: number;
  heartbeatIntervalSeconds: number;
  watchPaths: string[];
  hostname?: string;
}

// Default config
let config: AgentConfig = {
  backendUrl: 'http://localhost:5000',
  intervalSeconds: 60,
  heartbeatIntervalSeconds: 10,
  watchPaths: [],
};

// Load config
const configPath = path.join(__dirname, 'config.json');
if (fs.existsSync(configPath)) {
  try {
    const fileData = fs.readFileSync(configPath, 'utf8');
    config = { ...config, ...JSON.parse(fileData) };
  } catch (err) {
    console.error('Error reading config file, using defaults:', err);
  }
}

const hostname = config.hostname || os.hostname();
const platform = os.platform();
const arch = os.arch();
const release = os.release();
const agentVersion = '1.0.0';

// In-memory queues for events
let fileEventQueue: any[] = [];
const processedFilePaths = new Set<string>();

// Get local IP address
function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (ifaceList) {
      for (const iface of ifaceList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return '127.0.0.1';
}

const localIp = getLocalIp();

// Setup file watch paths
function setupFileWatchers() {
  console.log(`[Agent] Setting up file monitoring on paths: ${config.watchPaths.join(', ')}`);
  for (const watchPath of config.watchPaths) {
    if (!fs.existsSync(watchPath)) {
      console.warn(`[Agent] Watch path does not exist: ${watchPath}`);
      continue;
    }

    try {
      // Use fs.watch (recursive where supported, e.g. Windows, macOS)
      const options = platform === 'win32' || platform === 'darwin' ? { recursive: true } : {};
      fs.watch(watchPath, options, (eventType, filename) => {
        if (!filename) return;
        const fullPath = path.join(watchPath, filename).replace(/\\/g, '/');

        // Simple debounce / ignore duplicate events in quick succession
        const key = `${eventType}:${fullPath}`;
        if (processedFilePaths.has(key)) return;
        processedFilePaths.add(key);
        setTimeout(() => processedFilePaths.delete(key), 2000);

        let size = 0;
        try {
          if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            size = stats.size;
          }
        } catch (_) {}

        // Map events to operation types
        let operation = 'MODIFY';
        if (eventType === 'rename') {
          operation = fs.existsSync(fullPath) ? 'CREATE' : 'DELETE';
        }

        fileEventQueue.push({
          path: fullPath,
          size,
          modifiedTime: new Date().toISOString(),
          operation,
        });

        // Cap queue size to prevent memory leaks if backend is offline
        if (fileEventQueue.length > 1000) {
          fileEventQueue.shift();
        }
      });
    } catch (err) {
      console.error(`[Agent] Failed to set up file watch on ${watchPath}:`, err);
    }
  }
}

// Run command utility
function runCommand(cmd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        resolve('');
      } else {
        resolve(stdout);
      }
    });
  });
}

// Collect Processes
async function collectProcesses(): Promise<any[]> {
  const processes: any[] = [];

  if (platform === 'win32') {
    // Windows: Use Powershell to get structured CimInstance processes with CommandLines
    const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine | ConvertTo-Json -Compress"`;
    const output = await runCommand(psCommand);
    if (output) {
      try {
        // Output can be a single object or an array of objects
        const parsed = JSON.parse(output.trim());
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of list) {
          processes.push({
            pid: item.ProcessId,
            name: item.Name,
            parentPid: item.ParentProcessId,
            path: item.ExecutablePath,
            commandLine: item.CommandLine,
          });
        }
      } catch (err) {
        // Fallback to basic tasklist
        const tasklistOutput = await runCommand('tasklist /FO CSV /NH');
        const lines = tasklistOutput.split('\n');
        for (const line of lines) {
          const parts = line.replace(/"/g, '').split(',');
          if (parts.length >= 2) {
            const pid = parseInt(parts[1], 10);
            if (!isNaN(pid)) {
              processes.push({
                pid,
                name: parts[0],
              });
            }
          }
        }
      }
    }
  } else {
    // Unix: ps aux
    const output = await runCommand('ps -ax -o pid=,ppid=,comm=,args=');
    if (output) {
      const lines = output.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const match = trimmed.match(/^(\d+)\s+(\d+)\s+([^\s]+)\s+(.+)$/);
        if (match) {
          processes.push({
            pid: parseInt(match[1], 10),
            parentPid: parseInt(match[2], 10),
            name: match[3],
            commandLine: match[4],
            path: match[3],
          });
        } else {
          // Simplistic fallback split
          const parts = trimmed.split(/\s+/);
          if (parts.length >= 3) {
            const pid = parseInt(parts[0], 10);
            const ppid = parseInt(parts[1], 10);
            if (!isNaN(pid)) {
              processes.push({
                pid,
                parentPid: isNaN(ppid) ? undefined : ppid,
                name: parts[2],
                commandLine: parts.slice(3).join(' ') || parts[2],
              });
            }
          }
        }
      }
    }
  }
  return processes;
}

// Collect Network Connections
async function collectNetworkConnections(): Promise<any[]> {
  const connections: any[] = [];
  const output = await runCommand('netstat -ano');

  if (output) {
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Parse Windows netstat -ano format: TCP 192.168.1.5:1234 10.0.0.12:80 ESTABLISHED 1234
      // Parse Linux netstat -ano or similar
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        const proto = parts[0];
        if (proto.startsWith('TCP') || proto.startsWith('UDP')) {
          const local = parts[1];
          const remote = parts[2];
          let state = '';
          let pidStr = '';

          if (parts.length === 5) {
            state = parts[3];
            pidStr = parts[4];
          } else if (parts.length === 4) {
            // UDP doesn't have state field
            state = 'ESTABLISHED';
            pidStr = parts[3];
          }

          const pid = parseInt(pidStr, 10);

          // Parse host and port
          const parseHostPort = (addrStr: string) => {
            const lastColon = addrStr.lastIndexOf(':');
            if (lastColon === -1) return { addr: addrStr, port: 0 };
            const addr = addrStr.substring(0, lastColon).replace(/\[|\]/g, '');
            const port = parseInt(addrStr.substring(lastColon + 1), 10);
            return { addr, port: isNaN(port) ? 0 : port };
          };

          const localParsed = parseHostPort(local);
          const remoteParsed = parseHostPort(remote);

          connections.push({
            localAddress: localParsed.addr,
            localPort: localParsed.port,
            remoteAddress: remoteParsed.addr,
            remotePort: remoteParsed.port,
            state,
            pid: isNaN(pid) ? undefined : pid,
            protocol: proto,
          });
        }
      }
    }
  }

  return connections;
}

// Send telemetry payload to backend
async function sendTelemetry(type: 'PROCESS' | 'NETWORK' | 'FILE' | 'SYSTEM_INFO', data: any[]) {
  if (data.length === 0 && type !== 'SYSTEM_INFO') return;

  const url = `${config.backendUrl}/api/edr/telemetry`;
  const body = {
    hostname,
    ip: localIp,
    os: `${platform} (${release})`,
    agentVersion,
    type,
    data,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`[Agent] Failed to send ${type} telemetry: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.error(`[Agent] Error sending ${type} telemetry to ${url}:`, err);
  }
}

// Send Heartbeat
async function sendHeartbeat() {
  const url = `${config.backendUrl}/api/edr/heartbeat`;
  const body = { hostname };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn(`[Agent] Heartbeat failed: ${response.status}`);
    }
  } catch (err) {
    console.error(`[Agent] Heartbeat connection error:`, err);
  }
}

// Main scheduler loops
async function runIngestionCycle() {
  console.log('[Agent] Running telemetry collection cycle...');
  try {
    // 1. Processes
    const processes = await collectProcesses();
    await sendTelemetry('PROCESS', processes);

    // 2. Network connections
    const network = await collectNetworkConnections();
    await sendTelemetry('NETWORK', network);

    // 3. File events
    const fileEvents = [...fileEventQueue];
    fileEventQueue = []; // clear queue
    await sendTelemetry('FILE', fileEvents);
  } catch (err) {
    console.error('[Agent] Error in telemetry cycle:', err);
  }
}

function start() {
  console.log(`[Agent] EDR Collector starting on ${hostname}...`);
  console.log(`[Agent] Backend URL: ${config.backendUrl}`);

  // Send initial system info telemetry to register endpoint
  sendTelemetry('SYSTEM_INFO', []).then(() => {
    // Setup file watchers
    setupFileWatchers();

    // Start heartbeat loop (every 10s)
    setInterval(sendHeartbeat, config.heartbeatIntervalSeconds * 1000);
    sendHeartbeat();

    // Start ingestion cycle loop (every 60s)
    setInterval(runIngestionCycle, config.intervalSeconds * 1000);
    runIngestionCycle();
  });
}

start();
