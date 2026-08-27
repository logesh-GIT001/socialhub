# SocialHub Enterprise

SocialHub Enterprise is an enterprise-grade, secure, multi-tenant social media management platform allowing centralized social account authorization (via official OAuth 2.0 flows) and role-based access controls (RBAC) for team collaboration.

Employees can compose, edit, schedule, approve, and publish content without having direct passwords or OTPs for the company's social channels.

---

## Key Security Architectures

1. **Passwordless Social Access**: Employees never see or input credentials for social networks. They authenticate through their internal company email.
2. **Encrypted Token Store**: Access and refresh tokens for Meta, LinkedIn, X, Discord, Reddit, and YouTube are encrypted using AES-256-GCM symmetric keys prior to storage.
3. **Granular RBAC**: API endpoints are strictly protected by FastAPI dependencies evaluating role permission mappings (e.g. `posts:approve`, `users:manage`).
4. **Action Trails**: Every transaction (logins, connects, draft modifications, review approvals, scheduling actions) writes an immutable record to the Audit Log.
5. **Session Isolation**: Authentication relies on signed JSON Web Tokens (JWT) rotating access credentials automatically through cookie-less refresh cycles.

---

## Default Access Credentials

Upon startup, the database seeding script creates a default CEO account with full system capabilities:

- **Login Email**: `ceo@socialhub.corp`
- **Password**: `AdminPassword123!`
- **Simulated MFA Verification Code**: `123456` (or `000000`)

---

## Setup & Running Guide

### Quick Start Script (Recommended)

You can run the entire application using the provided interactive startup script:

```bash
./start.sh
```

This script will check your environment, install dependencies (like python venv, pip requirements, and node_modules), and let you choose between running via **Docker Compose** or running **Standalone Locally** (SQLite mode).

Alternatively, you can skip the prompt by passing arguments:
- Run in Docker: `./start.sh --docker` (or `-d`)
- Run locally: `./start.sh --local` (or `-l`)

---

### Option 1: Docker Compose (All Services, Production Ready)

Ensure you have Docker and Docker Compose installed:

```bash
# Build and run the entire stack (PostgreSQL, Redis, API Backend, Celery, Next.js Frontend)
docker-compose up --build
```

- **Frontend Interface**: [http://localhost:3000](http://localhost:3000)
- **API Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option 2: Standalone Local Run (No Docker required, SQLite mode)

For rapid development or lightweight local testing, you can execute services directly on your host machine:

#### 1. Start backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start local webserver (SQLite database 'socialhub.db' and storage folders will initialize automatically)
uvicorn app.main:app --reload --port 8000
```

#### 2. Start frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Backend Test Suites

We include a comprehensive unit and integration test suite wrapping the authentication layer, JWT signatures, database encryption keys, post review states, and background publisher loops.

```bash
cd backend
python -m pytest tests/ -v
```
