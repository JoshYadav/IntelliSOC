# IntelliSOC – Log-Based Cyber Attack Detection System (Mini SIEM)

## 1. Objective
Build a full-stack system that ingests system logs, detects cyber threats, correlates events, and displays actionable insights via a dashboard.

---

## 2. High-Level Architecture

User → Frontend (React) → Backend API (Node.js) → Processing Engine → PostgreSQL DB → Frontend Dashboard

---

## 3. Tech Stack

### Frontend
- React + TypeScript
- Tailwind CSS
- Chart.js / Recharts

### Backend
- Node.js + Express + TypeScript
- Multer (file upload)

### Database
- PostgreSQL
- Prisma ORM

---

## 4. Core Modules

### 4.1 File Ingestion
- Accept .log file via API
- Read file line-by-line

### 4.2 Parsing Engine
- Convert raw log → structured JSON
- Use regex patterns

### 4.3 Detection Engine
- Track failed logins per IP
- Detect brute force attacks
- Detect multiple users from same IP

### 4.4 Correlation Engine
- Detect sequence: failed → success
- Identify account compromise

### 4.5 Time-Based Logic
- Maintain time window (e.g., 2 minutes)
- Only consider recent events

### 4.6 Duplicate Aggregation
- Group alerts by (IP + type)
- Maintain count field

### 4.7 Enrichment Layer
- Add risk score
- Map MITRE tactics
- Add explanation
- Add IP reputation

### 4.8 Session Management
- Each upload = session
- All alerts/logs linked to session_id

---

## 5. Database Schema

### sessions
- id (UUID)
- file_name
- created_at

### logs
- id
- session_id
- raw_log
- parsed_json
- timestamp

### alerts
- id
- session_id
- type
- ip
- user
- severity
- risk_score
- mitre_tactic
- explanation
- reputation
- count
- timestamp

---

## 6. Algorithms & Logic

### Parsing
IF log matches failed pattern → LOGIN_FAILED
IF log matches success pattern → LOGIN_SUCCESS

### Detection
IF failed_logins[ip] > 5 within time window → Brute Force
IF unique_users[ip] > 3 → Suspicious Activity

### Correlation
IF failed > 5 AND success occurs → Account Compromise

### Risk Scoring
Brute Force → 50
Multiple Users → 40
Compromise → 90

### Aggregation
Group alerts by key = ip + type
Increment count instead of duplicates

---

## 7. API Design

POST /api/logs/upload
- Upload log file
- Create session
- Process logs

GET /api/session/:id/alerts
- Fetch alerts

GET /api/session/:id/analytics
- Return stats for charts

GET /api/session/:id/report
- Download report

---

## 8. Frontend Features

### Dashboard
- Upload log file
- Summary cards
- Alerts table

### Alerts Table
- Attack type
- IP
- Severity
- Risk score
- MITRE
- Explanation

### Analytics
- Attack distribution chart
- IP activity chart

### Filters
- Severity
- Attack type

---

## 9. Execution Plan (24 Hours)

### Phase 1
- Setup backend + frontend

### Phase 2
- File upload + parsing

### Phase 3
- Detection + correlation

### Phase 4
- Database integration

### Phase 5
- UI dashboard

### Phase 6
- Analytics + polish

---

## 10. Key Differentiators

- Explainable alerts
- Time-based detection
- Session-based analysis
- Clean UI dashboard

---

## 11. Final Flow

Upload → Parse → Detect → Correlate → Enrich → Store → Display
