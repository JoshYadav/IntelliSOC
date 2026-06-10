# IntelliSOC — Enterprise-Grade SIEM, SOAR, & EDR Simulation Platform
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Language: TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Database: SQLite & Prisma](https://img.shields.io/badge/Database-SQLite%20%26%20Prisma-lightblue.svg)](https://www.prisma.io/)
[![Framework: React 19](https://img.shields.io/badge/Frontend-React%2019-darkviolet.svg)](https://react.dev/)

IntelliSOC is a comprehensive, multi-pillar security operations platform designed to simulate modern enterprise Security Operations Center (SOC) workflows. It integrates **SIEM** (threat ingestion and analysis), **SOAR** (automated playbook response with human-in-the-loop validation), and **EDR** (host telemetry inspection and remote control) into a unified console.

This project demonstrates practical skills in **Security Engineering, Threat Detection, Automated Incident Response, and EDR Tool Design** using industry-standard tactics.

---

## 🛡️ Core Security Pillars

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
│   │ • Attack Heatmap   │   │ • Gemini AI Summary│   │ • Telemetry  │   │
│   │ • Geo-IP Map       │   │ • Slack Webhooks   │   │ • Agent API  │   │
│   └────────────────────┘   └────────────────────┘   └──────────────┘   │
│              │                        │                    │           │
│              ▼                        ▼                    ▼           │
│    ┌──────────────────────────────────────────────────────────────┐    │
│    │                      SQLite via Prisma ORM                   │    │
│    └──────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. SIEM (Security Information & Event Management)
*   **Log Normalization Engine:** Regular-expression parsers that convert raw, unstructured logs into unified JSON formats. Supports SSH auth logs (`auth.log`), Apache/Nginx web access logs, Windows Security Event Logs (XML), Linux Firewall traffic logs, and Sysmon logs.
*   **Threat Intelligence Enrichment:** Automatically queries external intelligence sources (AbuseIPDB API) to extract IP reputation scores, geographical coordinates (Lat/Lng), ISPs, and country mappings.
*   **SOC Visualizations:**
    *   **Geo-IP Threat Map:** Displays attacking IPs on a global vector map, utilizing quadratic bezier curve connections to visualize active traffic flow to the local network.
    *   **Threat Activity Heatmap:** Identifies peak adversary scanning times by plotting security alerts on a Day-of-Week vs. Hour-of-Day contribution matrix.
    *   **Risk Breakdown Ring:** Groups and visualizes alerts by severity classification (Critical, High, Medium, Low) and risk scores.

### 2. SOAR (Security Orchestration, Automation, & Response)
*   **Incident Management:** Alerts are aggregated by source IP and automatically triaged into centralized **Incidents** with unique IDs, ownership states, and detailed audit trails.
*   **Playbook Engine:** Evaluates incoming alerts and triggers sequential automated playbooks:
    *   *AI Summary generation* (using Google Gemini model `gemini-1.5-flash` to act as a Tier-1 virtual analyst).
    *   *Slack/Webhook notifications* detailing threat parameters.
    *   *Priority escalation rules* based on correlation thresholds.
*   **Human-in-the-Loop Validation:** Destructive action proposals (e.g., executing an `iptables` IP block or quarantining a server) are staged in a pending state, requiring explicit analyst verification and click approval.

### 3. EDR (Endpoint Detection & Response)
*   **Telemetry Agent:** A lightweight TypeScript EDR agent that runs on monitored endpoints, continuously gathering process hierarchies, active network socket connections, and file modifications.
*   **Process Tree Reconstruction:** Reconstructs and visualizes parent-child process chains (`explorer.exe` -> `cmd.exe` -> `powershell.exe`) with command-line arguments to pinpoint execution anomalies.
*   **Remote Isolation (Quarantine):** Allows analysts to remotely sever a compromised endpoint's network connection from the dashboard. Once isolated, the agent uses OS commands to block non-essential traffic, keeping open only the socket back to the IntelliSOC API.

---

## 🎯 MITRE ATT&CK Matrix Alignment
The detection rules engine maps ingested logs to the **MITRE ATT&CK Framework** to provide context for analysts:

| Alert Rule ID | MITRE Tactic | MITRE Technique | Description |
|---|---|---|---|
| `BRUTE_FORCE` | Credential Access | [T1110](https://attack.mitre.org/techniques/T1110/) - Brute Force | Multiple failed logins from a single source IP within a rolling time window. |
| `ACCOUNT_COMPROMISE` | Initial Access | [T1078](https://attack.mitre.org/techniques/T1078/) - Valid Accounts | Multiple failed logins followed by a successful login from the same external IP. |
| `LOLBIN_ABUSE` | Defense Evasion | [T1218](https://attack.mitre.org/techniques/T1218/) - System Binary Proxy Execution | Execution of built-in binaries (e.g., `certutil.exe`) to download malicious payloads. |
| `SUSPICIOUS_CMD` | Execution | [T1059](https://attack.mitre.org/techniques/T1059/) - Command and Scripting Interpreter | Invocation of shell interpreters with stealth flags (e.g., hidden Windows PowerShell). |
| `PERSISTENCE_RUN` | Persistence | [T1547.001](https://attack.mitre.org/techniques/T1547/001/) - Registry Run Keys / Startup Folder | Creation of registry keys under the Windows `Run` key to achieve persistence. |
| `PERSISTENCE_TASK` | Persistence | [T1053.005](https://attack.mitre.org/techniques/T1053/005/) - Scheduled Task | Usage of `schtasks` or `cron` to create automated triggers. |
| `CREDENTIAL_DUMP` | Credential Access | [T1003](https://attack.mitre.org/techniques/T1003/) - Credential Dumping | Accessing `lsass.exe` using dumping utilities (e.g., `procdump.exe`). |
| `PORT_SCAN` | Reconnaissance | [T1595](https://attack.mitre.org/techniques/T1595/) - Active Scanning | Source IP hitting multiple distinct destination ports within a short window. |

---

## 🧪 Scenario Simulation: Threat Hunting Lab
The repository contains a pre-built Sysmon log simulation file: [sysmon_sample.xml](file:///c:/Users/joshy/Downloads/IntelliSOC/share/sysmon_sample.xml). It mimics a full adversary intrusion lifecycle:

```
[Initial Command Line (cmd.exe)]
   │
   ▼
[Download Payload (certutil.exe)] ────▶ [C2 Connection (198.51.100.42:80)]
   │
   ▼
[Execute Malware (payload.exe)]
   │
   ├─▶ [Dump Credentials (procdump.exe -ma lsass.exe)]
   ├─▶ [Establish Persistence (reg.exe / Run Key)]
   ├─▶ [Establish Persistence (schtasks.exe / Scheduled Task)]
   └─▶ [Obfuscate Scripts (PowerShell Base64)]
```

### Steps to Simulate:
1. Navigate to the dashboard at `http://localhost:5173`.
2. Drag and drop [sysmon_sample.xml](file:///c:/Users/joshy/Downloads/IntelliSOC/share/sysmon_sample.xml) into the upload zone.
3. Review the parsed log stream. The backend pipeline automatically extracts the structured XML data, fires the signatures, and maps them.
4. **Analyst Inspection:**
    *   Open the **AI Security Assessment** card to read the executive summary synthesized by Gemini.
    *   Navigate to the **Incidents** tab. A high-priority incident will be created for the workstation, with a proposed playbook step to **Isolate Endpoint**.
    *   Click **Approve & Execute** to simulate active host isolation.

---

## 🛠️ Tech Stack & Engineering Decisions

*   **Backend Node.js & Express.js:** Fast, asynchronous framework. Employs rate-limiting on ingestion routes to prevent denial of service and enforces CORS configuration.
*   **Prisma ORM & SQLite:** A relational, lightweight schema design suitable for development environments, supporting cascading deletes for session cleanups.
*   **Frontend React 19 (Vite) & Tailwind CSS:** Built with a clean glassmorphic dark theme. Heavy utilize of SVG path mappings and canvas charts (Recharts) to visualize large datasets smoothly.

---

## 🚀 Getting Started & Local Installation

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18+ recommended)
*   External database is not required (SQLite is bundled and file-based).

### 1. Environment Setup
Create a `.env` file inside the `backend/` directory based on [backend/.env.example](file:///c:/Users/joshy/Downloads/IntelliSOC/share/backend/.env.example):
```env
DATABASE_URL="file:./dev.db"
PORT=5000
ALLOWED_ORIGINS="http://localhost:5173"

# Enrichment Keys (Optional but highly recommended)
ABUSEIPDB_API_KEY="your_abuseipdb_api_key_here"
GEMINI_API_KEY="your_gemini_api_key_here"

# Notifications (Optional)
SLACK_WEBHOOK_URL="your_slack_webhook_url_here"
```

### 2. Backend Installation & Seeding
From the project root:
```bash
cd backend
npm install

# Run database migrations and seed default SOAR playbooks + EDR hosts
npx prisma migrate dev --name init
npm run db:seed

# Start backend in development mode
npm run dev
# Server runs on http://localhost:5000
```

### 3. Frontend Installation
From the project root:
```bash
cd frontend
npm install

# Start Vite server
npm run dev
# Dashboard opens on http://localhost:5173
```

### 4. Running the EDR Telemetry Agent (Optional)
To run the local telemetry collector:
```bash
cd agent
npm install

# Start telemetry cycle (reports to backend every 60s)
npm run start
```

## 👥 Contributors & Roles

This project was built by a collaborative team of three:

*   **Josh Yadav** (Lead Security Architect & Project Lead) — Designed the core cybersecurity logic, telemetry specifications, and incident response tasks.
*   **Vansh Tiwari** (Cybersecurity Analyst & Detection Engineer) — Co-engineered the threat detection rules, log signatures, and MITRE ATT&CK framework mapping.
*   **Keshav** (Full-Stack Security Developer) — Engineered the entire web application including the React frontend console, Express.js backend, and SQLite database.

---


## 📝 License
This project is licensed under the MIT License.
