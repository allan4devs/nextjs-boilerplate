"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ALargeSmall, Banknote, Check, CheckCircle2, Contrast, Download, Eye, EyeOff, Flame, Loader2, Minus, PackageOpen, Plus, Printer, ReceiptText, Save, Search, Smartphone, Split, Trash2, X } from "lucide-react";
import { GameChip, GameLabel, GameModal } from "../GameOS";
import InventoryReporterPages from "./InventoryReporterPages";
import ProductSaleReceipt, { type SaleReceiptData } from "./ProductSaleReceipt";
import { Field } from "./ui";

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
  active?: boolean;
};

const CASH_BILLS = [1000, 2000, 5000, 10000, 20000, 50000] as const;

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

// next/image solo admite rutas locales (bajo /public) sin configurar dominios
// externos. La imagen es texto libre desde Inventario, así que se valida acá
// para no tumbar la página con un valor mal escrito (falta el "/" inicial,
// una URL externa, etc.) — si no calza, se usa el ícono genérico.
function isLocalImagePath(value?: string): value is string {
  return typeof value === "string" && value.startsWith("/");
}

function searchable(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

type ProductDraft = {
  quantity: string;
  cameraQuantity: string;
  warehouseQuantity: string;
  price: string;
  name: string;
  category: Category;
  image: string;
};

const EMPTY_NEW_PRODUCT = { name: "", category: "bebidas" as Category, price: "", cameraQuantity: "0", warehouseQuantity: "0", image: "" };

export default function ReceptionStorefront({ mode, operatorName }: { mode: "inventory" | "sales"; operatorName?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ProductDraft>>({});
  // Alta de producto nuevo desde Inventario.
  const [creating, setCreating] = useState(false);
  const [newProduct, setNewProduct] = useState(EMPTY_NEW_PRODUCT);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  // Los inactivos se piden aparte y se ocultan por defecto: hay que activar
  // este switch para verlos (y poder reactivarlos).
  const [showInactive, setShowInactive] = useState(false);
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
  // Efectivo entregado por la persona (solo pago 100% efectivo): calcula el
  // vuelto en pantalla. Ayuda de caja, no cambia lo que se envía al servidor.
  const [cashTendered, setCashTendered] = useState("");
  const [receipt, setReceipt] = useState<SaleReceiptData | null>(null);

  // Preferencias del punto de venta (persisten en el navegador del mostrador).
  const [posSize, setPosSize] = useState<"normal" | "grande">("normal");
  const [posContrast, setPosContrast] = useState<"normal" | "alto">("normal");
  const [justSold, setJustSold] = useState<{ total: number; change?: number } | null>(null);
  const [topSellerIds, setTopSellerIds] = useState<string[]>([]);

  // El carrito en curso sobrevive a una recarga accidental de la página.
  const [cartHydrated, setCartHydrated] = useState(false);

  // Igual que la facturación de recepción: apenas se genera el comprobante, se
  // abre solo el diálogo de impresión (impresora por defecto AON Printer).
  useEffect(() => {
    if (!receipt) return;
    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, [receipt]);

  useEffect(() => {
    if (mode !== "sales" || typeof window === "undefined") return;
    setPosSize(window.localStorage.getItem("xtreme-pos-size") === "grande" ? "grande" : "normal");
    setPosContrast(window.localStorage.getItem("xtreme-pos-contrast") === "alto" ? "alto" : "normal");
  }, [mode]);

  // Recuperar un carrito interrumpido (recarga, tropiezo de red) una vez que
  // el inventario cargó, para no resucitar cantidades que ya no existen.
  useEffect(() => {
    if (mode !== "sales" || cartHydrated || !products.length || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("xtreme-pos-cart");
      if (raw) {
        const saved = JSON.parse(raw) as { cart?: Record<string, number>; savedAt?: number };
        const freshEnough = Date.now() - (saved.savedAt ?? 0) < 8 * 60 * 60 * 1000;
        if (saved.cart && freshEnough) {
          const byId = new Map(products.map((p) => [p.id, p]));
          const restored: Record<string, number> = {};
          for (const [id, qty] of Object.entries(saved.cart)) {
            const product = byId.get(id);
            if (product && qty > 0) restored[id] = Math.min(Math.floor(qty), product.quantity);
          }
          if (Object.keys(restored).length) setCart(restored);
        }
      }
    } catch {
      /* carrito guardado inválido: se ignora */
    }
    setCartHydrated(true);
  }, [mode, products, cartHydrated]);

  useEffect(() => {
    if (!cartHydrated || mode !== "sales" || typeof window === "undefined") return;
    try {
      const hasItems = Object.values(cart).some((qty) => qty > 0);
      if (hasItems) {
        window.localStorage.setItem("xtreme-pos-cart", JSON.stringify({ cart, savedAt: Date.now() }));
      } else {
        window.localStorage.removeItem("xtreme-pos-cart");
      }
    } catch {
      /* almacenamiento no disponible: seguir sin persistir */
    }
  }, [cart, cartHydrated, mode]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Ventas nunca pide inactivos (no deben poder cobrarse); Inventario sí,
      // para poder encontrarlos y reactivarlos.
      const params = mode === "inventory" ? "?status=all" : "";
      const res = await fetch(`/api/xtreme/reception/inventory${params}`, { cache: "no-store" });
      const json = (await res.json()) as { products?: Product[]; error?: string };
      if (!res.ok) throw new Error(json.error || "No se pudo cargar el inventario.");
      const next = json.products ?? [];
      setProducts(next);
      setDrafts(Object.fromEntries(next.map((p) => [p.id, {
        quantity: String(p.quantity),
        cameraQuantity: String(p.cameraQuantity ?? p.quantity),
        warehouseQuantity: String(p.warehouseQuantity ?? 0),
        price: String(p.price),
        name: p.name,
        category: p.category,
        image: p.image ?? "",
      }])));
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Error de conexión." });
    } finally {
      setLoading(false);
    }
  }, [mode]);

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

  const inactiveCount = useMemo(() => products.filter((p) => p.active === false).length, [products]);

  const visible = useMemo(() => {
    const term = searchable(query);
    return products.filter((product) => {
      if (mode === "inventory" && !showInactive && product.active === false) return false;
      if (category !== "all" && product.category !== category) return false;
      if (stock === "available" && product.quantity <= 0) return false;
      if (stock === "low" && (product.quantity <= 0 || product.quantity > 2)) return false;
      if (stock === "out" && product.quantity > 0) return false;
      if (!term) return true;
      return searchable(`${product.name} ${product.id} ${CATEGORY_LABEL[product.category]}`).includes(term);
    });
  }, [category, mode, products, query, showInactive, stock]);
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

  // Lista del sidebar de ventas: filtra por búsqueda y categoría, y manda los
  // agotados al final para que lo que sí se puede cobrar quede a la vista.
  const salesVisible = useMemo(() => {
    if (mode !== "sales") return [] as Product[];
    const term = searchable(query);
    return products
      .filter((product) => {
        if (category !== "all" && product.category !== category) return false;
        if (!term) return true;
        return searchable(`${product.name} ${product.id} ${CATEGORY_LABEL[product.category]}`).includes(term);
      })
      .sort((a, b) => {
        const aOut = a.quantity <= 0;
        const bOut = b.quantity <= 0;
        return aOut === bOut ? 0 : aOut ? 1 : -1;
      });
  }, [category, mode, products, query]);

  const payment = useMemo(() => {
    if (paymentMethod === "cash") return { method: paymentMethod, cashAmount: total, sinpeAmount: 0 };
    if (paymentMethod === "sinpe") return { method: paymentMethod, cashAmount: 0, sinpeAmount: total };
    if (paymentMethod === "mixed") return { method: paymentMethod, cashAmount: Math.max(0, Number(cashAmount) || 0), sinpeAmount: Math.max(0, Number(sinpeAmount) || 0) };
    return { method: null, cashAmount: 0, sinpeAmount: 0 };
  }, [cashAmount, paymentMethod, sinpeAmount, total]);
  const paymentDifference = total - payment.cashAmount - payment.sinpeAmount;
  const paymentReady = total > 0 && paymentMethod !== null && paymentDifference === 0 && (paymentMethod !== "mixed" || (payment.cashAmount > 0 && payment.sinpeAmount > 0));

  // Vuelto: solo aplica a pago 100% efectivo; es una ayuda de caja, el monto
  // que se reporta al servidor sigue siendo el total exacto de la venta.
  const tenderedNum = Math.max(0, Number(cashTendered) || 0);
  const changeDue = paymentMethod === "cash" && tenderedNum > total ? tenderedNum - total : 0;
  const tenderedShort = paymentMethod === "cash" && tenderedNum > 0 && tenderedNum < total ? total - tenderedNum : 0;

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
    const name = draft?.name?.trim();
    if (!name) {
      setMessage({ tone: "error", text: "El nombre del producto no puede quedar vacío." });
      return;
    }
    const image = draft?.image?.trim() ?? "";
    if (image && !image.startsWith("/")) {
      setMessage({ tone: "error", text: "La ruta de imagen debe empezar con / (ej: /xtreme/products/producto.jpeg)." });
      return;
    }
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
          name,
          category: draft?.category ?? product.category,
          image: draft?.image ?? "",
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
        name: json.product!.name,
        category: json.product!.category,
        image: json.product!.image ?? "",
      } }));
      setMessage({ tone: "ok", text: `${json.product.name} actualizado.` });
      window.dispatchEvent(new Event("xtreme:storefront-updated"));
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "No se pudo guardar." });
    } finally {
      setBusy("");
    }
  }

  async function createProductSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const name = newProduct.name.trim();
    if (!name) {
      setCreateError("El nombre es requerido.");
      return;
    }
    const image = newProduct.image.trim();
    if (image && !image.startsWith("/")) {
      setCreateError("La ruta de imagen debe empezar con / (ej: /xtreme/products/producto.jpeg).");
      return;
    }
    setCreateBusy(true);
    setCreateError("");
    try {
      const res = await fetch("/api/xtreme/reception/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: newProduct.category,
          price: Number(newProduct.price) || 0,
          cameraQuantity: Number(newProduct.cameraQuantity) || 0,
          warehouseQuantity: Number(newProduct.warehouseQuantity) || 0,
          image: newProduct.image.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { product?: Product; error?: string };
      if (!res.ok || !json.product) throw new Error(json.error || "No se pudo crear el producto.");
      const created = json.product;
      setProducts((current) => [...current, created]);
      setDrafts((current) => ({ ...current, [created.id]: {
        quantity: String(created.quantity),
        cameraQuantity: String(created.cameraQuantity ?? created.quantity),
        warehouseQuantity: String(created.warehouseQuantity ?? 0),
        price: String(created.price),
        name: created.name,
        category: created.category,
        image: created.image ?? "",
      } }));
      setMessage({ tone: "ok", text: `${created.name} creado.` });
      setNewProduct(EMPTY_NEW_PRODUCT);
      setCreating(false);
      window.dispatchEvent(new Event("xtreme:storefront-updated"));
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "No se pudo crear el producto.");
    } finally {
      setCreateBusy(false);
    }
  }

  // Activar/desactivar: no es un borrado, solo lo saca (o lo devuelve) de
  // Ventas. Reutiliza `busy` como mutex por producto, igual que Guardar.
  async function toggleProductActive(product: Product) {
    const nextActive = product.active === false;
    setBusy(product.id);
    setMessage(null);
    try {
      const res = await fetch("/api/xtreme/reception/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_active", id: product.id, active: nextActive }),
      });
      const json = (await res.json()) as { product?: Product; error?: string };
      if (!res.ok || !json.product) throw new Error(json.error || "No se pudo actualizar el estado.");
      setProducts((current) => current.map((item) => item.id === product.id ? json.product! : item));
      setMessage({ tone: "ok", text: `${json.product.name} ${nextActive ? "activado" : "desactivado"}.` });
      window.dispatchEvent(new Event("xtreme:storefront-updated"));
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "No se pudo actualizar el estado." });
    } finally {
      setBusy("");
    }
  }

  function changeCart(product: Product, delta: number) {
    // Cualquier ajuste del carrito empieza una venta nueva: el comprobante
    // emitido anterior deja lugar a la vista previa en vivo.
    setReceipt(null);
    setCart((current) => {
      const next = Math.max(0, Math.min(product.quantity, (current[product.id] ?? 0) + delta));
      return { ...current, [product.id]: next };
    });
  }

  // Buscar/escanear y Enter: agrega el primer producto con existencia de la
  // lista filtrada (mismo gesto que tocarlo en el sidebar) y limpia el campo.
  function addFirstMatch() {
    const first = salesVisible.find((product) => product.quantity > 0);
    if (!first) {
      setMessage({ tone: "error", text: "Sin coincidencias con existencia." });
      return;
    }
    changeCart(first, 1);
    setQuery("");
    setMessage(null);
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
      const json = (await res.json()) as {
        products?: Product[];
        sale?: Omit<SaleReceiptData, "staffName" | "cashTendered" | "changeDue">;
        staffName?: string;
        error?: string;
      };
      if (!res.ok || !json.products) throw new Error(json.error || "No se pudo registrar la venta.");
      const soldTotal = json.sale?.total ?? total;
      const soldChange = changeDue;
      setProducts(json.products);
      setCart({});
      setCashAmount("");
      setSinpeAmount("");
      setCashTendered("");
      setPaymentMethod(null);
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
          cashTendered: soldChange > 0 ? tenderedNum : undefined,
          changeDue: soldChange > 0 ? soldChange : undefined,
        });
      }
      setJustSold({ total: soldTotal, change: soldChange > 0 ? soldChange : undefined });
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
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto border-t border-white/10 pt-3 lg:max-h-none lg:flex-1">
            {cartLines.map((product) => (
              <div key={product.id} className="flex items-center gap-3 border-[3px] border-white/10 bg-black/30 p-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black uppercase text-white/85">{product.name}</span>
                  <span className="mt-0.5 block text-[11px] font-bold text-white/40">{cart[product.id]} × {money(product.price)}</span>
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" aria-label={`Quitar una unidad de ${product.name}`} onClick={() => changeCart(product, -1)} className="grid h-9 w-9 place-items-center border-[3px] border-white/20 text-white/70 hover:border-white/40 hover:text-white">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-7 text-center text-lg font-black text-white">{cart[product.id]}</span>
                  <button type="button" aria-label={`Agregar una unidad de ${product.name}`} disabled={(cart[product.id] ?? 0) >= product.quantity} onClick={() => changeCart(product, 1)} className="grid h-9 w-9 place-items-center border-[3px] border-[#d8ff3e]/60 text-[#d8ff3e] hover:border-[#d8ff3e] disabled:border-white/10 disabled:text-white/20">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="w-20 shrink-0 text-right font-black text-white">{money(product.price * (cart[product.id] ?? 0))}</span>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm font-bold text-white/35">Elegí un producto de la lista para empezar.</p>}
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
                    <button key={option.id} type="button" aria-pressed={active} onClick={() => { setPaymentMethod(option.id); setCashTendered(""); }} className={`flex min-h-12 flex-col items-center justify-center gap-1 border-2 px-2 text-[10px] font-black uppercase ${active ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/15 text-white/45 hover:border-white/30"}`}>
                      <Icon className="h-4 w-4" /> {option.label}
                    </button>
                  );
                })}
              </div>
            </>
          );
        })()}

        {paymentMethod === "cash" && total > 0 && (
          <div className="mt-3">
            <label className="text-[9px] font-black uppercase tracking-wide text-white/40">Efectivo recibido ₡ · calcula el vuelto
              <input
                type="number"
                min="0"
                step="100"
                inputMode="numeric"
                value={cashTendered}
                onChange={(event) => setCashTendered(event.target.value)}
                placeholder={String(total)}
                className="mt-1 min-h-12 w-full border-[3px] border-white/15 bg-black px-3 text-lg font-black outline-none focus:border-[#d8ff3e]"
              />
            </label>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {CASH_BILLS.map((bill) => (
                <button key={bill} type="button" onClick={() => setCashTendered(String(bill))} className="min-h-9 border-2 border-white/15 text-[10px] font-black uppercase text-white/55 hover:border-white/35 hover:text-white">
                  ₡{bill.toLocaleString("es-CR")}
                </button>
              ))}
              <button type="button" onClick={() => setCashTendered(String(total))} className="min-h-9 border-2 border-[#d8ff3e]/50 text-[10px] font-black uppercase text-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black">
                Exacto
              </button>
            </div>
            {tenderedNum > 0 && (
              <div className={`mt-2 flex items-center justify-between border-2 px-3 py-2 text-xs font-black ${changeDue > 0 ? "border-[#d8ff3e]/35 bg-[#d8ff3e]/5 text-[#d8ff3e]" : tenderedShort > 0 ? "border-orange-300/35 bg-orange-400/[0.07] text-orange-200" : "border-white/15 bg-white/[0.03] text-white/55"}`}>
                <span>{changeDue > 0 ? "Vuelto" : tenderedShort > 0 ? "Falta" : "Recibido exacto"}</span>
                <span>{money(changeDue > 0 ? changeDue : tenderedShort)}</span>
              </div>
            )}
          </div>
        )}

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

  // Fila del sidebar de ventas: miniatura + nombre + precio, en formato
  // compacto. La imagen ayuda a reconocer el producto de un vistazo; tocarla
  // suma una unidad y el detalle de cantidades se ajusta en la caja.
  const renderPosRow = (product: Product, keyPrefix = "") => {
    const selected = cart[product.id] ?? 0;
    const soldOut = product.quantity <= 0;
    return (
      <button
        key={`${keyPrefix}${product.id}`}
        type="button"
        disabled={soldOut}
        onClick={() => changeCart(product, 1)}
        aria-label={`Agregar ${product.name}`}
        className={`flex w-full items-center gap-2.5 border-2 px-2 py-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8ff3e] ${soldOut ? "border-white/10 opacity-40" : selected > 0 ? "border-[#d8ff3e] bg-[#d8ff3e]/10" : "border-white/15 bg-black/40 hover:border-white/35"}`}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden bg-white/[0.06]">
          {isLocalImagePath(product.image) ? (
            <Image src={product.image} alt="" width={40} height={40} sizes="40px" className="h-full w-full object-cover" />
          ) : (
            <PackageOpen className="h-5 w-5 text-white/20" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black uppercase leading-tight">{product.name}</span>
          <span className="mt-0.5 block text-[10px] font-bold text-white/40">{soldOut ? "Agotado" : `${product.quantity} disp · ${CATEGORY_LABEL[product.category]}`}</span>
        </span>
        <span className="shrink-0 text-xs font-black text-[#d8ff3e]">{money(product.price)}</span>
        {selected > 0 ? (
          <span className="grid h-6 min-w-6 shrink-0 place-items-center border-2 border-black bg-[#d8ff3e] px-1 text-[11px] font-black text-black">{selected}</span>
        ) : (
          <Plus className={`h-4 w-4 shrink-0 ${soldOut ? "text-white/15" : "text-white/35"}`} />
        )}
      </button>
    );
  };

  // Vista previa de la factura: mientras se arma el carrito muestra el
  // comprobante en vivo (sin cobrar); tras cobrar muestra el ya emitido.
  const previewReceipt: SaleReceiptData | null = receipt
    ? receipt
    : cartLines.length > 0
      ? {
          id: "Pendiente de cobro",
          createdAt: new Date().toISOString(),
          items: cartLines.map((product) => ({ productId: product.id, name: product.name, quantity: cart[product.id] ?? 0, unitPrice: product.price })),
          total,
          paymentMethod: paymentMethod ?? "cash",
          cashAmount: payment.cashAmount,
          sinpeAmount: payment.sinpeAmount,
          staffName: operatorName || "Recepción",
          cashTendered: changeDue > 0 ? tenderedNum : undefined,
          changeDue: changeDue > 0 ? changeDue : undefined,
        }
      : null;

  const facturaPreview = (
    <div className="flex flex-col gap-3 border-[3px] border-white/15 bg-black/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <GameLabel tone={receipt ? "lime" : "cyan"}>{receipt ? "Comprobante emitido" : "Vista previa de factura"}</GameLabel>
        {receipt && (
          <button type="button" onClick={() => setReceipt(null)} aria-label="Cerrar comprobante" className="grid h-8 w-8 place-items-center text-white/35 hover:text-white"><X className="h-4 w-4" /></button>
        )}
      </div>
      {previewReceipt ? (
        <>
          <div className="relative max-h-[58vh] overflow-y-auto bg-white/[0.04] p-2">
            {!receipt && (
              <span className="pointer-events-none absolute right-3 top-3 z-10 border-2 border-black bg-[#d8ff3e] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">Sin cobrar</span>
            )}
            <ProductSaleReceipt receipt={previewReceipt} screen />
          </div>
          {receipt ? (
            <button type="button" onClick={() => window.print()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 border-[3px] border-[#d8ff3e] bg-[#d8ff3e] text-xs font-black uppercase text-black">
              <Printer className="h-4 w-4" /> Reimprimir factura
            </button>
          ) : (
            <p className="text-[11px] font-bold leading-relaxed text-white/40">Así queda la factura. Cobrá desde la caja y el comprobante se imprime solo.</p>
          )}
        </>
      ) : (
        <div className="grid min-h-52 place-items-center border-[3px] border-dashed border-white/15 p-6 text-center">
          <div>
            <ReceiptText className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-sm font-black uppercase text-white/45">La factura aparece acá</p>
            <p className="mt-1 text-xs font-bold text-white/30">Elegí productos en la lista</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={mode === "sales" ? "xg-pos relative" : undefined} data-size={posSize} data-contrast={posContrast}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <GameLabel tone={mode === "inventory" ? "cyan" : "lime"}>{mode === "inventory" ? "Control de existencias" : "Punto de venta"}</GameLabel>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">{mode === "inventory" ? "Inventario" : "Nueva venta"}</h2>
          <p className="mt-2 text-sm font-bold text-white/45">{mode === "inventory" ? "Definí existencias y precio de venta para cada producto." : "Elegí productos de la lista, ajustá cantidades en la caja y cobrá."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === "sales" && <GameChip tone="lime">{cartUnits} producto{cartUnits === 1 ? "" : "s"}</GameChip>}
          {mode === "sales" && <PosToggle active={posSize === "grande"} onClick={() => persistPosSize(posSize === "grande" ? "normal" : "grande")} icon={ALargeSmall} label="Texto grande" />}
          {mode === "sales" && <PosToggle active={posContrast === "alto"} onClick={() => persistPosContrast(posContrast === "alto" ? "normal" : "alto")} icon={Contrast} label="Alto contraste" />}
          {mode === "inventory" && (
            <PosToggle
              active={showInactive}
              onClick={() => setShowInactive((current) => !current)}
              icon={showInactive ? Eye : EyeOff}
              label={`Inactivos${inactiveCount ? ` (${inactiveCount})` : ""}`}
            />
          )}
          {mode === "inventory" && (
            <button type="button" onClick={() => { setCreateError(""); setCreating(true); }} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-[#d8ff3e] px-4 text-xs font-black uppercase text-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black">
              <Plus className="h-4 w-4" /> Nuevo producto
            </button>
          )}
          {mode === "inventory" && <a href="/api/xtreme/reception/inventory/export" className="inline-flex min-h-11 items-center gap-2 border-[3px] border-[#d8ff3e] bg-[#d8ff3e] px-4 text-xs font-black uppercase text-black"><Download className="h-4 w-4" /> Descargar Excel</a>}
        </div>
      </div>

      {message && <div className={`mt-4 border-[3px] px-4 py-3 text-sm font-black ${message.tone === "ok" ? "border-[#d8ff3e]/60 bg-[#d8ff3e]/10 text-[#d8ff3e]" : "border-red-400/60 bg-red-500/10 text-red-200"}`}>{message.text}</div>}

      {mode === "inventory" && (
        <GameModal
          open={creating}
          onClose={() => { if (!createBusy) setCreating(false); }}
          title="Nuevo producto"
          subtitle="Se agrega activo y listo para vender"
          icon={Plus}
          tone="lime"
          footer={
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setCreating(false)} disabled={createBusy} className="inline-flex min-h-11 items-center px-4 text-xs font-black uppercase text-white/50 hover:text-white disabled:opacity-40">Cancelar</button>
              <button type="submit" form="create-product-form" disabled={createBusy || !newProduct.name.trim()} className="inline-flex min-h-11 items-center gap-2 bg-[#d8ff3e] px-5 text-xs font-black uppercase text-black disabled:opacity-40">
                {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear producto
              </button>
            </div>
          }
        >
          <form id="create-product-form" onSubmit={(event) => void createProductSubmit(event)} className="space-y-3">
            <Field label="Nombre" required>
              <input value={newProduct.name} onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))} required autoFocus className="w-full border-[3px] border-white/15 bg-black px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]" placeholder="Nombre del producto" />
            </Field>
            <Field label="Categoría" required>
              <select value={newProduct.category} onChange={(event) => setNewProduct((current) => ({ ...current, category: event.target.value as Category }))} className="w-full border-[3px] border-white/15 bg-black px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]">
                {(Object.keys(CATEGORY_LABEL) as Category[]).map((id) => <option key={id} value={id} className="text-black">{CATEGORY_LABEL[id]}</option>)}
              </select>
            </Field>
            <Field label="Precio ₡" required>
              <input type="number" min="0" step="50" inputMode="numeric" value={newProduct.price} onChange={(event) => setNewProduct((current) => ({ ...current, price: event.target.value }))} required className="w-full border-[3px] border-white/15 bg-black px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]" placeholder="0" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Existencia · cámara">
                <input type="number" min="0" step="1" value={newProduct.cameraQuantity} onChange={(event) => setNewProduct((current) => ({ ...current, cameraQuantity: event.target.value }))} className="w-full border-[3px] border-white/15 bg-black px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]" />
              </Field>
              <Field label="Existencia · bodega">
                <input type="number" min="0" step="1" value={newProduct.warehouseQuantity} onChange={(event) => setNewProduct((current) => ({ ...current, warehouseQuantity: event.target.value }))} className="w-full border-[3px] border-white/15 bg-black px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]" />
              </Field>
            </div>
            <Field label="Imagen (ruta, opcional)">
              <input value={newProduct.image} onChange={(event) => setNewProduct((current) => ({ ...current, image: event.target.value }))} className="w-full border-[3px] border-white/15 bg-black px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]" placeholder="/xtreme/products/producto.jpeg" />
            </Field>
            <p className="text-xs font-bold leading-relaxed text-white/35">Sin imagen queda con el ícono genérico, igual que varios productos actuales (barritas, chicles).</p>
            {createError && (
              <p className="flex items-center gap-2 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300">{createError}</p>
            )}
          </form>
        </GameModal>
      )}

      {mode === "inventory" && <InventoryReporterPages />}

      {mode === "inventory" && (
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

      {mode === "inventory" && (
        <div className="xg-mobile-scroll mt-5 flex gap-2 overflow-x-auto pb-1">
          {(["all", "bebidas", "proteinas", "creatinas", "hidratantes", "chicles"] as const).map((id) => (
            <button key={id} type="button" onClick={() => setCategory(id)} className={`min-h-10 shrink-0 border-[3px] px-3 text-xs font-black uppercase ${category === id ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/15 text-white/55"}`}>
              {id === "all" ? "Todo" : CATEGORY_LABEL[id]}
            </button>
          ))}
        </div>
      )}

      {mode === "sales" && (
        <div className={`mt-5 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(240px,270px)_minmax(0,1fr)] xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(300px,360px)] ${cartUnits > 0 ? "pb-24 lg:pb-0" : ""}`}>
          <aside className="flex min-h-0 flex-col border-[3px] border-white/15 bg-black/30 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:self-start lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] xl:row-span-1 print:hidden">
            <div className="border-b-[3px] border-white/10 p-3">
              <label className="relative block">
                <span className="sr-only">Buscar o escanear producto</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") { event.preventDefault(); addFirstMatch(); }
                    else if (event.key === "Escape") setQuery("");
                  }}
                  type="search"
                  autoComplete="off"
                  autoFocus
                  placeholder="Buscar o escanear + Enter"
                  className="min-h-12 w-full border-[3px] border-[#d8ff3e]/60 bg-black/60 pl-11 pr-10 text-sm font-black outline-none placeholder:text-white/30 focus:border-[#d8ff3e]"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-white/35 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </label>
              <div className="xg-mobile-scroll mt-2 flex gap-1.5 overflow-x-auto pb-1">
                {(["all", "bebidas", "proteinas", "creatinas", "hidratantes", "chicles"] as const).map((id) => (
                  <button key={id} type="button" onClick={() => setCategory(id)} className={`min-h-10 shrink-0 border-2 px-2.5 text-[10px] font-black uppercase ${category === id ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/15 text-white/55 hover:text-white"}`}>
                    {id === "all" ? "Todo" : CATEGORY_LABEL[id]}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[46vh] min-h-0 flex-1 space-y-1 overflow-y-auto p-2 lg:max-h-none">
              {topSellers.length > 0 && !query.trim() && category === "all" && (
                <>
                  <p className="flex items-center gap-1.5 px-1 pt-1 text-[10px] font-black uppercase tracking-[.18em] text-[#d8ff3e]"><Flame className="h-3.5 w-3.5" /> Los más vendidos</p>
                  {topSellers.map((product) => renderPosRow(product, "top-"))}
                  <p className="px-1 pb-0.5 pt-2 text-[10px] font-black uppercase tracking-[.18em] text-white/35">Todo el inventario</p>
                </>
              )}
              {salesVisible.map((product) => renderPosRow(product, "all-"))}
              {!salesVisible.length && (
                <div className="border-[3px] border-dashed border-white/15 p-6 text-center">
                  <Search className="mx-auto h-7 w-7 text-white/20" />
                  <p className="mt-2 text-xs font-black uppercase text-white/45">Sin coincidencias</p>
                  <button type="button" onClick={() => { setQuery(""); setCategory("all"); }} className="mt-3 min-h-9 border-2 border-[#d8ff3e]/50 px-3 text-[10px] font-black uppercase text-[#d8ff3e]">Limpiar</button>
                </div>
              )}
            </div>
          </aside>

          <section id="xg-caja" className="flex flex-col border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-4 shadow-[6px_6px_0_rgba(216,255,62,.18)] sm:p-6 lg:col-start-2 lg:row-start-1 print:hidden">
            {cartContent}
          </section>

          <div className="lg:col-start-2 lg:row-start-2 xl:col-start-3 xl:row-start-1 xl:self-start xl:sticky xl:top-6 print:hidden">
            {facturaPreview}
          </div>
        </div>
      )}

      {mode === "inventory" && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {visible.map((product) => {
          const isActive = product.active !== false;
          return (
              <article key={product.id} className={`overflow-hidden border-[3px] ${isActive ? "border-white/15 bg-black/45" : "border-red-400/35 bg-red-500/[0.04]"}`}>
                <div className="flex min-h-36 gap-4 p-3">
                  <div className="grid h-32 w-24 shrink-0 place-items-center overflow-hidden bg-white/[0.06]">
                    {isLocalImagePath(product.image) ? (
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
                  <div className="min-w-0 flex-1 space-y-2 py-1">
                    <select
                      value={drafts[product.id]?.category ?? product.category}
                      onChange={(e) => setDrafts((d) => ({ ...d, [product.id]: { ...d[product.id], category: e.target.value as Category } }))}
                      className="border-2 border-white/15 bg-black px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white/70 outline-none focus:border-[#d8ff3e]"
                    >
                      {(Object.keys(CATEGORY_LABEL) as Category[]).map((id) => <option key={id} value={id} className="text-black">{CATEGORY_LABEL[id]}</option>)}
                    </select>
                    <input
                      value={drafts[product.id]?.name ?? product.name}
                      onChange={(e) => setDrafts((d) => ({ ...d, [product.id]: { ...d[product.id], name: e.target.value } }))}
                      placeholder="Nombre del producto"
                      className="block w-full border-b-2 border-white/15 bg-transparent py-1 text-base font-black uppercase leading-tight text-white outline-none focus:border-[#d8ff3e]"
                    />
                  </div>
                </div>

                <div className="border-t-[3px] border-white/10 p-3">
                  <label className="block text-[9px] font-black uppercase tracking-wide text-white/40">Imagen (ruta, opcional)
                    <input
                      value={drafts[product.id]?.image ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [product.id]: { ...d[product.id], image: e.target.value } }))}
                      placeholder="/xtreme/products/producto.jpeg"
                      className="mt-1 min-h-9 w-full border-2 border-white/15 bg-black px-2 text-xs font-bold text-white outline-none focus:border-[#d8ff3e]"
                    />
                  </label>
                </div>

                <div className={`flex items-center justify-between gap-2 border-t-[3px] border-white/10 px-3 py-2 ${isActive ? "" : "bg-red-500/[0.06]"}`}>
                  <span className={`text-[10px] font-black uppercase tracking-wide ${isActive ? "text-[#d8ff3e]/70" : "text-red-300"}`}>
                    {isActive ? "Activo · disponible para la venta" : "Inactivo · no aparece en Ventas"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleProductActive(product)}
                    disabled={busy === product.id}
                    className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 border-2 px-2.5 text-[10px] font-black uppercase disabled:opacity-40 ${isActive ? "border-white/15 text-white/50 hover:border-red-400/60 hover:text-red-300" : "border-[#d8ff3e]/60 text-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black"}`}
                  >
                    {busy === product.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {isActive ? "Desactivar" : "Activar"}
                  </button>
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
                  <button type="button" aria-label={`Guardar ${product.name}`} disabled={Boolean(busy) || !(drafts[product.id]?.name ?? product.name).trim()} onClick={() => void saveProduct(product)} className="mt-[13px] grid h-11 w-11 place-items-center border-[3px] border-[#d8ff3e] bg-[#d8ff3e] text-black disabled:opacity-40">{busy === product.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}</button>
                  {(() => {
                    const totalUnits = Math.max(0, Number(drafts[product.id]?.cameraQuantity ?? 0)) + Math.max(0, Number(drafts[product.id]?.warehouseQuantity ?? 0));
                    return <p className="col-span-2 text-right text-xs font-black uppercase text-white/45 sm:col-span-4">Total: <span className="text-[#d8ff3e]">{totalUnits}</span></p>;
                  })()}
                </div>
              </article>
          );
        })}
        {!visible.length && <div className="border-[3px] border-dashed border-white/15 p-8 text-center sm:col-span-2"><Search className="mx-auto h-8 w-8 text-white/20" /><p className="mt-3 text-sm font-black uppercase text-white/45">No hay productos que coincidan</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); setStock("all"); }} className="mt-4 min-h-10 border-2 border-[#d8ff3e]/50 px-4 text-xs font-black uppercase text-[#d8ff3e]">Limpiar filtros</button></div>}
        </div>
      )}

      {mode === "sales" && cartUnits > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-stretch gap-2 border-t-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-2 lg:hidden print:hidden">
          <div className="flex shrink-0 flex-col justify-center border-[3px] border-white/20 px-3">
            <span className="text-[9px] font-black uppercase tracking-wide text-white/45">{cartUnits} u</span>
            <span className="text-xl font-black leading-none text-[#d8ff3e]">{money(total)}</span>
          </div>
          <button type="button" disabled={busy === "sale"} onClick={() => { if (!paymentReady) { document.getElementById("xg-caja")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; } void completeSale(); }} className="flex flex-1 items-center justify-center gap-2 border-[3px] border-black/30 bg-[#d8ff3e] text-[length:var(--pos-cobrar)] font-black uppercase tracking-tight text-black disabled:opacity-40">
            {busy === "sale" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6" />} {paymentReady ? `Cobrar ${money(total)}` : "Ir a la caja"}
          </button>
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
            {justSold.change ? (
              <p className="mt-3 text-2xl font-black uppercase text-white">Vuelto: {money(justSold.change)}</p>
            ) : null}
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
