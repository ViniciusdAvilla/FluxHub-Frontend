import test from "node:test";
import assert from "node:assert/strict";
import { consumePasswordChunk } from "../scripts/password-input.mjs";

test("aceita colar a senha inteira em um único evento", () => {
  const result = consumePasswordChunk({ value: "", escape: 0 }, "abc1L#302030");
  assert.equal(result.value, "abc1L#302030");
  assert.equal(result.done, false);
});

test("aceita colar a senha e Enter no mesmo evento", () => {
  const result = consumePasswordChunk({ value: "", escape: 0 }, "senha-com-espacos !\r");
  assert.equal(result.value, "senha-com-espacos !");
  assert.equal(result.done, true);
});

test("aceita digitação em blocos, backspace e caracteres Unicode", () => {
  let state = consumePasswordChunk({ value: "", escape: 0 }, "passé😀");
  state = consumePasswordChunk(state, "\u007f#\r");
  assert.equal(state.value, "passé#");
  assert.equal(state.done, true);
});

test("ignora os delimitadores de bracketed paste", () => {
  let state = consumePasswordChunk({ value: "", escape: 0 }, "\u001b[200~sen");
  state = consumePasswordChunk(state, "ha!#\u001b[201~\n");
  assert.equal(state.value, "senha!#");
  assert.equal(state.done, true);
});

test("aceita apenas texto anterior ao Enter e reconhece cancelamento", () => {
  assert.equal(consumePasswordChunk({ value: "", escape: 0 }, "abc\nxyz").value, "abc");
  assert.equal(consumePasswordChunk({ value: "", escape: 0 }, "\u0003").aborted, true);
});
