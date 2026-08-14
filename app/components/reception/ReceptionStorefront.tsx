"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, Check, Download, Loader2, Minus, PackageOpen, Plus, Save, Search, Smartphone, Split, ShoppingCart, Trash2, X } from "lucide-react";
import { GameChip, GameLabel } from "../GameOS";
import InventoryReporterPages from "./InventoryReporterPages";

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

const CATEGORY_LABEL: Record<Category, string> = {
  bebidas: "Bebidas",
  proteinas: "Proteínas",
  creatinas: "Creatinas",
  hidratantes: "Hidratantes",
  chicles: "Chicles",
};

function money(value: number) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value);
}

function searchable(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "sinpe" | "mixed">("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [sinpeAmount, setSinpeAmount] = useState("");

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
  const payment = useMemo(() => {
    if (paymentMethod === "cash") return { method: paymentMethod, cashAmount: total, sinpeAmount: 0 };
    if (paymentMethod === "sinpe") return { method: paymentMethod, cashAmount: 0, sinpeAmount: total };
    return { method: paymentMethod, cashAmount: Math.max(0, Number(cashAmount) || 0), sinpeAmount: Math.max(0, Number(sinpeAmount) || 0) };
  }, [cashAmount, paymentMethod, sinpeAmount, total]);
  const paymentDifference = total - payment.cashAmount - payment.sinpeAmount;
  const paymentReady = total > 0 && paymentDifference === 0 && (paymentMethod !== "mixed" || (payment.cashAmount > 0 && payment.sinpeAmount > 0));

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
      const json = (await res.json()) as { products?: Product[]; sale?: { total: number }; error?: string };
      if (!res.ok || !json.products) throw new Error(json.error || "No se pudo registrar la venta.");
      setProducts(json.products);
      setCart({});
      setCashAmount("");
      setSinpeAmount("");
      setPaymentMethod("cash");
      const paymentLabel = payment.method === "cash" ? "efectivo" : payment.method === "sinpe" ? "SINPE" : `pago mixto (${money(payment.cashAmount)} efectivo + ${money(payment.sinpeAmount)} SINPE)`;
      setMessage({ tone: "ok", text: `Venta registrada por ${money(json.sale?.total ?? total)} en ${paymentLabel}. Inventario descontado.` });
      window.dispatchEvent(new Event("xtreme:storefront-updated"));
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "No se pudo registrar la venta." });
    } finally {
      setBusy("");
    }
  }

  if (loading) return <div className="grid min-h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#d8ff3e]" /></div>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <GameLabel tone={mode === "inventory" ? "cyan" : "lime"}>{mode === "inventory" ? "Control de existencias" : "Punto de venta"}</GameLabel>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">{mode === "inventory" ? "Inventario" : "Nueva venta"}</h2>
          <p className="mt-2 text-sm font-bold text-white/45">{mode === "inventory" ? "Definí existencias y precio de venta para cada producto." : "Agregá productos y confirmá para descontarlos del inventario."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === "sales" && <GameChip tone="lime">{cartUnits} producto{cartUnits === 1 ? "" : "s"}</GameChip>}
          {mode === "inventory" && <a href="/api/xtreme/reception/inventory/export" className="inline-flex min-h-11 items-center gap-2 border-[3px] border-[#d8ff3e] bg-[#d8ff3e] px-4 text-xs font-black uppercase text-black"><Download className="h-4 w-4" /> Descargar Excel</a>}
        </div>
      </div>

      {message && <div className={`mt-4 border-[3px] px-4 py-3 text-sm font-black ${message.tone === "ok" ? "border-[#d8ff3e]/60 bg-[#d8ff3e]/10 text-[#d8ff3e]" : "border-red-400/60 bg-red-500/10 text-red-200"}`}>{message.text}</div>}

      {mode === "inventory" && <InventoryReporterPages />}

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

      <div className="xg-mobile-scroll mt-5 flex gap-2 overflow-x-auto pb-1">
        {(["all", "bebidas", "proteinas", "creatinas", "hidratantes", "chicles"] as const).map((id) => (
          <button key={id} type="button" onClick={() => setCategory(id)} className={`min-h-10 shrink-0 border-[3px] px-3 text-xs font-black uppercase ${category === id ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/15 text-white/55"}`}>
            {id === "all" ? "Todo" : CATEGORY_LABEL[id]}
          </button>
        ))}
      </div>

      <div className={mode === "sales" ? "mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]" : ""}>
      <div className={`grid gap-3 ${mode === "sales" ? "sm:grid-cols-2 xl:grid-cols-2" : "mt-5 sm:grid-cols-2"}`}>
        {visible.map((product) => {
          const selected = cart[product.id] ?? 0;
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
                  {mode === "sales" && <><p className="mt-3 text-xl font-black text-[#d8ff3e]">{money(product.price)}</p><p className="mt-1 text-xs font-bold text-white/40">{product.quantity} disponibles</p></>}
                </div>
              </div>

              {mode === "inventory" ? (
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
              ) : (
                <div className="flex items-center justify-between border-t-[3px] border-white/10 p-3">
                  <button type="button" disabled={!selected} onClick={() => changeCart(product, -1)} className="grid h-11 w-11 place-items-center border-[3px] border-white/20 disabled:opacity-25"><Minus className="h-5 w-5" /></button>
                  <span className="text-2xl font-black">{selected}</span>
                  <button type="button" disabled={selected >= product.quantity || product.quantity <= 0} onClick={() => changeCart(product, 1)} className="grid h-11 w-11 place-items-center border-[3px] border-[#d8ff3e] bg-[#d8ff3e] text-black disabled:border-white/15 disabled:bg-white/5 disabled:text-white/20"><Plus className="h-5 w-5" /></button>
                </div>
              )}
            </article>
          );
        })}
        {!visible.length && <div className="border-[3px] border-dashed border-white/15 p-8 text-center sm:col-span-2"><Search className="mx-auto h-8 w-8 text-white/20" /><p className="mt-3 text-sm font-black uppercase text-white/45">No hay productos que coincidan</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); setStock("all"); }} className="mt-4 min-h-10 border-2 border-[#d8ff3e]/50 px-4 text-xs font-black uppercase text-[#d8ff3e]">Limpiar filtros</button></div>}
      </div>

      {mode === "sales" && (
        <aside className="border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-4 shadow-[6px_6px_0_rgba(216,255,62,.18)] sm:p-5 lg:sticky lg:top-4">
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">Carrito · {cartUnits} unidad{cartUnits === 1 ? "" : "es"}</p>
                  <p className="mt-1 text-3xl font-black text-[#d8ff3e]">{money(total)}</p>
                </div>
                {cartUnits > 0 && (
                  <button type="button" onClick={() => setCart({})} className="inline-flex min-h-10 items-center gap-2 border-2 border-white/15 px-3 text-[10px] font-black uppercase text-white/45 hover:border-red-300/50 hover:text-red-200">
                    <Trash2 className="h-4 w-4" /> Vaciar
                  </button>
                )}
              </div>
              {cartLines.length > 0 ? (
                <div className="mt-3 max-h-32 space-y-1 overflow-y-auto border-t border-white/10 pt-2">
                  {cartLines.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3 text-xs font-bold text-white/60">
                      <span className="truncate">{cart[product.id]} × {product.name}</span>
                      <span className="shrink-0 font-black text-white">{money(product.price * (cart[product.id] ?? 0))}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-3 text-sm font-bold text-white/35">Elegí un producto para comenzar la venta.</p>}
            </div>

            <div className="border-t-[3px] border-white/10 pt-4">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/40">¿Cómo pagó?</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([
                  { id: "cash" as const, label: "Efectivo", icon: Banknote },
                  { id: "sinpe" as const, label: "SINPE", icon: Smartphone },
                  { id: "mixed" as const, label: "Mixto", icon: Split },
                ]).map((option) => {
                  const Icon = option.icon;
                  const active = paymentMethod === option.id;
                  return (
                    <button key={option.id} type="button" onClick={() => setPaymentMethod(option.id)} className={`flex min-h-14 flex-col items-center justify-center gap-1 border-[3px] px-2 text-[10px] font-black uppercase ${active ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/15 text-white/50 hover:border-white/35"}`}>
                      <Icon className="h-5 w-5" /> {option.label}
                    </button>
                  );
                })}
              </div>

              {paymentMethod === "mixed" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-[9px] font-black uppercase tracking-wide text-white/40">Efectivo ₡
                    <input type="number" min="0" step="100" inputMode="numeric" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} placeholder="0" className="mt-1 min-h-12 w-full border-[3px] border-white/15 bg-black px-3 text-lg font-black outline-none focus:border-[#d8ff3e]" />
                  </label>
                  <label className="text-[9px] font-black uppercase tracking-wide text-white/40">SINPE ₡
                    <input type="number" min="0" step="100" inputMode="numeric" value={sinpeAmount} onChange={(event) => setSinpeAmount(event.target.value)} placeholder="0" className="mt-1 min-h-12 w-full border-[3px] border-white/15 bg-black px-3 text-lg font-black outline-none focus:border-[#d8ff3e]" />
                  </label>
                  <button type="button" disabled={!total} onClick={() => setSinpeAmount(String(Math.max(0, total - (Number(cashAmount) || 0))))} className="col-span-2 min-h-9 border-2 border-white/15 text-[10px] font-black uppercase text-white/50 disabled:opacity-30">Completar saldo con SINPE</button>
                </div>
              )}

              <div className={`mt-3 flex items-center justify-between border-2 px-3 py-2 text-xs font-black ${paymentReady ? "border-[#d8ff3e]/35 bg-[#d8ff3e]/5 text-[#d8ff3e]" : paymentDifference < 0 ? "border-red-400/40 bg-red-500/10 text-red-200" : "border-orange-300/35 bg-orange-400/[0.07] text-orange-200"}`}>
                <span>{paymentReady ? "Pago completo" : paymentDifference < 0 ? "Monto excedido" : "Falta por asignar"}</span>
                <span>{money(Math.abs(paymentDifference))}</span>
              </div>

              <button type="button" disabled={!cartUnits || !paymentReady || busy === "sale"} onClick={() => void completeSale()} className="mt-3 inline-flex min-h-14 w-full items-center justify-center gap-2 border-[3px] border-black/30 bg-[#d8ff3e] px-6 text-sm font-black uppercase text-black disabled:opacity-35">
                {busy === "sale" ? <Loader2 className="h-5 w-5 animate-spin" /> : cartUnits ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />} Cobrar {money(total)}
              </button>
            </div>
          </div>
        </aside>
      )}
      </div>
    </div>
  );
}
