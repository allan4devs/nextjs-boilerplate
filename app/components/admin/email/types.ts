/**
 * Contratos del centro de campañas: lo que devuelve /api/xtreme/admin/email y
 * lo que la pantalla arma antes de enviar.
 */

export type AudienceId =
  | "imported"
  | "unregistered"
  | "never_registered"
  | "pending"
  | "never_opened"
  | "inactive"
  | "members"
  | "claim_profile"
  | "claim_recovered"
  | "claim_native"
  | "claim_active_plan"
  | "invite_recoverable"
  | "unverified_not_sent"
  | "excel_recovered"
  | "winback_90"
  | "winback_180"
  | "winback_365"
  | "possible_foreign"
  | "plan_week"
  | "plan_fortnight"
  | "plan_month"
  | "plan_quarter"
  | "plan_free_day"
  | "plan_senior"
  | "plan_other"
  | "no_plan"
  | "all"
  | "sent_not_registered"
  | "opened_not_registered"
  | "registered_never_app"
  | "registered_inactive"
  | "active_app"
  | "plan_expiring"
  | "plan_expired_recent"
  | "free_day_convert";
export type CampaignProcessSummary = {
  configured: boolean;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  campaignId?: string;
  error?: string;
  rounds?: number;
  reclaimed?: number;
  alreadySentSkipped?: number;
};

export type CenterData = {
  emailConfigured?: boolean;
  emailConfigError?: string | null;
  audiences: Record<AudienceId, number> & { suppressed: number };
  diagnostics: {
    totalMembers: number;
    membersWithUsableEmail: number;
    membersWithoutUsableEmail: number;
    importedContactEmails: number;
    recoveredMembers: number;
    verifiedMembers: number;
    unverifiedMembers: number;
    quarantinedMembers: number;
    quarantinePlaceholder: number;
    quarantineShared: number;
    quarantineMismatch: number;
    unsafeIdentityMatches: number;
    quarantineWithPreviousEmail?: number;
    recoveredFromQuarantine?: number;
    recoveredFromExcel?: number;
    inviteRecoverableTotal?: number;
    inviteRecoverableEmails?: number;
    unverifiedNotSentEmails?: number;
    alreadyCampaignSentEmails?: number;
    remainingActivationEmails?: number;
    sentNotRegisteredEmails?: number;
    openedNotRegisteredEmails?: number;
    activeAppEmails?: number;
    planExpiringEmails?: number;
  };
  campaigns: Array<{
    id: string;
    subject: string;
    audience: AudienceId;
    status: "queued" | "processing" | "completed" | "cancelled";
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    createdAt: string;
    lastProcessedAt?: string;
    lastError?: string;
    tracking?: {
      total: number;
      sent: number;
      opened: number;
      registered: number;
      notOpened: number;
      notRegistered: number;
      failed: number;
      skipped: number;
      queued: number;
    };
  }>;
  unsubscribes: Array<{
    email: string;
    reason?: string;
    feedback?: string;
    unsubscribedAt?: string;
    createdAt?: string;
  }>;
};

export type DeliveryTrackingRow = {
  deliveryKey: string;
  campaignId: string;
  email: string;
  name: string;
  status: string;
  deliveryStatus: string;
  sentAt: string | null;
  openedAt: string | null;
  registeredAt: string | null;
  lastReminderAt: string | null;
  reminderCount: number;
  emailVerified: boolean;
  canResend: boolean;
  error?: string;
};

export type CampaignTrackingPayload = {
  campaignId: string;
  stats: {
    total: number;
    sent: number;
    opened: number;
    registered: number;
    notOpened: number;
    notRegistered: number;
    failed: number;
    skipped: number;
    queued: number;
  };
  rows: DeliveryTrackingRow[];
};

export type RecipientPreview = {
  email: string;
  name: string;
  source: string;
  emailVerified: boolean;
  duplicateProfiles: boolean;
  plan: string;
  nextBillingDate: string;
};

export type MemberCoverage = {
  name: string;
  email: string;
  emailVerified: boolean;
  plan: string;
  rate: string;
  sourceStatus: string;
  quarantineReason: string;
  quarantinedEmail: string;
  recoveryMethod: string;
  recoveredAt: string;
  emailSafe: boolean;
  emailNameScore: number;
};
