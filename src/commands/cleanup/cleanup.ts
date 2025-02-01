import { clearConfig } from "../../utils/config.js";
import { logger } from "../../utils/logger.js";

export function cleanup() {
  clearConfig();
  logger.success("Configuration cleaned up");
}
