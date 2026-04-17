import { ApiError } from "@/domain/errors/ApiError";

/**
 * Extract a human-readable message from an error thrown by the gateway layer.
 * Falls back to `fallback` when the error isn't an ApiError or carries no
 * recognizable Django-style `detail`/string-array body.
 */
export function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const detail = err.detail;
    if (detail) return detail;
  }
  return fallback;
}
