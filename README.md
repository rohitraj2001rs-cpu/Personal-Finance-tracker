# ₹ FinanceFlow — Personal Finance Tracker

> **Full-stack upgrade** of the original static IILM project.
> SMS → Android Parser → Node.js API → MongoDB Atlas → Live Dashboard

---
-
## 📁 Project Structure

```
financeflow/
├── frontend/
│   ├── index.html          ← Landing page (unchanged)
│   ├── app.html            ← Dashboard (now API-driven)
│   ├── styles.css          ← Styles (unchanged)
│   ├── script.js           ← Landing page JS
│   ├── nginx.conf          ← Nginx config with /api proxy
│   └── Dockerfile
│
├── backend/
│   ├── server.js           ← Express entry point
│   ├── config/
│   │   └── db.js           ← MongoDB connection
│   ├── models/
│   │   └── Transaction.js  ← Mongoose schema
│   ├── controllers/
│   │   ├── transactionController.js
│   │   └── analyticsController.js
│   ├── routes/
│   │   ├── transactions.js
│   │   └── analytics.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── validators.js
│   ├── .env                ← Your real credentials (never commit)
│   ├── .env.example        ← Safe template
│   ├── package.json
│   └── Dockerfile
│
├── android/
│   ├── MainActivity.kt     ← SMS listener + HTTP sender
│   ├── AndroidManifest.xml ← Permissions
│   └── build.gradle        ← Dependencies
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## ⚙️ Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Docker | ≥ 24 |
| Docker Compose | ≥ 2.20 |
| Android Studio | Hedgehog+ (for SMS app) |

---

## 🚀 Quick Start — Docker (Recommended)

### 1. Clone / extract the project

```bash
cd financeflow
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set your MongoDB Atlas URI:

```env
PORT=5000
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@cluster0.XXXXX.mongodb.net/financeflow?retryWrites=true&w=majority
JWT_SECRET=change_me_to_a_long_random_string
NODE_ENV=production
```

> **Using local MongoDB instead of Atlas?**
> Set `MONGODB_URI=mongodb://mongo:27017/financeflow` — the `mongo` service in docker-compose handles it.

### 3. Build and start all services

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:5000 |
| Health check | http://localhost:5000/health |

### 4. Stop everything

```bash
docker-compose down          # keep data
docker-compose down -v       # wipe volumes too
```

---

## 🛠 Manual / Local Development (No Docker)

### Backend

```bash
cd backend
npm install
cp .env.example .env        # fill in your MONGODB_URI
npm run dev                 # nodemon hot-reload
```

API runs at: `http://localhost:5000`

### Frontend

Open `frontend/app.html` directly in a browser **or** serve it with any static server:

```bash
cd frontend
npx serve .                 # http://localhost:3000
```

The dashboard auto-detects `localhost` and points to `http://localhost:5000/api`.

---

## 📡 REST API Reference

### Base URL
```
http://localhost:5000/api
```

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/transactions` | List all transactions |
| `GET` | `/transactions?platform=UPI` | Filter by platform |
| `GET` | `/transactions?from=2026-01-01&to=2026-04-30` | Filter by date range |
| `GET` | `/transactions?category=Food&limit=50&page=1` | Paginated |
| `GET` | `/transactions/:id` | Get single transaction |
| `POST` | `/transactions` | Create transaction |
| `PUT` | `/transactions/:id` | Update transaction |
| `DELETE` | `/transactions/:id` | Delete transaction |
| `POST` | `/transactions/bulk` | Bulk insert (SMS parser) |

**POST /api/transactions — Request body:**

```json
{
  "amount": 500,
  "category": "Food",
  "platform": "UPI",
  "source": "SMS",
  "merchant": "Zomato",
  "note": "Dinner",
  "date": "2026-04-20"
}
```

**Valid `platform` values:** `UPI`, `GPay`, `PhonePe`, `Paytm`, `Card`, `Bank`, `Cash`

**Valid `category` values:** `Food`, `Travel`, `Shopping`, `Education`, `Health`, `Other`

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analytics` | Full analytics summary |
| `GET` | `/analytics?from=2026-04-01&to=2026-04-30` | Filtered analytics |

**Response:**

```json
{
  "success": true,
  "data": {
    "totalSpent": 14870,
    "totalTransactions": 42,
    "todaySpent": 1240,
    "monthSpent": 6500,
    "categoryBreakdown": { "Food": 5200, "Travel": 1800 },
    "platformBreakdown": { "UPI": 8000, "Card": 4000 },
    "peakDay": { "date": "2026-04-15", "amount": 2300 },
    "topCategory": { "name": "Food", "amount": 5200 },
    "topPlatform": { "name": "UPI", "count": 28 }
  }
}
```

---

## 📱 Android SMS Parser Setup

### Step 1 — Update server IP

Open `android/MainActivity.kt` and change the `SERVER_URL` constant:

```kotlin
private const val SERVER_URL = "http://YOUR_LAPTOP_IP:5000/api/transactions"
```

Find your IP with:
- **Windows:** `ipconfig` → look for IPv4 Address
- **macOS/Linux:** `ifconfig` or `ip addr`

> Both your laptop and Android phone must be on the **same Wi-Fi network**.

### Step 2 — Add to your Android project

1. Open Android Studio → New Project → Empty Activity
2. Replace the generated `MainActivity.kt` with `android/MainActivity.kt`
3. Replace `AndroidManifest.xml` with `android/AndroidManifest.xml`
4. Merge `android/build.gradle` dependencies into your app-level `build.gradle`

### Step 3 — Build and run

```
Run → Run 'app'  (on a real device, not emulator)
```

> SMS permissions work best on real hardware. The app will ask for permission on first launch.

### How it works

```
SMS arrives on phone
      ↓
SmsBroadcastReceiver fires
      ↓
SmsParser checks for "debited" / "deducted" keywords
      ↓
Extracts: amount (Rs/INR), platform (UPI/Card/Cash), merchant ("to Amazon")
      ↓
HTTP POST → your backend → MongoDB → appears on dashboard
```

**Example SMS handled:**
```
Rs 500 debited from your account via UPI to Amazon. Ref: 123456
Rs. 1200 debited via Card at Zomato. Avail bal: Rs 8000
INR 340 debited from SBI A/c UPI to Swiggy
```

---

## 🐳 Docker Services Detail

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `frontend` | nginx:1.27-alpine | 80 | Serves HTML + proxies `/api` to backend |
| `backend` | node:20-alpine | 5000 | Express REST API |
| `mongo` | mongo:7.0 | 27017 | Local MongoDB (optional if using Atlas) |

The nginx proxy means your frontend calls `/api/transactions` in production — no hardcoded IPs needed.

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port (default 5000) |
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string |
| `JWT_SECRET` | No | JWT secret (for future auth) |
| `JWT_EXPIRES_IN` | No | JWT TTL (default 7d) |
| `NODE_ENV` | No | `development` or `production` |

---

## 🧪 Test the API (curl examples)

```bash
# Health check
curl http://localhost:5000/health

# Add a transaction
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"amount":340,"category":"Food","platform":"GPay","date":"2026-04-20","note":"Zomato"}'

# Get all transactions
curl http://localhost:5000/api/transactions

# Filter by platform
curl "http://localhost:5000/api/transactions?platform=UPI"

# Filter by date range
curl "http://localhost:5000/api/transactions?from=2026-04-01&to=2026-04-30"

# Analytics
curl http://localhost:5000/api/analytics

# Delete
curl -X DELETE http://localhost:5000/api/transactions/TRANSACTION_ID
```

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| `docker-compose up` fails — port 80 in use | Stop Apache/other web servers, or change `"80:80"` to `"8080:80"` |
| Backend can't connect to MongoDB | Check `MONGODB_URI` in `backend/.env`. Whitelist your IP in MongoDB Atlas Network Access |
| Android app can't reach backend | Ensure same Wi-Fi network, correct IP in `SERVER_URL`, backend is running |
| Dashboard shows "API Offline" | Backend not running, or CORS blocked. Check browser console |
| `usesCleartextTraffic` warning | Expected for local HTTP dev. In production use HTTPS and remove the flag |

---

## 👤 Author

**Pawan Dubey** — IILM Student  
Project: FinanceFlow – Personal Finance Tracker

---

## 📄 License

MIT — free to use and modify.
