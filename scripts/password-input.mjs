/**
 * Lê senhas em um terminal TTY sem eco. Aceita caracteres colados em lotes:
 * alguns terminais entregam o texto inteiro (ou texto + Enter) em um único evento.
 */
export function consumePasswordChunk(state, chunk) {
  let { value, escape } = state;
  let done = false;
  let aborted = false;

  for (const char of chunk) {
    if (done || aborted) break;
    // Ignora sequências de controle de terminais (setas e bracketed paste).
    if (escape === 1) {
      escape = char === "[" ? 2 : 0;
      continue;
    }
    if (escape === 2) {
      if (/[@-~]/.test(char)) escape = 0;
      continue;
    }
    if (char === "\u001b") {
      escape = 1;
    } else if (char === "\u0003" || char === "\u0004") {
      aborted = true;
    } else if (char === "\r" || char === "\n") {
      done = true;
    } else if (char === "\b" || char === "\u007f") {
      value = Array.from(value).slice(0, -1).join("");
    } else if (char >= " " && char !== "\u007f") {
      value += char;
    }
  }
  return { value, escape, done, aborted };
}

export function readHiddenPassword(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Execute este comando num terminal interativo (TTY/SSH -t).");
  }

  return new Promise((resolve, reject) => {
    let state = { value: "", escape: 0 };
    const wasRaw = Boolean(process.stdin.isRaw);
    process.stdout.write(prompt);

    const cleanup = () => {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      process.stdout.write("\n");
    };

    function onData(chunk) {
      state = consumePasswordChunk(state, chunk);
      if (state.aborted) {
        cleanup();
        reject(new Error("Leitura cancelada."));
      } else if (state.done) {
        cleanup();
        resolve(state.value);
      }
    }

    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}
