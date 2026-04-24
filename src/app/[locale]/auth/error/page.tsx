import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

// Django's OAuth callback view (apps/users/auth_views.py:_oauth_error_redirect)
// sends the browser to `{FRONTEND_URL}/auth/error?error=<code>` when the
// provider handshake fails. Codes the Django side sends:
//   - exchange_failed, invalid_state, missing_code  → generic OAuth failure
//   - email_not_verified, account_deactivated       → login page handles these
//   - any provider-forwarded error string           → generic OAuth failure
//
// The login page already renders a banner for known codes, so we normalize
// here instead of maintaining a parallel error UI.
const LOGIN_PASSTHROUGH = new Set([
  "email_not_verified",
  "account_deactivated",
]);

export default async function AuthErrorPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const code = error && LOGIN_PASSTHROUGH.has(error) ? error : "oauth_error";
  redirect(`/login?error=${encodeURIComponent(code)}`);
}
