const isSupported =
  process.platform !== "win32" ||
  process.env["CI"] ||
  process.env["TERM"] === "xterm-256color";

const symbolsDefault = {
  info: "ℹ",
  success: "✔",
  error: "✖",
  warning: "!",
};

const symbolsFallback = {
  info: "i",
  success: "√",
  error: "×",
  warning: "!",
};

export const symbols = isSupported ? symbolsDefault : symbolsFallback;
