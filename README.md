# IntelliSOC – Log-Based Cyber Attack Detection System (Mini SIEM)

IntelliSOC is a full-stack Security Information and Event Management (SIEM) application designed to ingest system logs, detect cyber threats, correlate events, and display actionable insights through an intuitive, modern dashboard. 

## 🚀 Features

- **File Ingestion:** Upload `.log` files directly via the dashboard for rapid analysis.
- **Parsing Engine:** Converts raw log files into structured JSON utilizing optimized regex patterns.
- **Threat Detection Engine:**
  - Identifies **Brute Force Attacks** (e.g., numerous failed logins from a single IP within a short time window).
  - Detects **Suspicious Activity** (e.g., multiple unique users logging in from the same IP indicating account sharing or distributed attacks).
- **Correlation Engine:** Correlates sequences like multiple failed logins followed by a success to detect potential **Account Compromise**.
- **Time-Based Logic & Aggregation:** Maintains strict time windows to prioritize recent events and aggregates duplicate alerts by (IP + type) with a frequency count instead of database clutter.
- **Enrichment & Context:** Evaluates risk scores out of 100, maps threats to MITRE ATT&CK tactics, and provides clear, human-readable explanations of the attack patterns.
- **Session-Based Management:** Groups logs and alerts by upload session to ensure forensic boundaries are cleanly maintained.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 w/ TypeScript & Vite
- **Styling:** Tailwind CSS v4
- **Charts:** Recharts
- **Icons:** Lucide React
- **HTTP Client:** Axios

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js + TypeScript
- **File Uploads:** Multer
- **Database ORM:** Prisma
- **Database:** SQLite (file-based, zero-config for local dev)

---

## 🏗️ Architecture & Internal Workflow

```mermaid
graph TD;
    A[User Uploads .log] -->|Frontend API Call| B(Backend API)
    B --> C{Parsing Engine}
    C -->|Structured JSON| D[Detection Engine]
    D --> E[Correlation Engine]
    E --> F[Enrichment Layer]
    F -->|Risk Scoring & MITRE| G[(SQLite DB via Prisma)]
    G -->|Alerts & Analytics API| H[Frontend Dashboard]
```

1. **Upload & Parse:** A user uploads a `.log` file on the frontend. The backend accepts it via Multer, reads it line-by-line, and converts the raw text into structured JSON.
2. **Detect:** The Detection Engine tracks IP behavior, specifically looking at failed logins within a rolling time window and unique user constraints.
3. **Correlate & Enrich:** Events are correlated (e.g. failure followed by success). They are automatically mapped to a severity, risk score (0-100), and specific MITRE tactic.
4. **Store:** All raw logs, parsed data, and resulting alerts are tied to a unique `session_id` and securely saved in a **SQLite** database via Prisma ORM.
5. **Display:** The frontend queries the aggregated alerts and overall analytics for the session, populating the interactive summary cards and the main Alerts Table.

---

## 🚀 Getting Started & Deployment Guide

Follow these instructions to run the application locally or deploy it to a server.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- No external database needed — the project uses **SQLite** (bundled, file-based via Prisma).

> ⚠️ **Security Notice:** Never commit your `.env` file or the `prisma/dev.db` file to version control. Both are excluded by `.gitignore`. If you accidentally committed either, rotate any exposed API keys immediately.

### 1. Environment Setup

```bash
cd backend
# Copy the example and fill in your own values
copy .env.example .env
# Set ALLOWED_ORIGINS to your frontend URL
# Optionally add your ABUSEIPDB_API_KEY
```

### 2. Backend Setup

From the root of the project:
```bash
cd backend
npm install

# Generate Prisma Client & create the SQLite database file
npx prisma generate
npx prisma migrate dev --name init

# Start the development server
npm run dev
# The backend will run on http://localhost:5000
```

To run in production:
```bash
npm run build
npm start
# The backend will output to the /dist folder and use server.js
```

### 3. Frontend Setup

From the root of the project:
```bash
cd frontend
npm install

# Start the development server
npm run dev
# The frontend will typically run on http://localhost:5173
```

To build for production:
```bash
npm run build
# The compiled assets will be placed in the `/dist` folder. 
# Serve this folder using an HTTP server like Nginx, Apache, or serve (npm).
```

---

## 📂 Key Project Structure

- `backend/src/`
  - `server.ts` - Main Express entry point and routing logic
  - `prisma/` - Database schema definitions
- `frontend/src/`
  - `components/` - Reusable React components (Dashboard, AlertsTable, etc.)
  - `App.tsx` - Main Application logic
  - `index.css` - Tailwind directives and global styles

## 🤝 Contributing

Contributions are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.
