import { randomBytes, scryptSync } from "node:crypto";

if (!process.stdin.isTTY || !process.stdin.setRawMode) {
  console.error("Execute em um terminal interativo.");
  process.exit(1);
}
let password = "";
process.stdout.write("Digite a senha do administrador (não será exibida): ");
process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
process.stdin.resume();
process.stdin.on("data", (key) => {
  if (key === "\u0003") { process.stdin.setRawMode(false); process.exit(130); }
  if (key === "\r" || key === "\n") {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write("\n");
    if (!password) { console.error("A senha não pode ser vazia."); process.exitCode = 1; return; }
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, 64);
    password = "";
    console.log("AUTH_PASSWORD_HASH=scrypt:" + salt.toString("hex") + ":" + hash.toString("hex"));
    console.log("AUTH_SESSION_SECRET=" + randomBytes(32).toString("hex"));
  } else if (key === "\u007f") {
    password = password.slice(0, -1);
  } else if (key.length === 1 && key >= " ") {
    password += key;
  }
});
