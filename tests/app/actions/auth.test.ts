import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

const mockPublicApiFetch = vi.fn();
vi.mock("@/infrastructure/api/apiClient", () => ({
  publicApiFetch: (...args: unknown[]) => mockPublicApiFetch(...args),
}));

const mockSetAuthCookies = vi.fn();
vi.mock("@/infrastructure/auth/cookies", () => ({
  setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args),
}));

const mockSignOutExecute = vi.fn();
vi.mock("@/application/use-cases/auth/SignOut", () => ({
  SignOut: function SignOut() {
    return { execute: mockSignOutExecute };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  authGateway: {},
}));

// Force fresh module for each test
let signIn: typeof import("@/app/actions/auth").signIn;
let signUp: typeof import("@/app/actions/auth").signUp;
let signOut: typeof import("@/app/actions/auth").signOut;
let resetPassword: typeof import("@/app/actions/auth").resetPassword;
let resetPasswordWithToken: typeof import("@/app/actions/auth").resetPasswordWithToken;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/app/actions/auth");
  signIn = mod.signIn;
  signUp = mod.signUp;
  signOut = mod.signOut;
  resetPassword = mod.resetPassword;
  resetPasswordWithToken = mod.resetPasswordWithToken;
});

describe("auth server actions", () => {
  describe("signIn", () => {
    it("calls Django login and redirects to /dashboard on success", async () => {
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
      });

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "secret123");

      await expect(signIn(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockPublicApiFetch).toHaveBeenCalledWith("/auth/login/", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "secret123",
        }),
      });
      expect(mockSetAuthCookies).toHaveBeenCalledWith(
        "tok_abc",
        "ref_abc",
      );
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("returns friendly error from API detail field", async () => {
      mockPublicApiFetch.mockRejectedValue(
        new Error(
          'API 401: {"detail":"Invalid credentials.","code":"invalid_credentials"}',
        ),
      );

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "wrong");

      const result = await signIn(undefined, formData);
      expect(result).toEqual({ error: "Invalid credentials." });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("returns fallback on non-JSON API error", async () => {
      mockPublicApiFetch.mockRejectedValue(new Error("API 500: Internal"));

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "wrong");

      const result = await signIn(undefined, formData);
      expect(result).toEqual({
        error: "Login failed. Please try again.",
      });
    });

    it("redirects to billing checkout when plan is supplied", async () => {
      mockPublicApiFetch.mockResolvedValue({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
      });

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "secret123");
      formData.set("plan", "price_pro_monthly");

      await expect(signIn(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockRedirect).toHaveBeenCalledWith(
        "/subscription/checkout?plan=price_pro_monthly",
      );
    });
  });

  describe("signUp", () => {
    it("calls Django register and redirects to /login on success", async () => {
      mockPublicApiFetch.mockResolvedValue({});

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("email", "new@example.com");
      formData.set("password", "secret123");

      await expect(signUp(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockPublicApiFetch).toHaveBeenCalledWith("/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          password: "secret123",
          full_name: "Jane Doe",
        }),
      });
      expect(mockRedirect).toHaveBeenCalledWith("/login?registered=true");
    });

    it("returns friendly error from API detail field", async () => {
      mockPublicApiFetch.mockRejectedValue(
        new Error('API 400: {"detail":"Email already in use."}'),
      );

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("email", "existing@example.com");
      formData.set("password", "secret123");

      const result = await signUp(undefined, formData);
      expect(result).toEqual({ error: "Email already in use." });
    });

    it("returns fallback on non-JSON API error", async () => {
      mockPublicApiFetch.mockRejectedValue(new Error("API 500: Internal"));

      const formData = new FormData();
      formData.set("fullName", "Jane Doe");
      formData.set("email", "existing@example.com");
      formData.set("password", "secret123");

      const result = await signUp(undefined, formData);
      expect(result).toEqual({
        error: "Registration failed. Please try again.",
      });
    });

    it("returns error when fullName is too short", async () => {
      const formData = new FormData();
      formData.set("fullName", "Ab");
      formData.set("email", "new@example.com");
      formData.set("password", "secret123");

      const result = await signUp(undefined, formData);
      expect(result).toEqual({
        error: "Full name must be between 3 and 255 characters",
      });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when fullName is missing", async () => {
      const formData = new FormData();
      formData.set("email", "new@example.com");
      formData.set("password", "secret123");

      const result = await signUp(undefined, formData);
      expect(result).toEqual({
        error: "Full name must be between 3 and 255 characters",
      });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });
  });

  describe("signIn — validation", () => {
    it("returns error when email is missing", async () => {
      const formData = new FormData();
      formData.set("password", "secret123");

      const result = await signIn(undefined, formData);
      expect(result).toEqual({ error: "Email and password are required" });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when password is missing", async () => {
      const formData = new FormData();
      formData.set("email", "user@example.com");

      const result = await signIn(undefined, formData);
      expect(result).toEqual({ error: "Email and password are required" });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when both fields are missing", async () => {
      const formData = new FormData();

      const result = await signIn(undefined, formData);
      expect(result).toEqual({ error: "Email and password are required" });
    });
  });

  describe("resetPassword", () => {
    it("returns success when reset email is sent", async () => {
      mockPublicApiFetch.mockResolvedValue({});

      const formData = new FormData();
      formData.set("email", "user@example.com");

      const result = await resetPassword(undefined, formData);
      expect(result).toEqual({ success: true });
      expect(mockPublicApiFetch).toHaveBeenCalledWith(
        "/auth/forgot-password/",
        {
          method: "POST",
          body: JSON.stringify({ email: "user@example.com" }),
        },
      );
    });

    it("returns error when email is missing", async () => {
      const formData = new FormData();

      const result = await resetPassword(undefined, formData);
      expect(result).toEqual({ error: "Email is required" });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns success even on API failure to avoid email enumeration", async () => {
      mockPublicApiFetch.mockRejectedValue(
        new Error("API 429: Rate limit exceeded"),
      );

      const formData = new FormData();
      formData.set("email", "user@example.com");

      const result = await resetPassword(undefined, formData);
      expect(result).toEqual({ success: true });
    });
  });

  describe("resetPasswordWithToken", () => {
    it("returns success when password is updated", async () => {
      mockPublicApiFetch.mockResolvedValue({});

      const formData = new FormData();
      formData.set("password", "newpassword123");
      formData.set("confirmPassword", "newpassword123");
      formData.set("token", "reset-token-123");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({ success: true });
      expect(mockPublicApiFetch).toHaveBeenCalledWith("/auth/reset-password/", {
        method: "POST",
        body: JSON.stringify({
          token: "reset-token-123",
          password: "newpassword123",
        }),
      });
    });

    it("returns error when token is missing", async () => {
      const formData = new FormData();
      formData.set("password", "newpassword123");
      formData.set("confirmPassword", "newpassword123");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({
        error: "Invalid or expired reset link. Please request a new one.",
      });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when password is too short", async () => {
      const formData = new FormData();
      formData.set("password", "short");
      formData.set("confirmPassword", "short");
      formData.set("token", "reset-token-123");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({
        error: "Password must be at least 8 characters",
      });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when password is missing", async () => {
      const formData = new FormData();
      formData.set("confirmPassword", "newpassword123");
      formData.set("token", "reset-token-123");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({
        error: "Password must be at least 8 characters",
      });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error when passwords do not match", async () => {
      const formData = new FormData();
      formData.set("password", "newpassword123");
      formData.set("confirmPassword", "differentpassword");
      formData.set("token", "reset-token-123");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({ error: "Passwords do not match" });
      expect(mockPublicApiFetch).not.toHaveBeenCalled();
    });

    it("returns error message on API failure", async () => {
      mockPublicApiFetch.mockRejectedValue(
        new Error("API 400: Invalid or expired token"),
      );

      const formData = new FormData();
      formData.set("password", "newpassword123");
      formData.set("confirmPassword", "newpassword123");
      formData.set("token", "expired-token");

      const result = await resetPasswordWithToken(undefined, formData);
      expect(result).toEqual({
        error:
          "This reset link is invalid or has expired. Please request a new one.",
      });
    });
  });

  describe("signOut", () => {
    it("executes SignOut use case and redirects to /login", async () => {
      mockSignOutExecute.mockResolvedValue(undefined);

      await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockSignOutExecute).toHaveBeenCalledOnce();
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });
  });
});
