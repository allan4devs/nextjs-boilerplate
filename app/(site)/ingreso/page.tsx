import { redirect } from "next/navigation";

/** Ingreso y recepción viven juntos en Reception OS. */
export default function IngresoRedirectPage() {
  redirect("/recepcion");
}
