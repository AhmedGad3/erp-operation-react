/**
 * Extracts a clean error message from any Axios error response.
 *
 * Handles:
 *  - NestJS ValidationPipe  → { message: string[] }
 *  - NestJS HTTP exceptions  → { message: string }
 *  - Network / unknown errors
 */
export function getErrorMessage(error, fallback = "Something went wrong") {
  const data = error?.response?.data;

  if (!data) return error?.message || fallback;

  // ValidationPipe returns an array
  if (Array.isArray(data.message)) return data.message.join(", ");

  if (typeof data.message === "string") return data.message;

  if (typeof data.error === "string") return data.error;

  return fallback;
}
