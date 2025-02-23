import chalk from "chalk";
import { symbols } from "./symbols.js";

class Logger {
  #verbose: boolean = false;

  setIsVerbose(verbose: boolean) {
    this.#verbose = verbose;
  }

  isVerbose() {
    return this.#verbose;
  }

  info(...message: string[]) {
    console.log(...message);
  }

  debug(...message: string[]) {
    if (this.#verbose) {
      console.log(chalk.yellow(...message));
    }
  }

  success(...message: string[]) {
    console.log(chalk.green(symbols.success), ...message);
  }

  error(...message: string[]) {
    console.log(chalk.red(symbols.error), ...message);
  }
}

export const logger = new Logger();
