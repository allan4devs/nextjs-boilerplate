"use client";

import Link from "next/link";
import { getAnonymousId } from "../lib/analytics/session-client";

/**
 * Link de conversión que registra `cta_clicked` antes de navegar.
 *
 * `keepalive` es lo que hace que el evento sobreviva a la navegación: sin eso
 * el navegador cancela el fetch al cambiar de página y el clic se pierde.
 * La superficie sale del pathname para no tener que pasarla en cada llamada.
 */
export default function CtaLink({
  href,
  cta,
  surface,
  plan,
  external = false,
  card = false,
  className,
  children,
}: {
  href: string;
  /** Etiqueta del CTA tal como la ve la persona. */
  cta: string;
  /** Override de la página de origen; por defecto el pathname actual. */
  surface?: string;
  /** Plan que queda preseleccionado en el checkout, si aplica. */
  plan?: string;
  external?: boolean;
  /** Marca la tarjeta para las animaciones cinematográficas del landing. */
  card?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  function track() {
    try {
      void fetch("/api/xtreme/events/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          type: "cta_clicked",
          source: "site",
          anonymousId: getAnonymousId(),
          properties: {
            surface: surface ?? window.location.pathname,
            cta,
            href,
            plan: plan ?? null,
          },
        }),
      }).catch(() => {});
    } catch {
      // La medición nunca debe bloquear la navegación.
    }
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={track}
        className={className}
        {...(card ? { "data-cinema-card": "" } : {})}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      onClick={track}
      className={className}
      {...(card ? { "data-cinema-card": "" } : {})}
    >
      {children}
    </Link>
  );
}
