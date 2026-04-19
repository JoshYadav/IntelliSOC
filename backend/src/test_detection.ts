import fs from 'fs';
import { parseLogFile } from './services/parserService';
import { runDetection } from './services/detectionService';
import { runCorrelation } from './services/correlationService';

const fileContent = fs.readFileSync('../sample_log.txt', 'utf8');
const parsedLogs = parseLogFile(fileContent);
console.log(`Parsed ${parsedLogs.length} logs`);

const alerts = runDetection(parsedLogs);
console.log(`Detection alerts: ${alerts.length}`);
console.log(JSON.stringify(alerts, null, 2));

const correlationAlerts = runCorrelation(parsedLogs);
console.log(`Correlation alerts: ${correlationAlerts.length}`);
console.log(JSON.stringify(correlationAlerts, null, 2));
