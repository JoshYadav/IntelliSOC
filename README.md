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
- **Database:** PostgreSQL

---

## 🏗️ Architecture & Internal Workflow

```mermaid
graph TD;
    A[User Uploads .log] -->|Frontend API Call| B(Backend API)
    B --> C{Parsing Engine}
    C -->|Structured JSON| D[Detection Engine]
    D --> E[Correlation Engine]
    E --> F[Enrichment Layer]
    F -->|Risk Scoring & MITRE| G[(PostgreSQL DB)]
    G -->|Alerts & Analytics API| H[Frontend Dashboard]
```

1. **Upload & Parse:** A user uploads a `.log` file on the frontend. The backend accepts it via Multer, reads it line-by-line, and converts the raw text into structured JSON.
2. **Detect:** The Detection Engine tracks IP behavior, specifically looking at failed logins within a rolling time window and unique user constraints.
3. **Correlate & Enrich:** Events are correlated (e.g. failure followed by success). They are automatically mapped to a severity, risk score (0-100), and specific MITRE tactic.
4. **Store:** All raw logs, parsed data, and resulting alerts are tied to a unique `session_id` and securely saved in the PostgreSQL database via Prisma ORM.
5. **Display:** The frontend queries the aggregated alerts and overall analytics for the session, populating the interactive summary cards and the main Alerts Table.

---

## 🚀 Getting Started & Deployment Guide

Follow these instructions to run the application locally or deploy it to a server.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [PostgreSQL](https://www.postgresql.org/) installed and running locally or externally.

### 1. Database Setup

1. Create a PostgreSQL database (e.g., `intellisoc`).
2. Navigate to the `backend` folder and configure the `.env` file for Prisma:
   ```bash
   cd backend
   # Create a .env file based on standard Prisma definitions
   echo "DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/intellisoc?schema=public" > .env
   # Make sure to replace USER, PASSWORD, localhost, and intellisoc with your correct credentials
   ```

### 2. Backend Setup

From the root of the project:
```bash
cd backend
npm install

# Generate Prisma Client & Migrate Database to create tables
npx prisma generate
npx prisma migrate dev --name init

# Start the development server
npm run dev
# The backend will typically run on http://localhost:5000 (check your configuration)
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
