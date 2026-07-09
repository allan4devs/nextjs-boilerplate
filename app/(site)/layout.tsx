import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-[#f6c400] selection:text-black">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
