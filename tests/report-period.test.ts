import assert from "node:assert/strict";
import test from "node:test";
import { backendPeriod, previousPeriod, readPeriod, resolvePeriod, validRange } from "../src/lib/report-period";

const today = "2024-03-02";

test("atalhos usam datas inclusivas e cruzam corretamente o mês", () => {
  const period = resolvePeriod("7", today);
  assert.deepEqual([period.start, period.end], ["2024-02-25", today]);
  const previous = previousPeriod(period);
  assert.deepEqual([previous.start, previous.end], ["2024-02-18", "2024-02-24"]);
  assert.deepEqual([...backendPeriod(resolvePeriod("last-month", today))], [
    ["start_date", "2024-02-01"], ["end_date", "2024-02-29"],
  ]);
  assert.equal(resolvePeriod("today", today).end, today);
  assert.equal(resolvePeriod("yesterday", today).start, "2024-03-01");
});

test("personalizado rejeita datas impossíveis, invertidas, futuras e períodos longos", () => {
  assert.equal(validRange("2024-02-30", today, today), false);
  assert.equal(validRange(today, "2024-02-28", today), false);
  assert.equal(validRange(today, "2024-03-03", today), false);
  assert.equal(validRange("2023-03-01", today, today), false);
  assert.equal(readPeriod({ period: "custom", start_date: "2024-02-29", end_date: today, compare: "1" }, today).compare, true);
});

test("histórico completo preserva o seletor antigo sem comparar período ilimitado", () => {
  assert.equal(readPeriod({ days: "90" }, today).preset, "90");
  assert.equal(readPeriod({ period: "all" }, today).preset, "30");
  const period = readPeriod({ period: "all", compare: "1" }, today, true);
  assert.equal(period.compare, false);
  assert.equal(backendPeriod(period).get("all_history"), "true");
});
