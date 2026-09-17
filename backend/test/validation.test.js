import test from "node:test";
import assert from "node:assert/strict";
import { transactionInput } from "../src/validation.js";

test("accepts a valid expense", () => {
  const item = transactionInput({
    type: "expense",
    amount: "120.50",
    category: "Food",
    description: "Lunch"
  });
  assert.equal(item.type, "expense");
  assert.equal(item.amount, 120.5);
});

test("rejects a negative amount", () => {
  assert.throws(() => transactionInput({
    type: "expense",
    amount: -5
  }));
});
