import { randomBytes, scryptSync } from "node:crypto";
import { readHiddenPassword } from "./password-input.mjs";

try {
  const password = await readHiddenPassword("Digite a senha do administrador (não será exibida): ");
  if (!password || password.length > 256) {
    throw new Error("Use uma senha com 1 a 256 caracteres.");
  }
  const confirmation = await readHiddenPassword("Confirme a mesma senha: ");
  if (password !== confirmation) {
    throw new Error("As senhas não coincidem. Nada foi gerado. Execute novamente.");
  }

  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  console.log("Senha confirmada. Configure estas variáveis APENAS no servidor Next.js:");
  console.log("AUTH_EMAIL=FluxHub@gmail.com");
  console.log("AUTH_PASSWORD_HASH=scrypt:" + salt.toString("hex") + ":" + hash.toString("hex"));
  console.log("AUTH_SESSION_SECRET=" + randomBytes(32).toString("hex"));
  console.log("Depois reinicie/reimplante o Next.js. Nunca coloque esses valores no GitHub.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Não foi possível gerar a senha.");
  process.exitCode = 1;
}
