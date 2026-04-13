import { describe, it, expect, vi } from "vitest";
import { AcceptInvitation } from "@/application/use-cases/invitation/AcceptInvitation";
import type { IInvitationGateway } from "@/application/ports/IInvitationGateway";

function makeGateway(
  overrides?: Partial<IInvitationGateway>,
): IInvitationGateway {
  return {
    createInvitation: vi.fn(),
    listInvitations: vi.fn(),
    cancelInvitation: vi.fn(),
    getByToken: vi.fn(),
    acceptInvitation: vi.fn().mockResolvedValue(undefined),
    declineInvitation: vi.fn(),
    ...overrides,
  };
}

describe("AcceptInvitation", () => {
  it("calls acceptInvitation with correct token", async () => {
    const gateway = makeGateway();
    await new AcceptInvitation(gateway).execute("abc123");
    expect(gateway.acceptInvitation).toHaveBeenCalledWith("abc123");
  });
});
