export interface InvitedBy {
  id: string;
  email: string;
  fullName: string;
}

export interface Invitation {
  id: string;
  org: string;
  email: string;
  role: "admin" | "member";
  status: "pending" | "accepted" | "declined" | "expired";
  invitedBy: InvitedBy;
  createdAt: string;
  expiresAt: string;
}
