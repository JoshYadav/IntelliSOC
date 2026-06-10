import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../utils/prisma';
import { processLogFile, getSessionAnalytics } from '../services/pipelineService';

const router = Router();

// ── UUID v4 validation helper ─────────────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

/** Middleware: validates :id param is a proper UUID before hitting the DB. */
function validateSessionId(req: Request, res: Response, next: NextFunction) {
  const id = String(req.params.id ?? '');
  if (!id || !isValidUUID(id)) {
    return res.status(400).json({ error: 'Invalid session ID format.' });
  }
  return next();
}

// ── Multer configuration ──────────────────────────────────────────────────────
const ALLOWED_EXTENSIONS = new Set(['.log', '.txt', '.xml', '.csv', '.evtx']);

// Minimal magic-byte / content check for text-based formats
const TEXT_FORMATS = new Set(['.log', '.txt', '.csv']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Strip path traversal characters from the original filename
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`File type not allowed. Permitted: ${[...ALLOWED_EXTENSIONS].join(', ')}`));
    }
    return cb(null, true);
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB hard cap
    files: 1,                    // only one file per request
  },
});

/** Safely delete a temp file, suppressing errors. */
function safeUnlink(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`[Upload] Could not delete temp file ${filePath}:`, err);
  }
}

// ── POST /api/logs/upload ─────────────────────────────────────────────────────
/**
 * Upload a log file, create a session, and run the full processing pipeline.
 */
router.post('/logs/upload', upload.single('logfile'), async (req: Request, res: Response) => {
  const filePath = req.file?.path;
  try {
    if (!req.file || !filePath) {
      return res.status(400).json({
        error: 'No file uploaded. Please attach a .log, .txt, .xml, .csv, or .evtx file.',
      });
    }

    // ── Content validation ────────────────────────────────────────────────────
    const ext = path.extname(req.file.originalname).toLowerCase();

    // Reject zero-byte files
    if (req.file.size === 0) {
      safeUnlink(filePath);
      return res.status(400).json({ error: 'Uploaded file is empty.' });
    }

    // For text-based formats, verify the content is valid UTF-8 text
    if (TEXT_FORMATS.has(ext)) {
      const sample = Buffer.alloc(512);
      const fd = fs.openSync(filePath, 'r');
      const bytesRead = fs.readSync(fd, sample, 0, 512, 0);
      fs.closeSync(fd);

      // Heuristic: if more than 10% of the first 512 bytes are null bytes, it's binary
      const nullBytes = sample.slice(0, bytesRead).filter((b) => b === 0).length;
      if (nullBytes / bytesRead > 0.1) {
        safeUnlink(filePath);
        return res.status(400).json({ error: 'File appears to be binary, not a text log file.' });
      }
    }

    // ── Read & process ────────────────────────────────────────────────────────
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const result = await processLogFile(req.file.originalname, fileContent);

    return res.status(200).json({
      message: 'Log file processed successfully',
      sessionId: result.sessionId,
      logFormat: result.logFormat,
      logsProcessed: result.logsProcessed,
      alertsGenerated: result.alertsGenerated,
      incidentId: result.incidentId,
    });
  } catch (err: any) {
    // Handle multer-specific errors with user-friendly messages
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum allowed size is 50 MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field. Use the field name "logfile".' });
    }
    console.error('[Upload] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process log file.' });
  } finally {
    // Always clean up the temp file, even on errors
    if (filePath) safeUnlink(filePath);
  }
});

// ── GET /api/sessions ─────────────────────────────────────────────────────────
/**
 * List all sessions, newest first.
 */
router.get('/sessions', async (_req: Request, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { logs: true, alerts: true } },
      },
    });
    return res.json(sessions);
  } catch (err: any) {
    console.error('[Sessions] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/session/:id/alerts ───────────────────────────────────────────────
/**
 * Fetch alerts for a session with optional severity/type filters.
 */
router.get('/session/:id/alerts', validateSessionId, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const severity = req.query.severity ? String(req.query.severity) : undefined;
    const type = req.query.type ? String(req.query.type) : undefined;

    // Only pass validated, known-good values to Prisma (no raw query injection)
    const where: Record<string, unknown> = { sessionId: id };
    const VALID_SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
    if (severity && VALID_SEVERITIES.has(severity.toUpperCase())) {
      where.severity = severity.toUpperCase();
    }
    if (type && /^[A-Z_]+$/.test(type)) {
      where.type = type;
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { riskScore: 'desc' },
    });

    return res.json(alerts);
  } catch (err: any) {
    console.error('[Alerts] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/session/:id/analytics ───────────────────────────────────────────
/**
 * Return aggregated analytics for dashboard charts.
 */
router.get('/session/:id/analytics', validateSessionId, async (req: Request, res: Response) => {
  try {
    const analytics = await getSessionAnalytics(String(req.params.id));
    return res.json(analytics);
  } catch (err: any) {
    console.error('[Analytics] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/session/:id/report ───────────────────────────────────────────────
/**
 * Download a CSV report of all alerts for the session.
 */
router.get('/session/:id/report', validateSessionId, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const [session, alerts] = await Promise.all([
      prisma.session.findUnique({ where: { id } }),
      prisma.alert.findMany({ where: { sessionId: id }, orderBy: { riskScore: 'desc' } }),
    ]);

    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const csvHeaders = [
      'Timestamp', 'Type', 'Severity', 'Risk Score', 'IP', 'User',
      'Count', 'MITRE Tactic', 'Explanation', 'Reputation',
      'Abuse Score', 'Country', 'ISP', 'Latitude', 'Longitude',
    ];

    const escapeCsv = (val: unknown): string => {
      if (val == null) return '';
      const s = String(val);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const csvRows = alerts.map((a: any) =>
      [
        a.timestamp ? a.timestamp.toISOString() : '',
        a.type, a.severity, a.riskScore, a.ip, a.user,
        a.count, a.mitreTactic, a.explanation, a.reputation,
        a.abuseScore ?? '', a.country ?? '', a.isp ?? '',
        a.latitude ?? '', a.longitude ?? '',
      ]
        .map(escapeCsv)
        .join(',')
    );

    const csvString = [csvHeaders.join(','), ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="intellisoc-report-${id}.csv"`);
    return res.send(csvString);
  } catch (err: any) {
    console.error('[Report] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export { router as logRoutes };
