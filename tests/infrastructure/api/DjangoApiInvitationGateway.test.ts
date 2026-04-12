import { describe, it, expect, vi, beforeEach } from "vitest";

const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/infrastructure/api/caseTransform", async () => {
  const actual = await vi.importActual("@/infrastructure/api/caseTransform");
  return actual;
});

const { DjangoApiInvitationGateway } =
  await import("@/infrastructure/api/DjangoApiInvitationGateway");

const rawInvitation = {
  id: "inv1",
  org: "org-1",
  email: "bob@example.com",
  role: "member",
  status: "pending",
  invited_by: {
    id: "u1",
    email: "alice@example.com",
    full_name: "Alice",
  },
  created_at: "2024-01-01T00:00:00Z",
  expires_at: "2024-01-08T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DjangoApiInvitationGateway", () => {
  const gateway = new DjangoApiInvitationGateway();

  describe("createInvitation", () => {
    it("sends POST /orgs/:orgId/invitations/ and maps response", async () => {
      mockApiFetch.mockResolvedValue(rawInvitation);

      const result = await gateway.createInvitation("o1", {
        email: "bob@example.com",
        role: "member",
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/o1/invitations/", {
        method: "POST",
        body: JSON.stringify({ email: "bob@example.com", role: "member" }),
      });
      expect(result.invitedBy.fullName).toBe("Alice");
      expect(result.email).toBe("bob@example.com");
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 400: Bad Request"));

      await expect(
        gateway.createInvitation("o1", {
          email: "bob@example.com",
          role: "member",
        }),
      ).rejects.toThrow("API 400: Bad Request");
    });
  });

  describe("listInvitations", () => {
    it("fetches GET /orgs/:orgId/invitations/ and maps results", async () => {
      mockApiFetch.mockResolvedValue([rawInvitation]);

      const result = await gateway.listInvitations("o1");

      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/o1/invitations/");
      expect(result).toHaveLength(1);
      expect(result[0].invitedBy.fullName).toBe("Alice");
    });

    it("returns an empty array when no invitations exist", async () => {
      mockApiFetch.mockResolvedValue([]);

      const result = await gateway.listInvitations("o1");
      expect(result).toEqual([]);
    });
  });

  describe("cancelInvitation", () => {
    it("sends DELETE /orgs/:orgId/invitations/:invitationId/", async () => {
      mockApiFetch.mockResolvedValue(undefined);

      await gateway.cancelInvitation("o1", "inv1");

      expect(mockApiFetch).toHaveBeenCalledWith("/orgs/o1/invitations/inv1/", {
        method: "DELETE",
      });
    });
  });

  describe("acceptInvitation", () => {
    it("sends POST /invitations/:token/accept/", async () => {
      mockApiFetch.mockResolvedValue(undefined);

      await gateway.acceptInvitation("abc123");

      expect(mockApiFetch).toHaveBeenCalledWith("/invitations/abc123/accept/", {
        method: "POST",
      });
    });
  });

  describe("declineInvitation", () => {
    it("sends POST /invitations/:token/decline/", async () => {
      mockApiFetch.mockResolvedValue(undefined);

      await gateway.declineInvitation("abc123");

      expect(mockApiFetch).toHaveBeenCalledWith(
        "/invitations/abc123/decline/",
        { method: "POST" },
      );
    });
  });
});
