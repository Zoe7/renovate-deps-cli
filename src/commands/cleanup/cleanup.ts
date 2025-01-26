import chalk from "chalk";
import { clearConfig } from "../../utils/config.js";
import { symbols } from "../../utils/symbols.js";

export function cleanup() {
  clearConfig();
  console.log(
    chalk.white(chalk.green(symbols.success), "Configuration cleaned up")
  );
}
