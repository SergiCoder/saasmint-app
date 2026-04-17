import type {
  DeleteAccountResult,
  IAuthGateway,
} from "@/application/ports/IAuthGateway";
import type { User } from "@/domain/models/User";
import { apiFetch, apiFetchVoid } from "./apiClient";
import { flattenPhone, keysToCamel } from "./caseTransform";
import { UserSchema } from "./schemas";
import {
  clearAuthCookies,
  getRefreshToken,
} from "@/infrastructure/auth/cookies";

function parseUser(raw: Record<string, unknown>): User {
  const camel = keysToCamel(raw) as Record<string, unknown>;
  flattenPhone(raw, camel);
  return UserSchema.parse(camel);
}

export class DjangoApiAuthGateway implements IAuthGateway {
  async getCurrentUser(): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>("/account/");
    return parseUser(raw);
  }

  async signOut(): Promise<void> {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      await apiFetchVoid("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
    await clearAuthCookies();
  }

  async deleteAccount(): Promise<DeleteAccountResult> {
    const res = await apiFetch<{ scheduled_deletion_at: string } | undefined>(
      "/account/",
      { method: "DELETE" },
    );
    await clearAuthCookies();
    return {
      scheduledDeletionAt: res?.scheduled_deletion_at ?? null,
    };
  }

  async cancelDeletion(): Promise<User> {
    const raw = await apiFetch<Record<string, unknown>>(
      "/account/cancel-deletion/",
      { method: "POST" },
    );
    return parseUser(raw);
  }
}
