import { logger } from "./logger.js";
import ora from "ora";

class SimpleOra {
  text: string;

  constructor(text: string) {
    this.text = text;
    logger.debug(`${text}\n`);
  }

  start() {}

  stop() {
    logger.debug(`\nDone with: ${this.text}\n`);
  }
}

export const getSpinner = (text: string): SimpleOra => {
  return logger.isVerbose() ? new SimpleOra(text) : ora(text);
};
