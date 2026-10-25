/**
 * Diagnóstico local: valida o hash e a senha sem enviar segredos pela rede.
 * Execute na pasta do frontend com:
 * node --env-file=.env.local scripts/check-auth.mjs
 * ou: node scripts/check-auth.mjs (quando o provedor já injeta as variáveis).
 */
import { scryptSync, timingSafeEqual } from "node:crypto";
import { readHiddenPassword } from "./password-input.mjs";

const hash = process.env.AUTH_PASSWORD_HASH ?? "";
const secret = process.env.AUTH_SESSION_SECRET ?? "";
const email = process.env.AUTH_EMAIL || "FluxHub@gmail.com";

const formatOk = /^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/i.test(hash);
if (!formatOk) {
  console.error("ERRO: AUTH_PASSWORD_HASH não está definido ou está inválido no ambiente deste processo.");
  console.error("Copie o valor COMPLETO gerado por node scripts/hash-password.mjs e reinicie o Next.js.");
  process.exitCode = 1;
} else if (secret.length < 32) {
  console.error("ERRO: AUTH_SESSION_SECRET não está definido ou tem menos de 32 caracteres.");
  console.error("Configure um segredo aleatório no mesmo ambiente do Next.js e reinicie o processo.");
  process.exitCode = 1;
} else {
  console.log("Configuração encontrada. E-mail configurado: " + email);
  try {
    const password = await readHiddenPassword("Digite a senha para verificar (não será exibida): ");
    const [, salt, expectedHash] = hash.split(":");
    const candidate = scryptSync(password, Buffer.from(salt, "hex"), 64);
    const expected = Buffer.from(expectedHash, "hex");
    if (timingSafeEqual(candidate, expected)) {
      console.log("OK: a senha corresponde ao hash deste ambiente.");
      console.log("Se o site ainda rejeitar, confirme que o processo Next.js publicado usa estas mesmas variáveis e foi reiniciado.");
    } else {
      console.error("ERRO: esta senha NÃO corresponde ao AUTH_PASSWORD_HASH configurado.");
      console.error("Gere um novo hash com a senha pretendida, atualize o ambiente Next.js e reinicie.");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Não foi possível ler a senha.");
    process.exitCode = 1;
  }
}
