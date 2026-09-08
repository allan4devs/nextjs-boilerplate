"use client";

export default function EquipmentError({ reset }: { reset: () => void }) {
  return <section className="mx-auto max-w-xl p-8">
    <h1 className="text-2xl font-bold">No se pudo consultar esta máquina</h1>
    <p className="mt-3">La ficha necesita conexión al inventario. Volvé a intentarlo.</p>
    <button type="button" onClick={reset} className="mt-4 min-h-11 border-2 border-[#d8ff3e] px-4 text-[#d8ff3e]">Reintentar</button>
  </section>;
}
