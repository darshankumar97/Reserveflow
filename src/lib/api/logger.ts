type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

function log(level: LogLevel, message: string, payload?: LogPayload): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

export const apiLogger = {
  info(message: string, payload?: LogPayload): void {
    log("info", message, payload);
  },
  warn(message: string, payload?: LogPayload): void {
    log("warn", message, payload);
  },
  error(message: string, payload?: LogPayload): void {
    log("error", message, payload);
  },
};
