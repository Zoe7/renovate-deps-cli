type SyncOrAsyncFunction<T extends any[]> = (
  ...args: T
) => void | Promise<void>;

export function withExitPromptErrorHandling<T extends any[]>(
  execute: SyncOrAsyncFunction<T>
): SyncOrAsyncFunction<T> {
  return async (...args: T): Promise<void> => {
    try {
      await execute(...args);
    } catch (error) {
      if (error instanceof Error && error.name === "ExitPromptError") {
        // noop; silence this error
      } else {
        throw error;
      }
    }
  };
}
