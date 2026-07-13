export type PaymentRecord = {
  id: string;
  optionLabel: string;
  category: "Plan" | "Clase" | "Otro";
  amountCrc: number;
  amountUsd: number;
  method: "paypal" | "cash" | "transfer" | "sinpe" | "other";
  status: "completed" | "pending" | "refunded";
  date: string;
  note: string;
  paypalCaptureId?: string | null;
};

export type EntitlementRecord = {
  id: string;
  label?: string;
  kind: "plan" | "day_pass" | "class_credit" | "referral_bonus" | "admin_grant";
  startsOn: string;
  endsOn: string;
  remainingBookings: number | null;
  status: "active" | "exhausted" | "revoked" | "expired";
};

export type PaymentHistoryResponse = {
  payments: PaymentRecord[];
  entitlements: EntitlementRecord[];
};
