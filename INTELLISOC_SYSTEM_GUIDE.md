# IntelliSOC Platform Capabilities & System Guide
### Production-Grade Three-Pillar Security Console (SIEM + SOAR + EDR)

IntelliSOC is a comprehensive, multi-pillar security operations platform designed to simulate modern enterprise Security Operations Center (SOC) flows. It combines threat ingestion (SIEM), automated playbook response with human-in-the-loop validation (SOAR), and host-level endpoint telemetry inspection and control (EDR).

---

## Table of Contents
1. [Platform Architecture & Data Flow](#1-platform-architecture--data-flow)
2. [Pillar 1: SIEM (Security Information & Event Management)](#2-pillar-1-siem)
3. [Pillar 2: SOAR (Security Orchestration, Automation & Response)](#3-pillar-2-soar)
4. [Pillar 3: EDR (Endpoint Detection & Response)](#4-pillar-3-edr)
5. [Database Schema Reference](#5-database-schema-reference)
6. [API Endpoints Catalog](#6-api-endpoints-catalog)
7. [System Execution & Operations Guide](#7-system-execution--operations-guide)

---

## 1. Platform Architecture & Data Flow

IntelliSOC is built using a decoupled service-oriented architecture:
- **Frontend**: A React SPA styled using glassmorphism and modern CSS custom properties, utilizing Lucide icons and Recharts.
- **Backend**: An Express.js Node.js server powered by Prisma ORM and SQLite.
- **Enrichment Services**: External connections to AbuseIPDB for IP reputation and Generative AI models for AI narrative generation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                             IntelliSOC Console                         │
│                                                                        │
│   ┌────────────────────┐   ┌────────────────────┐   ┌──────────────┐   │
│   │    1. SIEM Layer   │   │    2. SOAR Layer   │   │ 3. EDR Layer │   │
│   ├────────────────────┤   ├────────────────────┤   ├──────────────┤   │
│   │ • Log Parser       │   │ • Incident Queue   │   │ • Host Inven.│   │
│   │ • Rules Engine     │──▶│ • Playbook Engine  │◀──│ • Proc Tree  │   │
│   │ • AbuseIPDB Enrich │   │ • Human-in-Loop    │   │ • Host Isol. │   │
│   │ • Attack Heatmap   │   │ • AI SecOps Summary│   │ • Telemetry  │   │
│   │ • Geo-IP Map       │   │ • Slack Webhooks   │   │ • Agent API  │   │
│   └────────────────────┘   └────────────────────┘   └──────────────┘   │
│              │                        │                    │           │
│              ▼                        ▼                    ▼           │
│    ┌──────────────────────────────────────────────────────────────┐    │
│    │                      SQLite via Prisma ORM                   │    │
│    └──────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Pipeline Execution Flow:
1. **Ingestion**: Raw log files are uploaded via HTTP multipart form.
2. **Format Identification**: The system parses the structure to identify the format (SSH, Apache, Nginx, Windows Event, Sysmon, Firewall).
3. **Log Parsing**: Regular expression groups map raw string values into structured JSON objects (Method, IP, User, Status Code, EventID, etc.).
4. **Threat Detection**: The detection engine applies rule-based signature checks.
5. **Correlation**: Events from different formats are cross-referenced (e.g., checking if the same IP scanned ports on a firewall and attempted brute force on SSH).
6. **Reputation Enrichment**: Any external IP is queried against AbuseIPDB to retrieve reputation scores, country codes, and ISPs.
7. **Aggregation**: Duplicate alerts are merged, updating counts and time windows.
8. **Incident Creation**: Alerts are automatically grouped by Source IP into **Incidents** (the SOAR command unit).
9. **Automation Launch**: Playbooks corresponding to alert triggers (e.g., `BRUTE_FORCE`) execute steps automatically, queueing destructive steps (e.g., `BLOCK_IP`) in the authorization panel.

---

## 2. Pillar 1: SIEM

The SIEM pillar is responsible for the collection, normalization, analysis, and visualization of security logs.

### A. Supported Log Formats & Signatures
*   **SSH Auth Logs (`/var/log/auth.log`)**:
    *   Detects `Failed password` login attempts.
    *   Detects `Accepted password` events to confirm compromise.
    *   Tracks target usernames and remote IPs.
*   **Apache / Nginx Web Access Logs**:
    *   Detects directory brute force scans (high frequency of `404` status codes).
    *   Detects exploitation attempts (Web vulnerability scanners, SQL Injection, Cross-Site Scripting patterns in query strings).
    *   Detects resource exhaustion / Denial of Service anomalies.
*   **Windows Security Events (EVTX XML exports)**:
    *   Tracks Logon Type codes (e.g., `Logon Type 3` network logons).
    *   Detects account lockout events (`Event ID 4740`) and brute force thresholds (`Event ID 4625`).
*   **Sysmon Logs (System Monitor)**:
    *   Monitors process creations (`Event ID 1`) and network connections (`Event ID 3`).
    *   Flags suspicious command parameters (PowerShell base64 payloads, execution of dual-use binaries like `certutil` or `whoami`).
*   **Firewall Traffic Logs**:
    *   Parses action indicators (`ALLOW`, `DROP`, `REJECT`).
    *   Detects multi-port scanning behavior (IP hitting multiple destination ports within a short window).

### B. Analytical Visualizations
*   **Geo-IP Threat Map**: Displays a stylized global vector map highlighting counties where threats originate. Includes animated quadratic bezier connection arcs indicating packet traffic flowing toward the SOC server, combined with pulsing radar nodes.
*   **Threat Activity Heatmap**: A Day-of-Week vs. Hour-of-Day contribution matrix displaying high-intensity scan windows to map adversary active shifts.
*   **Risk Distribution Chart**: Recharts visualization breaks alerts into Critical (Risk 80-100), High (50-79), Medium (30-49), and Low (0-29) rings.
*   **Severity Timeline & Distribution Bar Graphs**: Tracks incoming volume and categorizes top threat vectors.
*   **Session Database**: Complete list of uploaded sessions displaying the parsed file name, detected format, total processed logs, triggered alert counts, and timestamp. Supports full CSV report exporting.

---

## 3. Pillar 2: SOAR

The SOAR pillar drives response automation, structures investigation workflow, and enforces human-in-the-loop authorization gates.

### A. Incident Command Center
*   **Queue Management**: Every group of correlated alerts maps to an **Incident**. Analysts can manage these with:
    *   Status filters (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `FALSE_POSITIVE`).
    *   Priority assignments (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
    *   Owner assignees.
*   **Analyst Note Log**: A collaborative timeline ledger enabling analysts to append investigation notes, threat intel reports, and remediation comments.
*   **Detailed Audit Trail**: A complete vertical log tracking all timeline events (status adjustments, playbook triggers, analyst remarks, and gate approvals) with timestamps and creator tags.

### B. Playbook Automation Engine
Playbooks are defined as sequential steps triggered by specific alert rules:
*   **AI_SUMMARY**: Triggers the backend AI engine to synthesize incident logs and generate a narrative.
*   **CREATE_INCIDENT**: Automatically creates an incident tracking entry.
*   **NOTIFY_SLACK**: Interpolates alert context (IP, User, Abuse Score, Tactic) and fires a Slack message via webhook.
*   **ESCALATE_PRIORITY**: Raises the priority of the incident automatically to CRITICAL.
*   **ADD_NOTE**: appends a pre-configured analysis warning to the incident audit trail.
*   **BLOCK_IP (Human Gate)**: Generates a proposed firewall block command (`iptables`). Halts execution until the analyst clicks "Approve & Execute" in the console.
*   **ISOLATE_ENDPOINT (Human Gate)**: Recommends network isolation of a compromised endpoint. Requires explicit click approval to sever host connectivity.

### C. AI Security Assistant
Utilizes Generative AI models to summarize security incidents:
*   **Executive Summary**: Generates a 3-sentence, plain-English summary outlining the timeline, targets, and attack path.
*   **Attacker Objective**: Identifies the primary goal (e.g., Initial Access, Privilege Escalation, Exfiltration) based on MITRE mappings.
*   **Response Checklist**: Prescribes 3 concrete remediation instructions for the analyst.

---

## 4. Pillar 3: EDR

The EDR pillar represents the endpoint security monitoring console, showing deep host telemetry.

### A. Endpoint Directory
*   Lists all registered host systems.
*   Displays operating systems, agent build versions, internal IPs, and last-seen check-ins.
*   Tracks real-time status:
    *   `ONLINE`: Fully operational and checking in.
    *   `OFFLINE`: Check-in timer expired.
    *   `ISOLATED`: Host connectivity severed.

### B. Telemetry Analysis
*   **Process Tree**: Displays process hierarchy nodes (`Parent Process` -> `Child Process`) with process IDs, CPU/Memory metrics, executable file paths, and command-line parameters.
*   **Network Connection Table**: Audits socket bindings showing local/remote IPs, active ports, state (e.g., `ESTABLISHED`), and binding PIDs.
*   **File Monitor Logs**: Audits file operations (`CREATE`, `MODIFY`, `DELETE`, `RENAME`) tracking paths and sizes.

### C. Host Quarantine Control
*   Provides a remote trigger to isolate a host.
*   When isolated, the host EDR agent blocks all non-essential network traffic, allowing only telemetry connection back to the IntelliSOC server.
*   Supports full host restoration ("Unisolate") to return the machine to regular service.

---

## 5. Database Schema Reference

The system uses a highly relational SQLite schema defined as follows:

```prisma
// SIEM
model Session {
  id         String    @id @default(uuid())
  fileName   String
  logFormat  String    @default("UNKNOWN")
  createdAt  DateTime  @default(now())
  incidentId String?   // optional link to auto-created incident
  logs       Log[]
  alerts     Alert[]
}

model Log {
  id         Int       @id @default(autoincrement())
  sessionId  String
  rawLog     String
  parsedJson String?
  timestamp  DateTime?
  session    Session   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

model Alert {
  id             Int             @id @default(autoincrement())
  sessionId      String
  type           String          // BRUTE_FORCE | LOLBIN_ABUSE | ...
  ip             String
  user           String?
  severity       String          // LOW | MEDIUM | HIGH | CRITICAL
  riskScore      Int
  mitreTactic    String?
  explanation    String?
  reputation     String?         // UNKNOWN | SUSPICIOUS | MALICIOUS
  count          Int             @default(1)
  timestamp      DateTime
  status         String          @default("NEW") // NEW | ESCALATED | RESOLVED
  abuseScore     Int?            // AbuseIPDB score
  country        String?         // Country code (e.g. "US")
  isp            String?         // ISP name
  session        Session         @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  incidentAlerts IncidentAlert[]
}

// SOAR
model Incident {
  id           String          @id @default(uuid())
  title        String
  description  String?
  status       String          @default("OPEN")
  priority     String          @default("MEDIUM")
  assignee     String?
  aiSummary    String?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  alerts       IncidentAlert[]
  timeline     IncidentEvent[]
  playbookRuns PlaybookRun[]
}

model IncidentAlert {
  incidentId String
  alertId    Int
  incident   Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  alert      Alert    @relation(fields: [alertId], references: [id], onDelete: Cascade)
  @@id([incidentId, alertId])
}

model IncidentEvent {
  id         Int      @id @default(autoincrement())
  incidentId String
  type       String   // NOTE | STATUS_CHANGE | PLAYBOOK_RUN | ACTION_APPROVED
  content    String
  author     String   @default("system")
  createdAt  DateTime @default(now())
  incident   Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
}

model Playbook {
  id          String       @id @default(uuid())
  name        String
  description String?
  trigger     String       // e.g. "BRUTE_FORCE"
  steps       String       // JSON array of PlaybookStep objects
  enabled     Boolean      @default(true)
  createdAt   DateTime     @default(now())
  runs        PlaybookRun[]
}

model PlaybookRun {
  id          String    @id @default(uuid())
  playbookId  String
  incidentId  String?
  status      String    @default("RUNNING") // SUCCESS | FAILED
  stepResults String?   // JSON result array
  startedAt   DateTime  @default(now())
  finishedAt  DateTime?
  playbook    Playbook  @relation(fields: [playbookId], references: [id], onDelete: Cascade)
  incident    Incident? @relation(fields: [incidentId], references: [id])
}

// EDR
model Endpoint {
  id           String              @id @default(uuid())
  hostname     String              @unique
  ip           String?
  os           String?
  agentVersion String?
  status       String              @default("ONLINE") // ONLINE | OFFLINE | ISOLATED
  lastSeen     DateTime            @default(now())
  createdAt    DateTime            @default(now())
  telemetry    EndpointTelemetry[]
}

model EndpointTelemetry {
  id         Int      @id @default(autoincrement())
  endpointId String
  type       String   // PROCESS | NETWORK | FILE | HEARTBEAT
  data       String   // JSON stringified telemetry entry
  timestamp  DateTime @default(now())
  endpoint   Endpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)
}
```

---

## 6. API Endpoints Catalog

| Endpoint | Method | Input Parameters | Description |
|---|---|---|---|
| `/api/logs/upload` | **POST** | `logfile` (form-data) | Ingests a raw log file, runs parser, signatures, AbuseIPDB, groupings, and triggers playbooks. |
| `/api/sessions` | **GET** | *None* | Returns the list of all uploaded log sessions. |
| `/api/session/:id/alerts` | **GET** | `severity`, `type` (Query) | Fetches filtered alerts linked to a specific session. |
| `/api/session/:id/analytics` | **GET** | *None* | Generates summary aggregates and chart distributions for a session. |
| `/api/session/:id/report` | **GET** | *None* | Downloads the session alert data as a structured CSV report. |
| `/api/incidents` | **GET** | `status`, `priority` (Query) | Fetches the incident command list. |
| `/api/incidents/:id` | **GET** | *None* | Retrieves complete details for an incident, including timeline audit logs and playbook runs. |
| `/api/incidents/:id` | **PATCH** | `status`, `priority`, `assignee` | Updates metadata fields and appends status history. |
| `/api/incidents/:id/notes` | **POST** | `content` | Appends a note created by the analyst. |
| `/api/incidents/:id/ai-summary` | **GET** | `force` (Query) | Fetches the AI summary. Generates it using the AI engine if it is missing or if `force=true`. |
| `/api/incidents/:id/playbooks/:pid/run` | **POST** | *None* | Triggers a playbook run manually against an incident. |
| `/api/incidents/:id/actions/:runId/approve`| **POST** | `stepIndex` | Approves a human-gated step, executing the associated action. |
| `/api/playbooks` | **GET** | *None* | Fetches playbook templates. |
| `/api/endpoints` | **GET** | *None* | Fetches EDR endpoint hosts. |
| `/api/endpoints/:id/processes` | **GET** | `limit` (Query) | Fetches process tree telemetry for a host. |
| `/api/endpoints/:id/network` | **GET** | `limit` (Query) | Fetches active network socket telemetry for a host. |
| `/api/endpoints/:id/files` | **GET** | `limit` (Query) | Fetches file operation logging for a host. |
| `/api/endpoints/:id/isolate` | **POST** | *None* | Restricts network traffic for an endpoint (Sets to ISOLATED). |
| `/api/endpoints/:id/unisolate` | **POST** | *None* | Restores network access for an isolated endpoint. |

---

## 7. System Execution & Operations Guide

### A. Environment Configuration
Create a `.env` file in the `backend` directory matching the following configuration:
```env
DATABASE_URL="file:./dev.db"
PORT=5000
ALLOWED_ORIGINS="http://localhost:5173"

# Enrichment Keys (Optional but highly recommended)
ABUSEIPDB_API_KEY="your_abuseipdb_api_key_here"
AI_API_KEY="your_ai_api_key_here"

# Notifications (Optional)
SLACK_WEBHOOK_URL="your_slack_webhook_url_here"
```

### B. Getting Started Commands
Run these commands to install dependencies, run migrations, and spin up development environments.

1. **Install Dependencies**:
   ```bash
   # In backend
   npm install
   # In frontend
   npm install
   ```

2. **Initialize Database & Seed Playbooks**:
   ```bash
   # In backend
   npx prisma migrate dev --name init
   npm run db:seed
   ```

3. **Start Development Servers**:
   ```bash
   # Start Backend (Listening on http://localhost:5000)
   cd backend
   npm run dev

   # Start Frontend (Listening on http://localhost:5173)
   cd frontend
   npm run dev
   ```

### C. Simulating a Security Incident
1. Navigate to http://localhost:5173 in your browser.
2. Select the **Dashboard** page.
3. In the upload zone, drag and drop `mock_sample.log` (or `sample_log.txt`) located in the root of the project.
4. Watch the pipeline parse, correlate, and enrich the logs.
5. Once processed:
   - Read the **AI Security Assessment** card detailing the attack.
   - Go to the **Attack Vector Map** tab to see connection lines and country indicators showing the source locations.
   - Click the **Kill-Chain Flow** tab to look at the chronological threat timeline.
6. Open the **Incidents** tab in the sidebar to review ownership and approve gated tasks.
