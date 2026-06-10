import { ParsedLog, LogFormat, EventType } from '../utils/types';

// ═══════════════════════════════════════════════════════════════════════════════
// Regex patterns
// ═══════════════════════════════════════════════════════════════════════════════

// SSH auth
const SSH_FAILED  = /^(?:(\w+\s+\d+\s+[\d:]+)\s+(\S+)\s+)?sshd\[\d+\]:\s+Failed password for (?:invalid user )?(\S+) from ([\d.]+)/;
const SSH_SUCCESS = /^(?:(\w+\s+\d+\s+[\d:]+)\s+(\S+)\s+)?sshd\[\d+\]:\s+Accepted password for (\S+) from ([\d.]+)/;
const SUDO_PAT    = /^(?:(\w+\s+\d+\s+[\d:]+)\s+(\S+)\s+)?sudo:\s+(\S+)\s+:.*?COMMAND=(.*)/;
const SU_PAT      = /^(?:(\w+\s+\d+\s+[\d:]+)\s+(\S+)\s+)?su\b.*?:\s+(pam_authenticate|Successful su|FAILED su|BAD su)/i;

// Apache / Nginx combined log
// 1.2.3.4 - user [10/Oct/2000:13:55:36 -0700] "GET /path HTTP/1.1" 200 1234 "ref" "ua"
const APACHE_PAT = /^([\d.]+) \S+ (\S+) \[([^\]]+)\] "([A-Z]+) ([^ "]+)[^"]*" (\d{3}) (\d+|-)(?: "([^"]*)" "([^"]*)")?/;

// Firewall
const CEF_PAT      = /^CEF:\d+\|/;
const UFW_PAT      = /\[UFW (BLOCK|ALLOW)\].*?SRC=([\d.]+).*?DST=([\d.]+).*?PROTO=(\w+)(?:.*?DPT=(\d+))?/;
const GENERIC_FW   = /src[=:]([\d.]+).*?dst[=:]([\d.]+).*?(?:dpt|dst_port|dport)[=:](\d+).*?(?:act|action)[=:](ALLOW|DENY|ACCEPT|DROP|BLOCK)/i;
const IPTABLES_PAT = /(?:IN|OUT)=\S*\s+.*?SRC=([\d.]+)\s+DST=([\d.]+).*?(?:DPT=(\d+))/;

// Windows / Sysmon XML sniff
const WIN_XML_PAT  = /<Event\s+xmlns=/i;
const SYSMON_PROV  = /Provider[^>]+Name="Microsoft-Windows-Sysmon"/i;
const WIN_SEC_PROV = /Provider[^>]+Name="Microsoft-Windows-Security-Auditing"/i;

// ═══════════════════════════════════════════════════════════════════════════════
// Helper utilities
// ═══════════════════════════════════════════════════════════════════════════════

function extractTag(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
  return m?.[1]?.trim() || undefined;
}

function extractData(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<Data\\s+Name="${name}"\\s*>([^<]*)<\\/Data>`, 'i'));
  return m?.[1]?.trim() || undefined;
}

function parseSystime(ts: string | undefined): Date {
  if (!ts) return new Date();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date() : d;
}

function parseSyslog(ts: string | undefined): Date {
  if (!ts) return new Date();
  const d = new Date(`${ts} ${new Date().getFullYear()}`);
  return isNaN(d.getTime()) ? new Date() : d;
}

function parseApacheTs(ts: string): Date {
  // 10/Oct/2000:13:55:36 -0700
  const m = ts.match(/(\d+)\/(\w+)\/(\d+):(\d+:\d+:\d+)\s+([+-]\d{4})/);
  if (!m) return new Date();
  const d = new Date(`${m[2]} ${m[1]} ${m[3]} ${m[4]} ${m[5]}`);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Format auto-detection
// ═══════════════════════════════════════════════════════════════════════════════

export function detectFormat(content: string): LogFormat {
  const sample = content
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .slice(0, 15)
    .join('\n');

  // XML-based formats first
  if (WIN_XML_PAT.test(sample)) {
    return SYSMON_PROV.test(sample) ? 'SYSMON' : 'WINDOWS_EVENT';
  }

  // CEF firewall
  if (CEF_PAT.test(sample)) return 'FIREWALL';

  // UFW / iptables / generic firewall syslog
  if (
    UFW_PAT.test(sample) ||
    IPTABLES_PAT.test(sample) ||
    GENERIC_FW.test(sample)
  )
    return 'FIREWALL';

  // Apache / Nginx combined log
  if (APACHE_PAT.test(sample)) return 'APACHE';

  // SSH / Linux auth log
  if (
    SSH_FAILED.test(sample) ||
    SSH_SUCCESS.test(sample) ||
    SUDO_PAT.test(sample) ||
    /sshd\[/.test(sample)
  )
    return 'SSH_AUTH';

  return 'UNKNOWN';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-parsers
// ═══════════════════════════════════════════════════════════════════════════════

// ── SSH / Linux Auth ──────────────────────────────────────────────────────────
function parseSSHAuth(content: string): ParsedLog[] {
  const logs: ParsedLog[] = [];
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t) continue;

    const failed = t.match(SSH_FAILED);
    if (failed) {
      logs.push({ timestamp: parseSyslog(failed[1]), format: 'SSH_AUTH', eventType: 'LOGIN_FAILED', computer: failed[2], user: failed[3], ip: failed[4], rawLog: t });
      continue;
    }
    const success = t.match(SSH_SUCCESS);
    if (success) {
      logs.push({ timestamp: parseSyslog(success[1]), format: 'SSH_AUTH', eventType: 'LOGIN_SUCCESS', computer: success[2], user: success[3], ip: success[4], rawLog: t });
      continue;
    }
    const sudo = t.match(SUDO_PAT);
    if (sudo) {
      logs.push({ timestamp: parseSyslog(sudo[1]), format: 'SSH_AUTH', eventType: 'SUDO_COMMAND', computer: sudo[2], user: sudo[3], sudoCommand: sudo[4].trim(), ip: 'LOCAL', rawLog: t });
      continue;
    }
    const su = t.match(SU_PAT);
    if (su) {
      logs.push({ timestamp: parseSyslog(undefined), format: 'SSH_AUTH', eventType: 'SU_ATTEMPT', computer: su?.[2], ip: 'LOCAL', rawLog: t });
      continue;
    }
    logs.push({ timestamp: new Date(), format: 'SSH_AUTH', eventType: 'UNKNOWN', rawLog: t });
  }
  return logs;
}

// ── Apache / Nginx ────────────────────────────────────────────────────────────
function parseApache(content: string, format: LogFormat): ParsedLog[] {
  const logs: ParsedLog[] = [];
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(APACHE_PAT);
    if (m) {
      logs.push({
        timestamp: parseApacheTs(m[3]),
        format,
        eventType: 'HTTP_REQUEST',
        ip: m[1],
        user: m[2] !== '-' ? m[2] : undefined,
        method: m[4],
        url: m[5],
        statusCode: parseInt(m[6], 10),
        responseSize: m[7] !== '-' ? parseInt(m[7], 10) : undefined,
        userAgent: m[9] || undefined,
        rawLog: t,
      });
    } else {
      logs.push({ timestamp: new Date(), format, eventType: 'UNKNOWN', rawLog: t });
    }
  }
  return logs;
}

// ── Windows Event XML ─────────────────────────────────────────────────────────
const WIN_EVENT_MAP: Record<number, EventType> = {
  4624: 'WIN_LOGON_SUCCESS',
  4625: 'WIN_LOGON_FAILED',
  4648: 'WIN_EXPLICIT_CRED',
  4719: 'WIN_AUDIT_CHANGE',
  4720: 'WIN_ACCOUNT_CREATED',
  4726: 'WIN_ACCOUNT_DELETED',
};

function parseWindowsXML(content: string): ParsedLog[] {
  const logs: ParsedLog[] = [];
  // Split into individual <Event> blocks
  const blocks = content.split(/<\/Event>/i).filter((b) => b.includes('<Event'));

  for (const block of blocks) {
    const eventIdStr = extractTag(block, 'EventID');
    const eventId = eventIdStr ? parseInt(eventIdStr, 10) : undefined;
    const ts = parseSystime(
      block.match(/SystemTime="([^"]+)"/i)?.[1]
    );
    const computer = extractTag(block, 'Computer');

    // Relevant EventIDs only — skip the rest but still record them
    const eventType: EventType = eventId ? (WIN_EVENT_MAP[eventId] ?? 'WIN_OTHER') : 'WIN_OTHER';

    const ip =
      extractData(block, 'IpAddress') ||
      extractData(block, 'SourceAddress') ||
      undefined;
    const user =
      extractData(block, 'TargetUserName') ||
      extractData(block, 'SubjectUserName') ||
      undefined;
    const logonTypeStr = extractData(block, 'LogonType');

    logs.push({
      timestamp: ts,
      format: 'WINDOWS_EVENT',
      eventType,
      eventId,
      computer,
      ip: ip && ip !== '-' ? ip : 'LOCAL',
      user: user && user !== '-' ? user : undefined,
      logonType: logonTypeStr ? parseInt(logonTypeStr, 10) : undefined,
      rawLog: block.slice(0, 400).trim(),
    });
  }
  return logs;
}

// ── Sysmon XML ────────────────────────────────────────────────────────────────
const SYSMON_EVENT_MAP: Record<number, EventType> = {
  1: 'SYSMON_PROCESS_CREATE',
  3: 'SYSMON_NETWORK_CONNECT',
  11: 'SYSMON_FILE_CREATE',
};

function parseSysmonXML(content: string): ParsedLog[] {
  const logs: ParsedLog[] = [];
  const blocks = content.split(/<\/Event>/i).filter((b) => b.includes('<Event'));

  for (const block of blocks) {
    const eventIdStr = extractTag(block, 'EventID');
    const eventId = eventIdStr ? parseInt(eventIdStr, 10) : undefined;
    const ts = parseSystime(
      extractData(block, 'UtcTime') ||
      block.match(/SystemTime="([^"]+)"/i)?.[1]
    );
    const computer = extractTag(block, 'Computer');
    const eventType: EventType = eventId ? (SYSMON_EVENT_MAP[eventId] ?? 'SYSMON_OTHER') : 'SYSMON_OTHER';

    logs.push({
      timestamp: ts,
      format: 'SYSMON',
      eventType,
      eventId,
      computer,
      ip: computer ?? 'LOCAL',
      processGuid: extractData(block, 'ProcessGuid'),
      image: extractData(block, 'Image'),
      commandLine: extractData(block, 'CommandLine'),
      parentImage: extractData(block, 'ParentImage'),
      destinationIp: extractData(block, 'DestinationIp'),
      destinationPort: (() => {
        const v = extractData(block, 'DestinationPort');
        return v ? parseInt(v, 10) : undefined;
      })(),
      user: extractData(block, 'User'),
      targetFilename: extractData(block, 'TargetFilename'),
      rawLog: block.slice(0, 400).trim(),
    });
  }
  return logs;
}

// ── Firewall ──────────────────────────────────────────────────────────────────
function parseCEF(line: string): ParsedLog | null {
  // CEF:0|Vendor|Product|Version|EventID|Name|Severity|key=value ...
  const ext = line.replace(/^CEF:[^|]*(?:\|[^|]*){6}\|/, '');
  const kv: Record<string, string> = {};
  ext.replace(/(\w+)=([^ ]+)/g, (_, k, v) => { kv[k] = v; return ''; });

  const action = kv['act'] || kv['deviceAction'] || 'UNKNOWN';
  const eventType: EventType = /deny|block|drop/i.test(action) ? 'FW_DENY' : 'FW_ALLOW';

  return {
    timestamp: kv['rt'] ? new Date(parseInt(kv['rt'], 10)) : new Date(),
    format: 'FIREWALL',
    eventType,
    srcIp: kv['src'] || kv['sourceAddress'],
    dstIp: kv['dst'] || kv['destinationAddress'],
    dstPort: kv['dpt'] ? parseInt(kv['dpt'], 10) : undefined,
    protocol: kv['proto'] || kv['transportProtocol'],
    action,
    ip: kv['src'] || kv['sourceAddress'] || 'UNKNOWN',
    rawLog: line,
  };
}

function parseFirewall(content: string): ParsedLog[] {
  const logs: ParsedLog[] = [];
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t) continue;

    if (CEF_PAT.test(t)) {
      const p = parseCEF(t);
      if (p) { logs.push(p); continue; }
    }

    const ufw = t.match(UFW_PAT);
    if (ufw) {
      const action = ufw[1];
      logs.push({
        timestamp: new Date(),
        format: 'FIREWALL',
        eventType: action === 'BLOCK' ? 'FW_DENY' : 'FW_ALLOW',
        srcIp: ufw[2],
        dstIp: ufw[3],
        protocol: ufw[4],
        dstPort: ufw[5] ? parseInt(ufw[5], 10) : undefined,
        action,
        ip: ufw[2],
        rawLog: t,
      });
      continue;
    }

    const gfw = t.match(GENERIC_FW);
    if (gfw) {
      const action = gfw[4].toUpperCase();
      logs.push({
        timestamp: new Date(),
        format: 'FIREWALL',
        eventType: /deny|block|drop/i.test(action) ? 'FW_DENY' : 'FW_ALLOW',
        srcIp: gfw[1],
        dstIp: gfw[2],
        dstPort: parseInt(gfw[3], 10),
        action,
        ip: gfw[1],
        rawLog: t,
      });
      continue;
    }

    const ipt = t.match(IPTABLES_PAT);
    if (ipt) {
      const isDrop = /DROP|REJECT/i.test(t);
      logs.push({
        timestamp: new Date(),
        format: 'FIREWALL',
        eventType: isDrop ? 'FW_DENY' : 'FW_ALLOW',
        srcIp: ipt[1],
        dstIp: ipt[2],
        dstPort: ipt[3] ? parseInt(ipt[3], 10) : undefined,
        action: isDrop ? 'DENY' : 'ALLOW',
        ip: ipt[1],
        rawLog: t,
      });
      continue;
    }

    logs.push({ timestamp: new Date(), format: 'FIREWALL', eventType: 'UNKNOWN', rawLog: t });
  }
  return logs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

export function parseLogFile(content: string, format: LogFormat): ParsedLog[] {
  switch (format) {
    case 'SSH_AUTH':      return parseSSHAuth(content);
    case 'APACHE':
    case 'NGINX':         return parseApache(content, format);
    case 'WINDOWS_EVENT': return parseWindowsXML(content);
    case 'SYSMON':        return parseSysmonXML(content);
    case 'FIREWALL':      return parseFirewall(content);
    default:              return parseSSHAuth(content); // best-effort fallback
  }
}

export { parseSSHAuth, parseApache, parseWindowsXML, parseSysmonXML, parseFirewall };
