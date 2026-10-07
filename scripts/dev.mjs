import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Accept standard Next.js flags and preview tools that forward Vite-style flags.
const args = process.argv
  .slice(2)
  .filter((arg) => arg !== "--strictPort")
  .map((arg) => (arg === "--host" ? "--hostname" : arg));
if (!args.includes("--hostname") && !args.includes("-H"))
  args.push("--hostname", "127.0.0.1");
const child = spawn(
  process.execPath,
  [
    fileURLToPath(import.meta.resolve("next/dist/bin/next")),
    "dev",
    "--webpack",
    ...args,
  ],
  { stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
