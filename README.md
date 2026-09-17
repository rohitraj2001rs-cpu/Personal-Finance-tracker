# FinanceFlow — Personal Finance Tracker

FinanceFlow is an original full-stack personal finance tracker built for portfolio/academic use.

## Architecture

Web Dashboard → REST API → MongoDB Atlas
Android SMS Parser → REST API → MongoDB Atlas

## Features

- JWT authentication
- Add, edit and delete income/expense transactions
- Category-based transactions
- Dashboard with balance, income, expense and category breakdown
- Search/filter transactions
- Android SMS transaction parser with user confirmation
- Responsive vanilla HTML/CSS/JavaScript frontend
- Node.js + Express backend
- MongoDB persistence
- Docker Compose support
- Jenkins CI configuration
- No secrets committed to Git

## Project structure

```text
FinanceFlow/
├── frontend/
├── backend/
├── android/
├── docker-compose.yml
├── Jenkinsfile
├── .gitignore
└── README.md
```

## Run locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Set `MONGODB_URI` in `.env`. MongoDB Atlas can be used as the cloud database; the official MongoDB Node.js driver supports Atlas and self-hosted deployments. 

API: `http://localhost:5000`

### 2. Frontend

Open `frontend/index.html` with a local static server:

```bash
cd frontend
python -m http.server 5500
```

Open `http://localhost:5500`.

If your API runs on another URL, edit `frontend/app.js` and change `API_BASE`.

### 3. Docker

```bash
docker compose up --build
```

## Android

Open the `android` directory in Android Studio, let Gradle sync, and run the app on an Android device/emulator. The app requests SMS permission, parses common bank/SMS patterns locally, previews a transaction, and sends it to the API after confirmation.

## Security

Never commit `.env`, database passwords, JWT secrets, or API keys. Use `.env.example` as a template.
