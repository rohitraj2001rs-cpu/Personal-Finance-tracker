export function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

export function transactionInput(body) {
  const type = cleanText(body.type).toLowerCase();
  const amount = Number(body.amount);

  if (!["income", "expense"].includes(type)) {
    throw new Error("Type must be income or expense");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  return {
    type,
    amount: Math.round(amount * 100) / 100,
    category: cleanText(body.category, "Other").slice(0, 50),
    description: cleanText(body.description).slice(0, 200),
    date: body.date ? new Date(body.date) : new Date(),
    source: cleanText(body.source, "web").slice(0, 30)
  };
}
