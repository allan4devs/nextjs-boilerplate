import type { Metadata } from "next";
import EmailPreferencesClient from "./EmailPreferencesClient";

export const metadata: Metadata = {
  title: "Preferencias de correo | Xtreme Gym",
  robots: { index: false, follow: false },
};

export default async function EmailPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return <EmailPreferencesClient token={token} />;
}
