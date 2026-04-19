# 🚀 IntelliSOC – AI-Powered Cyber Threat Detection System (Mini SIEM)

IntelliSOC is a full-stack **Security Information and Event Management (SIEM)** system that analyzes system logs, detects cyber threats, correlates events, and presents actionable insights through an interactive dashboard.

This project simulates real-world SOC workflows used in modern cybersecurity environments.

---

## ⚠️ Problem

Modern systems generate massive volumes of logs, but analyzing them manually is:

* ⏳ Time-consuming
* ❌ Error-prone
* 🚫 Inefficient for real-time threat detection

Security teams require automated systems to efficiently detect and respond to threats.

---

## 💡 Solution

IntelliSOC solves this by:

* 🔍 Automatically detecting cyber attacks
* 🔗 Correlating multiple events to uncover real threats
* 🧠 Providing explainable, analyst-friendly insights

It acts as a **lightweight SIEM system** for practical cybersecurity analysis.

---

## 🎬 Demo Flow

1. Upload a `.log` file
2. Logs are parsed into structured data
3. Threats are detected (e.g., brute force, suspicious activity)
4. Events are correlated to identify complex attacks
5. Risk scores and MITRE mapping are applied
6. Results are visualized on a dashboard
7. Export results as CSV

---

## 🚀 Key Differentiators

* 🔍 **Explainable Alerts** – Clear reasoning behind each detection
* ⏱️ **Time-Based Behavioral Analysis** – Detects anomalies over time
* 📊 **Session-Based Isolation** – Clean, independent log analysis
* ⚡ **Lightweight & Fast** – Deployable mini-SIEM system

---

## 🚀 Features

### 🔹 File Ingestion

* Upload `.log` files directly

### 🔹 Parsing Engine

* Converts raw logs → structured JSON

### 🔹 Threat Detection Engine

* Brute Force Attack detection
* Suspicious multi-user IP detection

### 🔹 Correlation Engine

* Detects account compromise patterns

### 🔹 Enrichment Layer

* Risk scoring (0–100)
* MITRE ATT&CK mapping
* Human-readable explanations

### 🔹 Session Management

* Isolates each upload for clean analysis

### 🔹 Export Reports

* Download results as CSV

---

## 🏗️ Architecture

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

---

## 🛠️ Tech Stack

### 🔹 Frontend

* React 19 + TypeScript + Vite
* Tailwind CSS
* Recharts
* Lucide React

### 🔹 Backend

* Node.js + Express + TypeScript
* Multer (file upload)
* Prisma ORM

### 🔹 Database

* PostgreSQL

---

## 🚀 Getting Started

### 📦 Prerequisites

* Node.js (v18+)
* PostgreSQL

---

### 1️⃣ Database Setup

```bash
cd backend
echo "DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/intellisoc" > .env
```

---

### 2️⃣ Backend Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 🌍 Real-World Impact

IntelliSOC helps security teams:

* ⚡ Detect attacks faster
* 🧠 Understand threat patterns
* 🛡️ Take immediate action

This project demonstrates how modern SIEM tools operate in real-world cybersecurity environments.

---

## 🚀 Future Enhancements

* Real-time log streaming (WebSockets)
* AI/ML-based anomaly detection
* Integration with threat intelligence APIs
* Role-based authentication

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and open a pull request

---

## 👨‍💻 Made with ❤️ by

* **Josh Yadav** – Cybersecurity & Detection Logic
* **Vansh Tiwari** – Cybersecurity & Threat Analysis
* **Keshav** – Full Stack Development

---

## 📝 License

This project is licensed under the MIT License.
