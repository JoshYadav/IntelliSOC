import { ParsedLog } from '../utils/types';

// Regex patterns for common SSH auth log formats (syslog header is optional)
const FAILED_PATTERN = /^(?:(\w+\s+\d+\s+[\d:]+)\s+\S+\s+sshd\[\d+\]:\s+)?Failed password for (\S+) from ([\d.]+)/;
const SUCCESS_PATTERN = /^(?:(\w+\s+\d+\s+[\d:]+)\s+\S+\s+sshd\[\d+\]:\s+)?Accepted password for (\S+) from ([\d.]+)/;

/**
 * Parse a single raw log line into a structured ParsedLog object.
 */
function parseLogLine(line: string): ParsedLog | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Try failed login pattern
  const failedMatch = trimmed.match(FAILED_PATTERN);
  if (failedMatch) {
    return {
      timestamp: failedMatch[1] ? parseTimestamp(failedMatch[1]) : new Date(),
      eventType: 'LOGIN_FAILED',
      user: failedMatch[2],
      ip: failedMatch[3],
      rawLog: trimmed,
    };
  }

  // Try successful login pattern
  const successMatch = trimmed.match(SUCCESS_PATTERN);
  if (successMatch) {
    return {
      timestamp: successMatch[1] ? parseTimestamp(successMatch[1]) : new Date(),
      eventType: 'LOGIN_SUCCESS',
      user: successMatch[2],
      ip: successMatch[3],
      rawLog: trimmed,
    };
  }

  // Unknown log format
  return {
    timestamp: new Date(),
    eventType: 'UNKNOWN',
    user: '',
    ip: '',
    rawLog: trimmed,
  };
}

/**
 * Parse syslog timestamp (e.g., "Mar 20 10:15:01") into a Date object.
 * Uses the current year since syslog doesn't include year.
 */
function parseTimestamp(timestampStr: string): Date {
  const currentYear = new Date().getFullYear();
  const parsed = new Date(`${timestampStr} ${currentYear}`);
  if (isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

/**
 * Parse an entire log file content into structured ParsedLog objects.
 */
export function parseLogFile(fileContent: string): ParsedLog[] {
  const lines = fileContent.split('\n');
  const parsedLogs: ParsedLog[] = [];

  for (const line of lines) {
    const parsed = parseLogLine(line);
    if (parsed) {
      parsedLogs.push(parsed);
    }
  }

  return parsedLogs;
}

export { parseLogLine, parseTimestamp };
