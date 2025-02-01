import { z } from "zod";
import { logger } from "./logger.js";

export function withVerboseLogging<T extends any[]>(
  execute: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    const options = z
      .object({
        verbose: z.boolean().catch(() => false),
      })
      .parse(args[0]);
    if (options.verbose) {
      logger.isVerbose(true);
    }
    await execute(...args);
  };
}
