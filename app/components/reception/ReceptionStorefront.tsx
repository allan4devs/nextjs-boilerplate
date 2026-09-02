"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ALargeSmall, Banknote, Check, CheckCircle2, ChevronUp, Contrast, Download, Flame, Loader2, Minus, PackageOpen, Plus, Printer, Save, Search, ShoppingCart, SlidersHorizontal, Smartphone, Split, Trash2, X } from "lucide-react";
import { GameChip, GameLabel } from "../GameOS";
import InventoryReporterPages from "./InventoryReporterPages";
import { RECEIPT_HEADER, colones, fmtDateTime, numeroALetras } from "./receipt-format";

type Category = "bebidas" | "proteinas" | "creatinas" | "hidratantes" | "chicles";
type Product = {
  id: string;
  name: string;
  category: Category;
  image?: string;
  quantity: number;
  cameraQuantity?: number;
  warehouseQuantity?: number;
  price: number;
};

type SaleReceipt = {
  id: string;
  createdAt: string;
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number }>;
  total: number;
  paymentMethod: "cash" | "sinpe" | "mixed";
  cashAmount: number;
  sinpeAmount: number;
  staffName: string;
};

const CATEGORY_LABEL: Record<Category, string> = {
  bebidas: "Bebidas",
  proteinas: "Proteínas",
  creatinas: "Creatinas",
  hidratantes: "Hidratantes",
  chicles: "Chicles",
};

const PAYMENT_OPTIONS = [
  { id: "cash" as const, label: "Efectivo", icon: Banknote },
  { id: "sinpe" as const, label: "SINPE", icon: Smartphone },
  { id: "mixed" as const, label: "Mixto", icon: Split },
];

function money(value: number) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value);
}

function searchable(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export default function ReceptionStorefront({ mode }: { mode: "inventory" | "sales" }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { quantity: string; cameraQuantity: string; warehouseQuantity: string; price: string }>>({});
  const [cart, setCart] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<"all" | Category>("all");
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState<"all" | "available" | "low" | "out">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // Sin método por defecto: la recepción elige efectivo / SINPE / mixto en cada venta.
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "sinpe" | "mixed" | null>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [sinpeAmount, setSinpeAmount] = useState("");
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);

  // Preferencias del punto de venta (persisten en el navegador del mostrador).
  const [advanced, setAdvanced] = useState(false);
  const [posSize, setPosSize] = useState<"normal" | "grande">("normal");
  const [posContrast, setPosContrast] = useState<"normal" | "alto">("normal");
  const [justSold, setJustSold] = useState<{ total: number } | null>(null);
  const [topSellerIds, setTopSellerIds] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Igual que la facturación de recepción: apenas se genera el comprobante, se
  // abre solo el diálogo de impresión (impresora por defecto AON Printer).
  useEffect(() => {
    if (!receipt) return;
    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, [receipt]);

  useEffect(() => {
    if (mode !== "sales" || typeof window === "undefined") return;
    setAdvanced(window.localStorage.getItem("xtreme-pos-advanced") === "1");
    setPosSize(window.localStorage.getItem("xtreme-pos-size") === "grande" ? "grande" : "normal");
    setPosContrast(window.localStorage.getItem("xtreme-pos-contrast") === "alto" ? "alto" : "normal");
  }, [mode]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSheetOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/xtreme/reception/inventory", { cache: "no-store" });
      const json = (await res.json()) as { products?: Product[]; error?: string };
      if (!res.ok) throw new Error(json.error || "No se pudo cargar el inventario.");
      const next = json.products ?? [];
      setProducts(next);
      setDrafts(Object.fromEntries(next.map((p) => [p.id, {
        quantity: String(p.quantity),
        cameraQuantity: String(p.cameraQuantity ?? p.quantity),
        warehouseQuantity: String(p.warehouseQuantity ?? 0),
        price: String(p.price),
      }])));
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Error de conexión." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Los más vendidos: se calcula de las ventas de los últimos 30 días.
  useEffect(() => {
    if (mode !== "sales") return;
    let cancelled = false;
    void (async () => {
      try {
        const to = new Date();
        const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
        const params = new URLSearchParams({ dashboard: "1", from: from.toISOString(), to: to.toISOString() });
        const res = await fetch(`/api/xtreme/reception/inventory?${params}`, { cache: "no-store" });
        const json = (await res.json()) as { sales?: Array<{ items?: Array<{ productId: string; quantity: number }> }> };
        if (!res.ok || cancelled) return;
        const tally = new Map<string, number>();
        for (const sale of json.sales ?? []) {
          for (const item of sale.items ?? []) {
            tally.set(item.productId, (tally.get(item.productId) ?? 0) + item.quantity);
          }
        }
        setTopSellerIds([...tally.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id));
      } catch {
        /* sin tira si falla */
      }
    })();
    return () => { cancelled = true; };
  }, [mode]);

  const visible = useMemo(() => {
    const term = searchable(query);
    return products.filter((product) => {
      if (category !== "all" && product.category !== category) return false;
      if (stock === "available" && product.quantity <= 0) return false;
      if (stock === "low" && (product.quantity <= 0 || product.quantity > 2)) return false;
      if (stock === "out" && product.quantity > 0) return false;
      if (!term) return true;
      return searchable(`${product.name} ${product.id} ${CATEGORY_LABEL[product.category]}`).includes(term);
    });
  }, [category, products, query, stock]);
  const cartLines = products.filter((p) => (cart[p.id] ?? 0) > 0);
  const cartUnits = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const total = useMemo(() => cartLines.reduce((sum, p) => sum + p.price * (cart[p.id] ?? 0), 0), [cart, cartLines]);

  const topSellers = useMemo(() => {
    if (mode !== "sales") return [] as Product[];
    const inStock = products.filter((p) => p.quantity > 0);
    const byId = new Map(inStock.map((p) => [p.id, p]));
    const picked: Product[] = [];
    for (const id of topSellerIds) {
      const product = byId.get(id);
      if (product && !picked.includes(product)) picked.push(product);
      if (picked.length >= 6) break;
    }
    if (picked.length < 6) {
      for (const product of [...inStock].sort((a, b) => b.quantity - a.quantity)) {
        if (picked.includes(product)) continue;
        picked.push(product);
        if (picked.length >= 6) break;
      }
    }
    return picked;
  }, [mode, products, topSellerIds]);

  const payment = useMemo(() => {
    if (paymentMethod === "cash") return { method: paymentMethod, cashAmount: total, sinpeAmount: 0 };
    if (paymentMethod === "sinpe") return { method: paymentMethod, cashAmount: 0, sinpeAmount: total };
    if (paymentMethod === "mixed") return { method: paymentMethod, cashAmount: Math.max(0, Number(cashAmount) || 0), sinpeAmount: Math.max(0, Number(sinpeAmount) || 0) };
    return { method: null, cashAmount: 0, sinpeAmount: 0 };
  }, [cashAmount, paymentMethod, sinpeAmount, total]);
  const paymentDifference = total - payment.cashAmount - payment.sinpeAmount;
  const paymentReady = total > 0 && paymentMethod !== null && paymentDifference === 0 && (paymentMethod !== "mixed" || (payment.cashAmount > 0 && payment.sinpeAmount > 0));

  function persistAdvanced(next: boolean) {
    setAdvanced(next);
    window.localStorage.setItem("xtreme-pos-advanced", next ? "1" : "0");
  }
  function persistPosSize(next: "normal" | "grande") {
    setPosSize(next);
    window.localStorage.setItem("xtreme-pos-size", next);
  }
  function persistPosContrast(next: "normal" | "alto") {
    setPosContrast(next);
    window.localStorage.setItem("xtreme-pos-contrast", next);
  }

  async function saveProduct(product: Product) {
    const draft = drafts[product.id];
    setBusy(product.id);
    setMessage(null);
    try {
      const res = await fetch("/api/xtreme/reception/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          cameraQuantity: Number(draft?.cameraQuantity ?? 0),
          warehouseQuantity: Number(draft?.warehouseQuantity ?? 0),
          price: Number(draft?.price ?? 0),
        }),
      });
      const json = (await res.json()) as { product?: Product; error?: string };
      if (!res.ok || !json.product) throw new Error(json.error || "No se pudo guardar.");
      setProducts((current) => current.map((item) => item.id === product.id ? json.product! : item));
      setDrafts((current) => ({ ...current, [product.id]: {
        quantity: String(json.product!.quantity),
        cameraQuantity: String(json.product!.cameraQuantity ?? json.product!.quantity),
        warehouseQuantity: String(json.product!.warehouseQuantity ?? 0),
        price: String(json.product!.price),
      } }));
      setMessage({ tone: "ok", text: `${product.name} actualizado.` });
      window.dispatchEvent(new Event("xtreme:storefront-updated"));
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "No se pudo guardar." });
    } finally {
      setBusy("");
    }
  }

  function changeCart(product: Product, delta: number) {
    setCart((current) => {
      const next = Math.max(0, Math.min(product.quantity, (current[product.id] ?? 0) + delta));
      return { ...current, [product.id]: next };
    });
  }

  async function completeSale() {
    if (!cartUnits) return;
    setBusy("sale");
    setMessage(null);
    try {
      const res = await fetch("/api/xtreme/reception/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartLines.map((p) => ({ productId: p.id, quantity: cart[p.id] })),
          payment,
        }),
      });
      const json = (await res.json()) as { products?: Product[]; sale?: SaleReceipt; staffName?: string; error?: string };
      if (!res.ok || !json.products) throw new Error(json.error || "No se pudo registrar la venta.");
      const soldTotal = json.sale?.total ?? total;
      setProducts(json.products);
      setCart({});
      setCashAmount("");
      setSinpeAmount("");
      setPaymentMethod(null);
      setSheetOpen(false);
      if (json.sale) {
        setReceipt({
          id: json.sale.id,
          createdAt: json.sale.createdAt,
          items: json.sale.items,
          total: json.sale.total,
          paymentMethod: json.sale.paymentMethod,
          cashAmount: json.sale.cashAmount,
          sinpeAmount: json.sale.sinpeAmount,
          staffName: json.staffName || "Recepción",
        });
      }
      setJustSold({ total: soldTotal });
      window.setTimeout(() => setJustSold(null), 2600);
      window.dispatchEvent(new Event("xtreme:storefront-updated"));
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "No se pudo registrar la venta." });
    } finally {
      setBusy("");
    }
  }

  if (loading) return <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#d8ff3e]" /></div>;

  const cartContent = (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      {receipt && (
        <div className="border-[3px] border-white/15 bg-white/[.025] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#d8ff3e]">Comprobante · {money(receipt.total)}</p>
            <button type="button" onClick={() => setReceipt(null)} aria-label="Ocultar comprobante" className="grid h-8 w-8 place-items-center text-white/35 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-1 text-xs font-bold text-white/45">{receipt.items.reduce((sum, item) => sum + item.quantity, 0)} unidad(es) · {fmtDateTime(receipt.createdAt).time}</p>
          <button type="button" onClick={() => window.print()} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 border-[3px] border-[#d8ff3e] text-xs font-black uppercase text-[#d8ff3e]"><Printer className="h-4 w-4" /> Reimprimir</button>
        </div>
      )}

      <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">Carrito · {cartUnits} unidad{cartUnits === 1 ? "" : "es"}</p>
            <p className="mt-1 text-[length:var(--pos-total)] font-black leading-none text-[#d8ff3e]">{money(total)}</p>
          </div>
          {cartUnits > 0 && (
            <button type="button" onClick={() => setCart({})} className="inline-flex min-h-10 items-center gap-2 border-2 border-white/15 px-3 text-[10px] font-black uppercase text-white/45 hover:border-red-300/50 hover:text-red-200">
              <Trash2 className="h-4 w-4" /> Vaciar
            </button>
          )}
        </div>
        {cartLines.length > 0 ? (
          <div className="mt-3 max-h-52 space-y-1.5 overflow-y-auto border-t border-white/10 pt-2 lg:max-h-none lg:flex-1">
            {cartLines.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3 text-sm font-bold text-white/60">
                <span className="truncate"><span className="font-black text-white">{cart[product.id]} ×</span> {product.name}</span>
                <span className="shrink-0 font-black text-white">{money(product.price * (cart[product.id] ?? 0))}</span>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm font-bold text-white/35">Tocá un producto para empezar la venta.</p>}
      </div>

      <div className="mt-auto border-t-[3px] border-white/10 pt-4">
        {(() => {
          const pendingMethod = cartUnits > 0 && !paymentMethod;
          return (
            <>
              <p className={`text-[10px] font-black uppercase tracking-[.18em] ${pendingMethod ? "text-[#d8ff3e]" : "text-white/40"}`}>¿Cómo pagó?{pendingMethod ? " · elegí uno" : ""}</p>
              <div className={`mt-2 grid grid-cols-3 gap-2 ${pendingMethod ? "outline outline-2 outline-offset-4 outline-[#d8ff3e]/40" : ""}`}>
                {PAYMENT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = paymentMethod === option.id;
                  return (
                    <button key={option.id} type="button" aria-pressed={active} onClick={() => setPaymentMethod(option.id)} className={`flex min-h-12 flex-col items-center justify-center gap-1 border-2 px-2 text-[10px] font-black uppercase ${active ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/15 text-white/45 hover:border-white/30"}`}>
                      <Icon className="h-4 w-4" /> {option.label}
                    </button>
                  );
                })}
              </div>
            </>
          );
        })()}

        {paymentMethod === "mixed" && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[9px] font-black uppercase tracking-wide text-white/40">Efectivo ₡
                <input type="number" min="0" step="100" inputMode="numeric" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} placeholder="0" className="mt-1 min-h-12 w-full border-[3px] border-white/15 bg-black px-3 text-lg font-black outline-none focus:border-[#d8ff3e]" />
              </label>
              <label className="text-[9px] font-black uppercase tracking-wide text-white/40">SINPE ₡
                <input type="number" min="0" step="100" inputMode="numeric" value={sinpeAmount} onChange={(event) => setSinpeAmount(event.target.value)} placeholder="0" className="mt-1 min-h-12 w-full border-[3px] border-white/15 bg-black px-3 text-lg font-black outline-none focus:border-[#d8ff3e]" />
              </label>
              <button type="button" disabled={!total} onClick={() => setSinpeAmount(String(Math.max(0, total - (Number(cashAmount) || 0))))} className="col-span-2 min-h-9 border-2 border-white/15 text-[10px] font-black uppercase text-white/50 disabled:opacity-30">Completar saldo con SINPE</button>
            </div>
            <div className={`mt-3 flex items-center justify-between border-2 px-3 py-2 text-xs font-black ${paymentReady ? "border-[#d8ff3e]/35 bg-[#d8ff3e]/5 text-[#d8ff3e]" : paymentDifference < 0 ? "border-red-400/40 bg-red-500/10 text-red-200" : "border-orange-300/35 bg-orange-400/[0.07] text-orange-200"}`}>
              <span>{paymentReady ? "Pago completo" : paymentDifference < 0 ? "Monto excedido" : "Falta por asignar"}</span>
              <span>{money(Math.abs(paymentDifference))}</span>
            </div>
          </>
        )}

        <button type="button" disabled={!cartUnits || !paymentReady || busy === "sale"} onClick={() => void completeSale()} className="mt-3 flex min-h-20 w-full items-center justify-center gap-3 border-[3px] border-black/30 bg-[#d8ff3e] px-6 text-[length:var(--pos-cobrar)] font-black uppercase tracking-tight text-black shadow-[6px_6px_0_rgba(216,255,62,.25)] disabled:opacity-35 disabled:shadow-none">
          {busy === "sale" ? <Loader2 className="h-7 w-7 animate-spin" /> : <Check className="h-7 w-7" />} {cartUnits > 0 && !paymentMethod ? "Elegí cómo pagó" : `Cobrar ${money(total)}`}
        </button>
      </div>
    </div>
  );

  return (
    <div className={mode === "sales" ? "xg-pos relative" : undefined} data-size={posSize} data-contrast={posContrast}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <GameLabel tone={mode === "inventory" ? "cyan" : "lime"}>{mode === "inventory" ? "Control de existencias" : "Punto de venta"}</GameLabel>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">{mode === "inventory" ? "Inventario" : "Nueva venta"}</h2>
          <p className="mt-2 text-sm font-bold text-white/45">{mode === "inventory" ? "Definí existencias y precio de venta para cada producto." : "Tocá el producto para sumarlo y cobrá."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === "sales" && <GameChip tone="lime">{cartUnits} producto{cartUnits === 1 ? "" : "s"}</GameChip>}
          {mode === "sales" && <PosToggle active={advanced} onClick={() => persistAdvanced(!advanced)} icon={SlidersHorizontal} label="Avanzado" />}
          {mode === "sales" && <PosToggle active={posSize === "grande"} onClick={() => persistPosSize(posSize === "grande" ? "normal" : "grande")} icon={ALargeSmall} label="Texto grande" />}
          {mode === "sales" && <PosToggle active={posContrast === "alto"} onClick={() => persistPosContrast(posContrast === "alto" ? "normal" : "alto")} icon={Contrast} label="Alto contraste" />}
          {mode === "inventory" && <a href="/api/xtreme/reception/inventory/export" className="inline-flex min-h-11 items-center gap-2 border-[3px] border-[#d8ff3e] bg-[#d8ff3e] px-4 text-xs font-black uppercase text-black"><Download className="h-4 w-4" /> Descargar Excel</a>}
        </div>
      </div>

      {message && <div className={`mt-4 border-[3px] px-4 py-3 text-sm font-black ${message.tone === "ok" ? "border-[#d8ff3e]/60 bg-[#d8ff3e]/10 text-[#d8ff3e]" : "border-red-400/60 bg-red-500/10 text-red-200"}`}>{message.text}</div>}

      {mode === "inventory" && <InventoryReporterPages />}

      {mode === "sales" && topSellers.length > 0 && (
        <section className="mt-5">
          <GameLabel tone="lime" className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5" /> Los más vendidos</GameLabel>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {topSellers.map((product) => {
              const selected = cart[product.id] ?? 0;
              return (
                <button key={product.id} type="button" onClick={() => changeCart(product, 1)} className={`relative flex flex-col items-center gap-1.5 border-[3px] p-2 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8ff3e] ${selected > 0 ? "border-[#d8ff3e] bg-[#d8ff3e]/10" : "border-white/15 bg-black/45 hover:border-white/35"}`}>
                  {selected > 0 && <span className="absolute -right-2 -top-2 grid h-6 min-w-6 place-items-center border-[3px] border-black bg-[#d8ff3e] px-1 text-xs font-black text-black">{selected}</span>}
                  <span className="grid h-14 w-14 place-items-center overflow-hidden bg-white/[0.06]">
                    {product.image ? <Image src={product.image} alt="" width={56} height={56} sizes="56px" className="h-full w-full object-cover" /> : <PackageOpen className="h-6 w-6 text-white/20" />}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-black uppercase leading-tight">{product.name}</span>
                  <span className="text-xs font-black text-[#d8ff3e]">{money(product.price)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {(mode === "inventory" || advanced) && (
        <section className="mt-5 border-[3px] border-white/15 bg-black/30 p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Buscar productos</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" autoComplete="off" placeholder="Buscar por producto, categoría o código" className="min-h-14 w-full border-[3px] border-white/20 bg-[#050505] pl-12 pr-12 text-base font-black outline-none placeholder:text-white/25 focus:border-[#d8ff3e]" />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-white/35 hover:text-white"><X className="h-4 w-4" /></button>}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {([{"id":"all","label":"Todos"},{"id":"available","label":"Disponibles"},{"id":"low","label":"Pocos"},{"id":"out","label":"Agotados"}] as const).map((item) => <button key={item.id} type="button" onClick={() => setStock(item.id)} className={`min-h-11 border-2 px-2 text-[9px] font-black uppercase sm:text-[10px] ${stock === item.id ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/15 text-white/45 hover:text-white"}`}>{item.label}</button>)}
            </div>
          </div>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[.15em] text-white/35">{visible.length} de {products.length} productos</p>
        </section>
      )}

      <div className="xg-mobile-scroll mt-5 flex gap-2 overflow-x-auto pb-1">
        {(["all", "bebidas", "proteinas", "creatinas", "hidratantes", "chicles"] as const).map((id) => (
          <button key={id} type="button" onClick={() => setCategory(id)} className={`min-h-10 shrink-0 border-[3px] px-3 text-xs font-black uppercase ${category === id ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/15 text-white/55"}`}>
            {id === "all" ? "Todo" : CATEGORY_LABEL[id]}
          </button>
        ))}
      </div>

      <div className={mode === "sales" ? `mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:pb-0 ${cartUnits > 0 ? "pb-44" : "pb-8"}` : ""}>
      <div className={`grid gap-3 ${mode === "sales" ? "content-start sm:grid-cols-2 xl:grid-cols-3" : "mt-5 sm:grid-cols-2"}`}>
        {visible.map((product) => {
          const selected = cart[product.id] ?? 0;

          if (mode === "inventory") {
            return (
              <article key={product.id} className="overflow-hidden border-[3px] border-white/15 bg-black/45">
                <div className="flex min-h-36 gap-4 p-3">
                  <div className="grid h-32 w-24 shrink-0 place-items-center overflow-hidden bg-white/[0.06]">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        width={96}
                        height={128}
                        sizes="96px"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <PackageOpen className="h-9 w-9 text-white/20" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 py-1">
                    <GameChip tone={product.quantity <= 2 ? "orange" : "cyan"}>{CATEGORY_LABEL[product.category]}</GameChip>
                    <h3 className="mt-2 text-base font-black uppercase leading-tight">{product.name}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t-[3px] border-white/10 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <>
                    <label className="text-[9px] font-black uppercase tracking-wide text-white/40">Cámara
                      <input type="number" min="0" step="1" value={drafts[product.id]?.cameraQuantity ?? "0"} onChange={(e) => setDrafts((d) => ({ ...d, [product.id]: { ...d[product.id], cameraQuantity: e.target.value } }))} className="mt-1 min-h-11 w-full border-[3px] border-white/15 bg-black px-2 text-base font-black outline-none focus:border-[#d8ff3e]" />
                    </label>
                    <label className="text-[9px] font-black uppercase tracking-wide text-white/40">Bodega
                      <input type="number" min="0" step="1" value={drafts[product.id]?.warehouseQuantity ?? "0"} onChange={(e) => setDrafts((d) => ({ ...d, [product.id]: { ...d[product.id], warehouseQuantity: e.target.value } }))} className="mt-1 min-h-11 w-full border-[3px] border-white/15 bg-black px-2 text-base font-black outline-none focus:border-[#d8ff3e]" />
                    </label>
                  </>
                  <label className="text-[9px] font-black uppercase tracking-wide text-white/40">Precio ₡
                    <input type="number" min="0" step="100" value={drafts[product.id]?.price ?? "0"} onChange={(e) => setDrafts((d) => ({ ...d, [product.id]: { ...d[product.id], price: e.target.value } }))} className="mt-1 min-h-11 w-full border-[3px] border-white/15 bg-black px-2 text-base font-black outline-none focus:border-[#d8ff3e]" />
                  </label>
                  <button type="button" aria-label={`Guardar ${product.name}`} disabled={Boolean(busy)} onClick={() => void saveProduct(product)} className="mt-[13px] grid h-11 w-11 place-items-center border-[3px] border-[#d8ff3e] bg-[#d8ff3e] text-black disabled:opacity-40">{busy === product.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}</button>
                  {(() => {
                    const totalUnits = Math.max(0, Number(drafts[product.id]?.cameraQuantity ?? 0)) + Math.max(0, Number(drafts[product.id]?.warehouseQuantity ?? 0));
                    return <p className="col-span-2 text-right text-xs font-black uppercase text-white/45 sm:col-span-4">Total: <span className="text-[#d8ff3e]">{totalUnits}</span></p>;
                  })()}
                </div>
              </article>
            );
          }

          const soldOut = product.quantity <= 0;
          return (
            <div key={product.id} className={`relative flex flex-col overflow-hidden border-[3px] transition ${soldOut ? "border-white/10 opacity-40" : selected > 0 ? "border-[#d8ff3e] bg-[#d8ff3e]/[0.08]" : "border-white/15 bg-black/45 hover:border-white/35"}`}>
              <button
                type="button"
                disabled={soldOut}
                aria-label={`Agregar ${product.name}`}
                onClick={() => changeCart(product, 1)}
                className="absolute inset-0 z-0 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#d8ff3e]"
              />
              <div className="pointer-events-none relative z-10 flex min-h-32 gap-4 p-3">
                {selected > 0 && <span className="absolute right-2 top-2 grid h-7 min-w-7 place-items-center border-[3px] border-black bg-[#d8ff3e] px-1 text-sm font-black text-black">{selected}</span>}
                <div className="grid h-28 w-20 shrink-0 place-items-center overflow-hidden bg-white/[0.06]">
                  {product.image ? (
                    <Image src={product.image} alt={product.name} width={96} height={128} sizes="96px" className="h-full w-full object-cover" />
                  ) : (
                    <PackageOpen className="h-9 w-9 text-white/20" />
                  )}
                </div>
                <div className="min-w-0 flex-1 py-1">
                  <GameChip tone={soldOut || product.quantity <= 2 ? "orange" : "cyan"}>{soldOut ? "Agotado" : CATEGORY_LABEL[product.category]}</GameChip>
                  <h3 className="mt-2 text-[length:var(--pos-name)] font-black uppercase leading-tight">{product.name}</h3>
                  <p className="mt-2 text-[length:var(--pos-price)] font-black text-[#d8ff3e]">{money(product.price)}</p>
                  {!soldOut && <p className="mt-1 text-xs font-bold text-white/40">{product.quantity} disponibles</p>}
                </div>
              </div>

              {selected > 0 && (
                <div className="relative z-10 flex items-center justify-between border-t-[3px] border-[#d8ff3e]/30 bg-black/45 p-3">
                  <button type="button" aria-label={`Quitar una unidad de ${product.name}`} onClick={() => changeCart(product, -1)} className="grid h-12 w-12 place-items-center border-[3px] border-white/20 hover:border-white/40"><Minus className="h-5 w-5" /></button>
                  <span className="text-[length:var(--pos-step)] font-black">{selected}</span>
                  <button type="button" aria-label={`Agregar una unidad de ${product.name}`} disabled={selected >= product.quantity} onClick={() => changeCart(product, 1)} className="grid h-12 w-12 place-items-center border-[3px] border-[#d8ff3e] bg-[#d8ff3e] text-black disabled:border-white/15 disabled:bg-white/5 disabled:text-white/20"><Plus className="h-5 w-5" /></button>
                </div>
              )}
            </div>
          );
        })}
        {!visible.length && <div className="border-[3px] border-dashed border-white/15 p-8 text-center sm:col-span-2 xl:col-span-3"><Search className="mx-auto h-8 w-8 text-white/20" /><p className="mt-3 text-sm font-black uppercase text-white/45">No hay productos que coincidan</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); setStock("all"); }} className="mt-4 min-h-10 border-2 border-[#d8ff3e]/50 px-4 text-xs font-black uppercase text-[#d8ff3e]">Limpiar filtros</button></div>}
      </div>

      {mode === "sales" && (
        <aside className="hidden border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-4 shadow-[6px_6px_0_rgba(216,255,62,.18)] sm:p-5 lg:sticky lg:top-4 lg:flex lg:max-h-[calc(100vh-2rem)] lg:flex-col">
          {cartContent}
        </aside>
      )}
      </div>

      {mode === "sales" && cartUnits > 0 && (
        <div className="lg:hidden">
          {sheetOpen && <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setSheetOpen(false)} aria-hidden="true" />}
          {sheetOpen && (
            <div role="dialog" aria-label="Carrito y cobro" className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto border-t-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">Carrito</p>
                <button type="button" onClick={() => setSheetOpen(false)} aria-label="Cerrar carrito" className="grid h-9 w-9 place-items-center border-[3px] border-white/15 text-white/45"><X className="h-5 w-5" /></button>
              </div>
              {cartContent}
            </div>
          )}
          <div className="fixed inset-x-0 bottom-0 z-30 flex items-stretch gap-2 border-t-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-2">
            <button type="button" onClick={() => setSheetOpen(true)} aria-label="Ver carrito" className="flex shrink-0 flex-col items-start justify-center border-[3px] border-white/20 px-3">
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-white/45"><ShoppingCart className="h-3 w-3" /> {cartUnits} u <ChevronUp className="h-3 w-3" /></span>
              <span className="text-xl font-black leading-none text-[#d8ff3e]">{money(total)}</span>
            </button>
            <button type="button" disabled={busy === "sale"} onClick={() => { if (!paymentReady) { setSheetOpen(true); return; } void completeSale(); }} className="flex flex-1 items-center justify-center gap-2 border-[3px] border-black/30 bg-[#d8ff3e] text-[length:var(--pos-cobrar)] font-black uppercase tracking-tight text-black disabled:opacity-40">
              {busy === "sale" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6" />} {paymentReady ? `Cobrar ${money(total)}` : "Elegí cómo pagó"}
            </button>
          </div>
        </div>
      )}

      {mode === "sales" && receipt && (
        <div className="pointer-events-none absolute left-[-9999px] top-0" aria-hidden="true">
          <ProductSaleReceipt receipt={receipt} />
        </div>
      )}

      {mode === "sales" && justSold && (
        <div role="status" className="fixed inset-0 z-[60] grid place-items-center bg-[#050505]/97 p-6 text-center">
          <div>
            <CheckCircle2 className="mx-auto h-16 w-16 text-[#d8ff3e]" />
            <p className="mt-4 text-2xl font-black uppercase tracking-tight">Venta registrada</p>
            <p className="mt-1 text-4xl font-black text-[#d8ff3e] sm:text-5xl">{money(justSold.total)}</p>
            <p className="mt-2 text-sm font-bold text-white/45">Inventario descontado</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PosToggle({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} title={label} className={`inline-flex min-h-11 items-center gap-1.5 border-[3px] px-3 text-[10px] font-black uppercase tracking-wide transition ${active ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/20 text-white/55 hover:border-white/40 hover:text-white"}`}>
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// Comprobante térmico de la venta de inventario. Mismo formato que la
// facturación de recepción (AON Printer, 72 mm), pero con varias líneas de
// producto y sin campos fiscales de Latinsoft (es un comprobante interno).
function ProductSaleReceipt({ receipt }: { receipt: SaleReceipt }) {
  const total = receipt.total;
  const units = receipt.items.reduce((sum, item) => sum + item.quantity, 0);
  const emitido = fmtDateTime(receipt.createdAt);
  const enLetras = `${numeroALetras(total)} CON 00/100`;
  const payments = [
    { label: "Efectivo", value: receipt.cashAmount },
    { label: "SINPE", value: receipt.sinpeAmount },
  ].filter((line) => line.value > 0);

  return (
    <div className="thermal-receipt mx-auto mt-3 max-w-[280px] border border-black bg-white px-3 py-3 font-serif text-[11px] leading-[1.35] text-black">
      <div className="text-center">
        <p className="font-bold">{RECEIPT_HEADER.name1}</p>
        <p className="font-bold">{RECEIPT_HEADER.name2}</p>
        <p>{RECEIPT_HEADER.address}</p>
        <p>{RECEIPT_HEADER.legalId}</p>
        {RECEIPT_HEADER.emails.map((mail) => <p key={mail}>{mail}</p>)}
      </div>

      <p className="mt-3"><span className="font-bold">Fecha:</span> {emitido.date} <span className="font-bold">Hora:</span> {emitido.time}</p>

      <div className="mt-3">
        <p><span className="font-bold">Cajero:</span> {receipt.staffName}</p>
        <p className="font-bold">N° Comprobante:</p>
        <p className="break-all">{receipt.id}</p>
      </div>

      <table className="mt-3 w-full border-collapse">
        <thead><tr className="border-y border-black text-left font-bold">
          <th className="py-0.5 pr-1">Cant</th><th className="py-0.5 pr-1">Descripcion</th><th className="py-0.5 text-right">Precio</th>
        </tr></thead>
        <tbody>
          {receipt.items.map((item) => (
            <tr key={item.productId} className="align-top">
              <td className="py-1 pr-1">{item.quantity}</td>
              <td className="py-1 pr-1">{item.name}</td>
              <td className="whitespace-nowrap py-1 text-right">{colones(item.unitPrice * item.quantity)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-black text-[13px] font-bold">
            <td className="py-1 pr-1">{units}</td>
            <td className="py-1 pr-1">TOTAL</td>
            <td className="whitespace-nowrap py-1 text-right">{colones(total)}</td>
          </tr>
        </tbody>
      </table>

      <table className="mt-3 w-full border-collapse">
        <thead><tr className="border-y border-black text-left font-bold">
          <th className="py-0.5">Tipo Documento</th><th className="py-0.5 text-right">Monto</th>
        </tr></thead>
        <tbody>{payments.map((line) => <tr key={line.label} className="border-b border-black">
          <td className="py-0.5">--&nbsp;&nbsp;{line.label}</td>
          <td className="whitespace-nowrap py-0.5 text-right">{colones(line.value)}</td>
        </tr>)}</tbody>
      </table>

      <p className="mt-2">{enLetras}</p>

      <p className="mt-3 text-center font-bold">¡Gracias por elegirnos, vuelva pronto!</p>
      <p className="mt-2 text-center text-[9px] text-black/60">Comprobante interno · la factura fiscal se emite en Latinsoft</p>
    </div>
  );
}
