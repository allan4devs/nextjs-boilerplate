import SiteFooter from "../components/SiteFooter";
import SessionInactivityGuard from "../components/SessionInactivityGuard";
import SessionAnalytics from "../components/SessionAnalytics";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-[#f6c400] selection:text-black">
      <SessionAnalytics source="member_app" />
      <SessionInactivityGuard />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
