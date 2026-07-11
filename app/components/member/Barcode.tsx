"use client";

/** Codigo de barras decorativo del carne digital (derivado del codigo de acceso). */

export default function Barcode({ value }: { value: string }) {
  const seed = value.replace(/\D/g, "").padEnd(12, "7");
  const bars = Array.from({ length: 44 }, (_, i) => 1 + ((Number(seed[i % seed.length]) + i) % 4));
  return (
    <div className="flex h-14 items-stretch gap-[2px] bg-white px-3 py-2">
      {bars.map((width, i) => (
        <span key={i} style={{ width }} className={i % 2 === 0 ? "bg-black" : "bg-white"} />
      ))}
    </div>
  );
}
