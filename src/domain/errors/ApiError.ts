import { DomainError } from "./DomainError";

export class ApiError extends DomainError {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    code = `HTTP_${status}`,
  ) {
    super(`API ${status}`, code);
  }

  /**
   * Extract a Django-style `{ detail: string }` or `string[]` message from the
   * parsed body, when available. Returns null for unrecognized shapes.
   */
  get detail(): string | null {
    const body = this.body;
    if (Array.isArray(body)) {
      const parts = body.filter((v): v is string => typeof v === "string");
      return parts.length > 0 ? parts.join(" ") : null;
    }
    if (body && typeof body === "object" && "detail" in body) {
      const d = (body as { detail: unknown }).detail;
      if (typeof d === "string") return d;
    }
    return null;
  }
}
