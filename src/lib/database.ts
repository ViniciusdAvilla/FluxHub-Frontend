import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Finance } from "./types";

let database: DatabaseSync | undefined;
function db() {
  if (database) return database;
  const path = resolve(process.env.FINANCE_DB_PATH || "./data/finance.sqlite");
  mkdirSync(dirname(path), { recursive: true });
  database = new DatabaseSync(path, { timeout: 5000 });
  database.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS finance (
      productId TEXT PRIMARY KEY, supplier TEXT NOT NULL,
      unitCost REAL NOT NULL CHECK(unitCost >= 0),
      feePercent REAL NOT NULL CHECK(feePercent BETWEEN 0 AND 100),
      taxPercent REAL NOT NULL CHECK(taxPercent BETWEEN 0 AND 100),
      shippingCost REAL NOT NULL CHECK(shippingCost >= 0),
      otherCost REAL NOT NULL CHECK(otherCost >= 0)
    ) STRICT;`);
  return database;
}

export function readFinance(): Finance[] {
  // SQLite rows have a null prototype; React server props require plain objects.
  return db()
    .prepare("SELECT * FROM finance")
    .all()
    .map((row) => ({ ...row })) as Finance[];
}

export function saveFinance(f: Finance) {
  db()
    .prepare(
      `INSERT INTO finance VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(productId) DO UPDATE SET supplier=excluded.supplier,
    unitCost=excluded.unitCost, feePercent=excluded.feePercent,
    taxPercent=excluded.taxPercent, shippingCost=excluded.shippingCost,
    otherCost=excluded.otherCost`,
    )
    .run(
      f.productId,
      f.supplier,
      f.unitCost,
      f.feePercent,
      f.taxPercent,
      f.shippingCost,
      f.otherCost,
    );
}
