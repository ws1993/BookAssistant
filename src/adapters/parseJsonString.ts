export function parseJsonString(value: unknown, field: string): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return value;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ${field} as JSON: ${message}`);
  }
}
