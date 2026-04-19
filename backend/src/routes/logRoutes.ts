import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../utils/prisma';
import { processLogFile, getSessionAnalytics } from '../services/pipelineService';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.log' || ext === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Only .log and .txt files are allowed'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

/**
 * POST /api/logs/upload
 * Upload a log file, create session, and run the full processing pipeline.
 */
router.post('/logs/upload', upload.single('logfile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a .log or .txt file.' });
    }

    // Read file content
    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Run processing pipeline
    const result = await processLogFile(req.file.originalname, fileContent);

    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (unlinkErr) {
      console.warn(`Could not delete temp file ${filePath}:`, unlinkErr);
    }

    return res.status(200).json({
      message: 'Log file processed successfully',
      sessionId: result.sessionId,
      logsProcessed: result.logsProcessed,
      alertsGenerated: result.alertsGenerated,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process log file' });
  }
});

/**
 * GET /api/sessions
 * List all sessions.
 */
router.get('/sessions', async (_req: Request, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { logs: true, alerts: true },
        },
      },
    });
    return res.json(sessions);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/session/:id/alerts
 * Fetch alerts for a session with optional filters.
 */
router.get('/session/:id/alerts', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const severity = req.query.severity as string | undefined;
    const type = req.query.type as string | undefined;

    const where: any = { sessionId: id };
    if (severity) where.severity = severity;
    if (type) where.type = type;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { riskScore: 'desc' },
    });

    return res.json(alerts);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/session/:id/analytics
 * Return analytics/stats for dashboard charts.
 */
router.get('/session/:id/analytics', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const analytics = await getSessionAnalytics(id);
    return res.json(analytics);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/session/:id/report
 * Download a CSV report of alerts for the session.
 */
router.get('/session/:id/report', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const [session, alerts, logs, analytics] = await Promise.all([
      prisma.session.findUnique({ where: { id } }),
      prisma.alert.findMany({ where: { sessionId: id }, orderBy: { riskScore: 'desc' } }),
      prisma.log.count({ where: { sessionId: id } }),
      getSessionAnalytics(id),
    ]);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const csvHeaders = ['Timestamp', 'Type', 'Severity', 'Risk Score', 'IP', 'User', 'Count', 'MITRE Tactic', 'Explanation', 'Reputation'];
    
    const escapeCsv = (str: any) => {
      if (str == null) return '';
      const s = String(str);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvRows = alerts.map((a: any) => [
      a.timestamp ? a.timestamp.toISOString() : '',
      a.type,
      a.severity,
      a.riskScore,
      a.ip,
      a.user,
      a.count,
      a.mitreTactic,
      a.explanation,
      a.reputation
    ].map(escapeCsv).join(','));

    const csvString = [csvHeaders.join(','), ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
    return res.send(csvString);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export { router as logRoutes };
