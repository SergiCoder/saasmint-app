import type { IInvitationGateway } from "@/application/ports/IInvitationGateway";

export class AcceptInvitation {
  constructor(private readonly invitations: IInvitationGateway) {}

  async execute(token: string): Promise<void> {
    return this.invitations.acceptInvitation(token);
  }
}
