"use client";

import { RECEIPT_HEADER, colones, fmtDateTime, numeroALetras } from "./receipt-format";

// Forma mínima compartida entre el punto de venta (recién cobrada) y el
// monitoreo de ventas (reimpresión de una venta pasada) para poder imprimir
// el mismo comprobante desde los dos lugares.
export type SaleReceiptData = {
  id: string;
  createdAt: string;
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number }>;
  total: number;
  paymentMethod: "cash" | "sinpe" | "mixed";
  cashAmount: number;
  sinpeAmount: number;
  staffName: string;
  // Solo para el comprobante impreso: cuánto entregó la persona y el vuelto
  // calculado. No se envía al servidor, es una ayuda de caja en el cliente.
  cashTendered?: number;
  changeDue?: number;
};

// Comprobante térmico de la venta de inventario. Mismo formato que la
// facturación de recepción (AON Printer, 72 mm), pero con varias líneas de
// producto y sin campos fiscales de Latinsoft (es un comprobante interno).
//
// `screen`: se muestra en pantalla (vista previa del punto de venta) y NO debe
// imprimirse. Sin la clase `thermal-receipt`, el `@media print` de globals.css
// lo deja oculto; el nodo que sí se imprime es una copia aparte fuera de vista.
export default function ProductSaleReceipt({ receipt, screen = false }: { receipt: SaleReceiptData; screen?: boolean }) {
  const total = receipt.total;
  const units = receipt.items.reduce((sum, item) => sum + item.quantity, 0);
  const emitido = fmtDateTime(receipt.createdAt);
  const enLetras = `${numeroALetras(total)} CON 00/100`;
  const payments = [
    { label: "Efectivo", value: receipt.cashAmount },
    { label: "SINPE", value: receipt.sinpeAmount },
  ].filter((line) => line.value > 0);

  return (
    <div className={`${screen ? "xg-receipt-preview" : "thermal-receipt"} mx-auto mt-3 max-w-[280px] border border-black bg-white px-3 py-3 font-serif text-[11px] leading-[1.35] text-black`}>
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
        <tbody>
          {payments.map((line) => <tr key={line.label} className="border-b border-black">
            <td className="py-0.5">--&nbsp;&nbsp;{line.label}</td>
            <td className="whitespace-nowrap py-0.5 text-right">{colones(line.value)}</td>
          </tr>)}
          {receipt.cashTendered != null && (
            <tr><td className="py-0.5">Recibido</td><td className="whitespace-nowrap py-0.5 text-right">{colones(receipt.cashTendered)}</td></tr>
          )}
          {receipt.changeDue != null && (
            <tr className="font-bold"><td className="py-0.5">Vuelto</td><td className="whitespace-nowrap py-0.5 text-right">{colones(receipt.changeDue)}</td></tr>
          )}
        </tbody>
      </table>

      <p className="mt-2">{enLetras}</p>

      <p className="mt-3 text-center font-bold">¡Gracias por elegirnos, vuelva pronto!</p>
      <p className="mt-2 text-center text-[9px] text-black/60">Comprobante interno · la factura fiscal se emite en Latinsoft</p>
    </div>
  );
}
