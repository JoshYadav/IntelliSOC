import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Playbook step type definitions ────────────────────────────────────────────
// Each step has: type, config (optional), requiresApproval (optional)
// Safe auto-run types: AI_SUMMARY, NOTIFY_SLACK, SEND_EMAIL, CREATE_INCIDENT,
//                      ESCALATE_PRIORITY, ADD_NOTE
// Human-approval types: BLOCK_IP, ISOLATE_ENDPOINT, CREATE_TICKET

const DEFAULT_PLAYBOOKS = [
  {
    name: 'Brute Force Response',
    description:
      'Triggered on BRUTE_FORCE alerts. Summarises the attack with AI, notifies Slack, creates an incident, and recommends blocking the attacker IP.',
    trigger: 'BRUTE_FORCE',
    steps: JSON.stringify([
      {
        index: 0,
        type: 'AI_SUMMARY',
        label: 'Generate AI incident summary',
        requiresApproval: false,
      },
      {
        index: 1,
        type: 'CREATE_INCIDENT',
        label: 'Auto-create incident',
        config: { priority: 'HIGH' },
        requiresApproval: false,
      },
      {
        index: 2,
        type: 'NOTIFY_SLACK',
        label: 'Send Slack alert to #soc-alerts',
        config: {
          messageTemplate:
            '🚨 *Brute Force Attack Detected*\nIP: {{ip}} | Attempts: {{count}} | User: {{user}}\nAbuseIPDB Score: {{abuseScore}} | Country: {{country}}\nMITRE: {{mitreTactic}}',
        },
        requiresApproval: false,
      },
      {
        index: 3,
        type: 'BLOCK_IP',
        label: 'Block attacker IP at firewall',
        config: { ruleTemplate: 'iptables -A INPUT -s {{ip}} -j DROP' },
        requiresApproval: true,
      },
    ]),
    enabled: true,
  },
  {
    name: 'Account Compromise Response',
    description:
      'Triggered on ACCOUNT_COMPROMISE alerts. Escalates to CRITICAL, summarises with AI, and notifies the team.',
    trigger: 'ACCOUNT_COMPROMISE',
    steps: JSON.stringify([
      {
        index: 0,
        type: 'AI_SUMMARY',
        label: 'Generate AI incident summary',
        requiresApproval: false,
      },
      {
        index: 1,
        type: 'CREATE_INCIDENT',
        label: 'Auto-create incident',
        config: { priority: 'CRITICAL' },
        requiresApproval: false,
      },
      {
        index: 2,
        type: 'ESCALATE_PRIORITY',
        label: 'Escalate incident to CRITICAL',
        requiresApproval: false,
      },
      {
        index: 3,
        type: 'NOTIFY_SLACK',
        label: 'Send Slack alert to #soc-alerts',
        config: {
          messageTemplate:
            '🔴 *Account Compromise Detected*\nUser: {{user}} | IP: {{ip}} | Country: {{country}}\nMITRE: {{mitreTactic}}\n⚠️ Recommend immediate password reset.',
        },
        requiresApproval: false,
      },
      {
        index: 4,
        type: 'BLOCK_IP',
        label: 'Block attacker IP at firewall',
        config: { ruleTemplate: 'iptables -A INPUT -s {{ip}} -j DROP' },
        requiresApproval: true,
      },
    ]),
    enabled: true,
  },
  {
    name: 'Malware Execution Response',
    description:
      'Triggered on MALWARE_PROCESS_CHAIN alerts. Escalates to CRITICAL, notifies team, and recommends endpoint isolation.',
    trigger: 'MALWARE_PROCESS_CHAIN',
    steps: JSON.stringify([
      {
        index: 0,
        type: 'AI_SUMMARY',
        label: 'Generate AI incident summary',
        requiresApproval: false,
      },
      {
        index: 1,
        type: 'CREATE_INCIDENT',
        label: 'Auto-create incident',
        config: { priority: 'CRITICAL' },
        requiresApproval: false,
      },
      {
        index: 2,
        type: 'ESCALATE_PRIORITY',
        label: 'Escalate incident to CRITICAL',
        requiresApproval: false,
      },
      {
        index: 3,
        type: 'NOTIFY_SLACK',
        label: 'Send Slack alert to #soc-alerts',
        config: {
          messageTemplate:
            '☠️ *Malware Execution Detected*\nEndpoint: {{hostname}} | Process chain flagged\nMITRE: {{mitreTactic}}\n⚠️ Recommend immediate endpoint isolation.',
        },
        requiresApproval: false,
      },
      {
        index: 4,
        type: 'ISOLATE_ENDPOINT',
        label: 'Isolate endpoint from network',
        requiresApproval: true,
      },
    ]),
    enabled: true,
  },
  {
    name: 'Port Scan Response',
    description:
      'Triggered on PORT_SCAN alerts. Creates a MEDIUM priority incident and notifies the team.',
    trigger: 'PORT_SCAN',
    steps: JSON.stringify([
      {
        index: 0,
        type: 'CREATE_INCIDENT',
        label: 'Auto-create incident',
        config: { priority: 'MEDIUM' },
        requiresApproval: false,
      },
      {
        index: 1,
        type: 'NOTIFY_SLACK',
        label: 'Send Slack alert to #soc-alerts',
        config: {
          messageTemplate:
            '🔍 *Port Scan Detected*\nIP: {{ip}} | Country: {{country}} | AbuseIPDB: {{abuseScore}}\nMITRE: {{mitreTactic}}',
        },
        requiresApproval: false,
      },
      {
        index: 2,
        type: 'ADD_NOTE',
        label: 'Add investigation note',
        config: {
          note: 'Port scan detected. Monitor for follow-up exploitation attempts from this IP.',
        },
        requiresApproval: false,
      },
    ]),
    enabled: true,
  },
];

// ── Demo EDR Endpoints ───────────────────────────────────────────────────────
const DEMO_ENDPOINTS = [
  {
    hostname: 'WS-FINANCE-PC01',
    ip: '10.0.12.45',
    os: 'Windows 11 Pro 23H2',
    agentVersion: '2.6.1',
    status: 'ONLINE',
  },
  {
    hostname: 'SRV-DC-PRIMARY',
    ip: '10.0.1.10',
    os: 'Windows Server 2022',
    agentVersion: '2.6.1',
    status: 'ONLINE',
  },
  {
    hostname: 'WS-DEV-LNX07',
    ip: '10.0.20.107',
    os: 'Ubuntu 22.04 LTS',
    agentVersion: '2.5.9',
    status: 'ONLINE',
  },
  {
    hostname: 'SRV-WEB-DMZ01',
    ip: '172.16.0.5',
    os: 'CentOS Stream 9',
    agentVersion: '2.6.0',
    status: 'OFFLINE',
  },
];

// Realistic telemetry payloads per endpoint
function buildProcessTelemetry(hostname: string): object[] {
  const processes: Record<string, object[]> = {
    'WS-FINANCE-PC01': [
      { pid: 4, name: 'System', parentPid: 0, path: 'C:\\Windows\\System32\\ntoskrnl.exe', cpu: 0.3, memory: 12.1, commandLine: '' },
      { pid: 812, name: 'svchost.exe', parentPid: 4, path: 'C:\\Windows\\System32\\svchost.exe', cpu: 1.2, memory: 45.6, commandLine: 'svchost.exe -k netsvcs -p' },
      { pid: 3204, name: 'explorer.exe', parentPid: 812, path: 'C:\\Windows\\explorer.exe', cpu: 2.1, memory: 102.4, commandLine: 'C:\\Windows\\explorer.exe' },
      { pid: 5120, name: 'chrome.exe', parentPid: 3204, path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', cpu: 8.4, memory: 312.8, commandLine: 'chrome.exe --type=browser' },
      { pid: 6888, name: 'EXCEL.EXE', parentPid: 3204, path: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE', cpu: 3.7, memory: 178.2, commandLine: 'EXCEL.EXE "Q2_Revenue.xlsx"' },
      { pid: 7412, name: 'MsMpEng.exe', parentPid: 812, path: 'C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\MsMpEng.exe', cpu: 5.1, memory: 210.0, commandLine: 'MsMpEng.exe' },
      { pid: 9010, name: 'Teams.exe', parentPid: 3204, path: 'C:\\Users\\jsmith\\AppData\\Local\\Microsoft\\Teams\\current\\Teams.exe', cpu: 4.2, memory: 256.3, commandLine: 'Teams.exe --type=main' },
    ],
    'SRV-DC-PRIMARY': [
      { pid: 4, name: 'System', parentPid: 0, path: 'C:\\Windows\\System32\\ntoskrnl.exe', cpu: 0.8, memory: 18.4, commandLine: '' },
      { pid: 652, name: 'lsass.exe', parentPid: 4, path: 'C:\\Windows\\System32\\lsass.exe', cpu: 3.5, memory: 92.0, commandLine: 'C:\\Windows\\System32\\lsass.exe' },
      { pid: 1104, name: 'dns.exe', parentPid: 4, path: 'C:\\Windows\\System32\\dns.exe', cpu: 1.0, memory: 64.2, commandLine: 'C:\\Windows\\System32\\dns.exe' },
      { pid: 1340, name: 'ntds.exe', parentPid: 4, path: 'C:\\Windows\\System32\\ntds.exe', cpu: 7.2, memory: 512.5, commandLine: '' },
      { pid: 2200, name: 'svchost.exe', parentPid: 4, path: 'C:\\Windows\\System32\\svchost.exe', cpu: 2.3, memory: 88.6, commandLine: 'svchost.exe -k DcomLaunch -p' },
      { pid: 3870, name: 'ServerManager.exe', parentPid: 2200, path: 'C:\\Windows\\System32\\ServerManager.exe', cpu: 1.8, memory: 142.0, commandLine: '' },
    ],
    'WS-DEV-LNX07': [
      { pid: 1, name: 'systemd', parentPid: 0, path: '/lib/systemd/systemd', cpu: 0.1, memory: 11.2, commandLine: '/lib/systemd/systemd --system' },
      { pid: 845, name: 'sshd', parentPid: 1, path: '/usr/sbin/sshd', cpu: 0.0, memory: 5.4, commandLine: 'sshd: /usr/sbin/sshd -D' },
      { pid: 1120, name: 'node', parentPid: 845, path: '/usr/bin/node', cpu: 12.4, memory: 384.0, commandLine: 'node /app/server.js' },
      { pid: 1342, name: 'dockerd', parentPid: 1, path: '/usr/bin/dockerd', cpu: 3.2, memory: 128.5, commandLine: 'dockerd --host fd://' },
      { pid: 2200, name: 'postgres', parentPid: 1, path: '/usr/lib/postgresql/14/bin/postgres', cpu: 6.5, memory: 256.0, commandLine: 'postgres -D /var/lib/postgresql/14/main' },
      { pid: 3100, name: 'nginx', parentPid: 1, path: '/usr/sbin/nginx', cpu: 0.8, memory: 22.3, commandLine: 'nginx: master process /usr/sbin/nginx' },
    ],
    'SRV-WEB-DMZ01': [
      { pid: 1, name: 'systemd', parentPid: 0, path: '/lib/systemd/systemd', cpu: 0.1, memory: 8.0, commandLine: '/lib/systemd/systemd --system' },
      { pid: 500, name: 'httpd', parentPid: 1, path: '/usr/sbin/httpd', cpu: 4.2, memory: 96.5, commandLine: '/usr/sbin/httpd -DFOREGROUND' },
      { pid: 780, name: 'php-fpm', parentPid: 500, path: '/usr/sbin/php-fpm', cpu: 9.1, memory: 210.0, commandLine: 'php-fpm: master process (/etc/php-fpm.conf)' },
      { pid: 1050, name: 'mariadb', parentPid: 1, path: '/usr/libexec/mariadbd', cpu: 5.0, memory: 320.0, commandLine: '/usr/libexec/mariadbd --basedir=/usr' },
    ],
  };
  return processes[hostname] || [];
}

function buildNetworkTelemetry(hostname: string): object[] {
  const connections: Record<string, object[]> = {
    'WS-FINANCE-PC01': [
      { localAddress: '10.0.12.45', localPort: 49720, remoteAddress: '142.250.185.206', remotePort: 443, state: 'ESTABLISHED', pid: 5120, protocol: 'TCP' },
      { localAddress: '10.0.12.45', localPort: 49812, remoteAddress: '52.113.194.132', remotePort: 443, state: 'ESTABLISHED', pid: 9010, protocol: 'TCP' },
      { localAddress: '10.0.12.45', localPort: 445, remoteAddress: '10.0.1.10', remotePort: 58432, state: 'ESTABLISHED', pid: 4, protocol: 'TCP' },
      { localAddress: '10.0.12.45', localPort: 50012, remoteAddress: '204.79.197.200', remotePort: 443, state: 'TIME_WAIT', pid: 5120, protocol: 'TCP' },
    ],
    'SRV-DC-PRIMARY': [
      { localAddress: '10.0.1.10', localPort: 53, remoteAddress: '0.0.0.0', remotePort: 0, state: 'LISTENING', pid: 1104, protocol: 'UDP' },
      { localAddress: '10.0.1.10', localPort: 389, remoteAddress: '10.0.12.45', remotePort: 50200, state: 'ESTABLISHED', pid: 1340, protocol: 'TCP' },
      { localAddress: '10.0.1.10', localPort: 88, remoteAddress: '10.0.20.107', remotePort: 42310, state: 'ESTABLISHED', pid: 652, protocol: 'TCP' },
      { localAddress: '10.0.1.10', localPort: 636, remoteAddress: '0.0.0.0', remotePort: 0, state: 'LISTENING', pid: 1340, protocol: 'TCP' },
      { localAddress: '10.0.1.10', localPort: 445, remoteAddress: '10.0.12.45', remotePort: 50300, state: 'ESTABLISHED', pid: 4, protocol: 'TCP' },
    ],
    'WS-DEV-LNX07': [
      { localAddress: '10.0.20.107', localPort: 22, remoteAddress: '10.0.12.45', remotePort: 54210, state: 'ESTABLISHED', pid: 845, protocol: 'TCP' },
      { localAddress: '10.0.20.107', localPort: 3000, remoteAddress: '0.0.0.0', remotePort: 0, state: 'LISTENING', pid: 1120, protocol: 'TCP' },
      { localAddress: '10.0.20.107', localPort: 5432, remoteAddress: '10.0.20.107', remotePort: 42000, state: 'ESTABLISHED', pid: 2200, protocol: 'TCP' },
      { localAddress: '10.0.20.107', localPort: 80, remoteAddress: '0.0.0.0', remotePort: 0, state: 'LISTENING', pid: 3100, protocol: 'TCP' },
      { localAddress: '10.0.20.107', localPort: 443, remoteAddress: '0.0.0.0', remotePort: 0, state: 'LISTENING', pid: 3100, protocol: 'TCP' },
    ],
    'SRV-WEB-DMZ01': [
      { localAddress: '172.16.0.5', localPort: 80, remoteAddress: '0.0.0.0', remotePort: 0, state: 'LISTENING', pid: 500, protocol: 'TCP' },
      { localAddress: '172.16.0.5', localPort: 443, remoteAddress: '0.0.0.0', remotePort: 0, state: 'LISTENING', pid: 500, protocol: 'TCP' },
      { localAddress: '172.16.0.5', localPort: 3306, remoteAddress: '127.0.0.1', remotePort: 48200, state: 'ESTABLISHED', pid: 1050, protocol: 'TCP' },
    ],
  };
  return connections[hostname] || [];
}

function buildFileTelemetry(hostname: string): object[] {
  const files: Record<string, object[]> = {
    'WS-FINANCE-PC01': [
      { path: 'C:\\Users\\jsmith\\Documents\\Q2_Revenue.xlsx', size: 245760, modifiedTime: new Date().toISOString(), operation: 'MODIFY' },
      { path: 'C:\\Users\\jsmith\\Downloads\\invoice_0429.pdf', size: 102400, modifiedTime: new Date().toISOString(), operation: 'CREATE' },
      { path: 'C:\\Windows\\Temp\\~DF42A3.tmp', size: 8192, modifiedTime: new Date().toISOString(), operation: 'CREATE' },
    ],
    'SRV-DC-PRIMARY': [
      { path: 'C:\\Windows\\NTDS\\ntds.dit', size: 52428800, modifiedTime: new Date().toISOString(), operation: 'MODIFY' },
      { path: 'C:\\Windows\\System32\\Winevt\\Logs\\Security.evtx', size: 20971520, modifiedTime: new Date().toISOString(), operation: 'MODIFY' },
    ],
    'WS-DEV-LNX07': [
      { path: '/app/server.js', size: 12288, modifiedTime: new Date().toISOString(), operation: 'MODIFY' },
      { path: '/var/log/syslog', size: 1048576, modifiedTime: new Date().toISOString(), operation: 'MODIFY' },
      { path: '/tmp/build-cache-1a2b.tar.gz', size: 5242880, modifiedTime: new Date().toISOString(), operation: 'CREATE' },
    ],
    'SRV-WEB-DMZ01': [
      { path: '/var/log/httpd/access_log', size: 8388608, modifiedTime: new Date().toISOString(), operation: 'MODIFY' },
      { path: '/var/www/html/.htaccess', size: 1024, modifiedTime: new Date().toISOString(), operation: 'MODIFY' },
    ],
  };
  return files[hostname] || [];
}

async function seedEndpoints() {
  console.log('\n🖥️  Seeding EDR endpoints & telemetry...');

  for (const ep of DEMO_ENDPOINTS) {
    // Idempotent upsert by hostname
    const endpoint = await prisma.endpoint.upsert({
      where: { hostname: ep.hostname },
      update: {
        ip: ep.ip,
        os: ep.os,
        agentVersion: ep.agentVersion,
        status: ep.status,
        lastSeen: ep.status === 'ONLINE' ? new Date() : new Date(Date.now() - 30 * 60 * 1000),
      },
      create: {
        hostname: ep.hostname,
        ip: ep.ip,
        os: ep.os,
        agentVersion: ep.agentVersion,
        status: ep.status,
        lastSeen: ep.status === 'ONLINE' ? new Date() : new Date(Date.now() - 30 * 60 * 1000),
      },
    });

    // Only add telemetry if this endpoint has none yet (avoid duplicating on re-seed)
    const existingTelemetry = await prisma.endpointTelemetry.count({
      where: { endpointId: endpoint.id },
    });

    if (existingTelemetry === 0) {
      const processes = buildProcessTelemetry(ep.hostname);
      const network = buildNetworkTelemetry(ep.hostname);
      const files = buildFileTelemetry(ep.hostname);

      const telemetryData = [
        ...processes.map((p) => ({ endpointId: endpoint.id, type: 'PROCESS', data: JSON.stringify(p) })),
        ...network.map((n) => ({ endpointId: endpoint.id, type: 'NETWORK', data: JSON.stringify(n) })),
        ...files.map((f) => ({ endpointId: endpoint.id, type: 'FILE', data: JSON.stringify(f) })),
      ];

      if (telemetryData.length > 0) {
        await prisma.endpointTelemetry.createMany({ data: telemetryData });
      }

      console.log(`  ✅  ${ep.hostname} — ${processes.length} procs, ${network.length} conns, ${files.length} file ops`);
    } else {
      console.log(`  ↺  ${ep.hostname} — telemetry already exists, skipped`);
    }
  }

  console.log(`\n🎉 Seeded ${DEMO_ENDPOINTS.length} EDR endpoints.`);
}

async function main() {
  console.log('🌱 Seeding default playbooks...');

  for (const pb of DEFAULT_PLAYBOOKS) {
    // Idempotent: update if a playbook with this name exists, create if not
    const existing = await prisma.playbook.findFirst({ where: { name: pb.name } });

    if (existing) {
      await prisma.playbook.update({
        where: { id: existing.id },
        data: {
          description: pb.description,
          steps: pb.steps,
          enabled: pb.enabled,
        },
      });
      console.log(`  ↺  Updated: ${pb.name}`);
    } else {
      const created = await prisma.playbook.create({ data: pb });
      console.log(`  ✅  Created: ${created.name} (${created.id})`);
    }
  }

  console.log(`\n🎉 Seeded ${DEFAULT_PLAYBOOKS.length} playbooks successfully.`);

  // Seed EDR demo data
  await seedEndpoints();
}


main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
