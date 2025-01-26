const isSupported =
  process.platform !== "win32" ||
  process.env["CI"] ||
  process.env["TERM"] === "xterm-256color";

const symbolsDefault = {
  info: "ℹ",
  success: "✔",
  error: "✖",
};

const symbolsFallback = {
  info: "i",
  success: "√",
  error: "×",
};

export const symbols = isSupported ? symbolsDefault : symbolsFallback;
