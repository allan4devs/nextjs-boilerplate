/**
 * Tipos del panel de recepción: lo que el mostrador ve del día en curso.
 */
export type RecentCheckin = {
  id: string;
  memberName: string;
  accessCode: string;
  method: string;
  membershipStatus: string;
  checkedInAt: string;
  by: string;
};

export type ActiveVisit = {
  id: string;
  memberName: string;
  normalizedName: string;
  cedula?: string;
  photoUrl?: string;
  membershipStatus: string;
  checkedInAt: string;
};

export type ReceptionTab = "empty" | "inside" | "cedula" | "face" | "register" | "invite" | "chat" | "billing";

