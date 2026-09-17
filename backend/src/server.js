import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { connectDatabase, db } from "./db.js";
import { requireAuth, signToken } from "./auth.js";
import { transactionInput } from "./validation.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "FinanceFlow API" }));

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (name.length < 2) return res.status(400).json({ message: "Name is required" });
    if (!email.includes("@")) return res.status(400).json({ message: "Valid email is required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const users = db().collection("users");
    const exists = await users.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email is already registered" });

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await users.insertOne({
      name, email, passwordHash, createdAt: new Date()
    });

    const user = { _id: result.insertedId, name, email };
    res.status(201).json({ token: signToken(user), user });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await db().collection("users").findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      token: signToken(user),
      user: { _id: user._id, name: user.name, email: user.email }
    });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: { _id: req.user._id, name: req.user.name, email: req.user.email } });
});

app.get("/api/transactions", requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const filter = { userId: req.user._id };

  if (["income", "expense"].includes(req.query.type)) filter.type = req.query.type;
  if (req.query.category) filter.category = String(req.query.category);

  const rows = await db().collection("transactions")
    .find(filter)
    .sort({ date: -1 })
    .limit(limit)
    .toArray();

  res.json(rows);
});

app.post("/api/transactions", requireAuth, async (req, res) => {
  try {
    const data = transactionInput(req.body);
    const result = await db().collection("transactions").insertOne({
      ...data,
      userId: req.user._id,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    res.status(201).json({ _id: result.insertedId, ...data });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/transactions/:id", requireAuth, async (req, res) => {
  try {
    const id = new ObjectId(req.params.id);
    const data = transactionInput(req.body);
    const result = await db().collection("transactions").findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!result) return res.status(404).json({ message: "Transaction not found" });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || "Invalid transaction" });
  }
});

app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
  try {
    const result = await db().collection("transactions").deleteOne({
      _id: new ObjectId(req.params.id),
      userId: req.user._id
    });
    if (!result.deletedCount) return res.status(404).json({ message: "Transaction not found" });
    res.status(204).end();
  } catch {
    res.status(400).json({ message: "Invalid transaction id" });
  }
});

app.get("/api/dashboard", requireAuth, async (req, res) => {
  const rows = await db().collection("transactions")
    .find({ userId: req.user._id }).toArray();

  const income = rows.filter(x => x.type === "income").reduce((s, x) => s + x.amount, 0);
  const expense = rows.filter(x => x.type === "expense").reduce((s, x) => s + x.amount, 0);

  const categories = {};
  for (const row of rows.filter(x => x.type === "expense")) {
    categories[row.category] = (categories[row.category] || 0) + row.amount;
  }

  res.json({
    balance: Number((income - expense).toFixed(2)),
    income: Number(income.toFixed(2)),
    expense: Number(expense.toFixed(2)),
    transactionCount: rows.length,
    categories
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Unexpected server error" });
});

if (process.env.NODE_ENV !== "test") {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
  const dbName = process.env.DB_NAME || "financeflow";
  connectDatabase(uri, dbName)
    .then(() => app.listen(PORT, () => console.log(`FinanceFlow API running on :${PORT}`)))
    .catch(error => {
      console.error("Database connection failed:", error.message);
      process.exit(1);
    });
}

export default app;
