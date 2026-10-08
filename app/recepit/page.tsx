import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notificación de transferencia - SINPE Móvil",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReceiptPage() {
  return (
    <main className="receipt-page">
      <article className="notification" aria-label="Notificación de transferencia SINPE Móvil">
        <header className="header">
          <h1>
            Notificación de transferencia
            <strong>SINPE Móvil</strong>
          </h1>
        </header>

        <div className="body">
          <p>
            Hola,
            <br />
            <br />
            Le informamos que <strong>OSCAR GERARDO VINDAS MORA</strong> realizó una
            transferencia por medio de SINPE Móvil al teléfono N.º <strong>60290403</strong> a
            nombre de <strong>LUIS CARLOS CESPEDES RODRIGUEZ</strong>.
          </p>
        </div>

        <dl className="details">
          <div className="row">
            <dt>Referencia</dt>
            <dd>2026092210283002322638760</dd>
          </div>
          <div className="row">
            <dt>Fecha</dt>
            <dd>22 septiembre 2026</dd>
          </div>
          <div className="row">
            <dt>Hora</dt>
            <dd>4:20 PM</dd>
          </div>
          <div className="row">
            <dt>Monto</dt>
            <dd className="amount">₡3,000.00</dd>
          </div>
          <div className="row">
            <dt>Detalle</dt>
            <dd>(Sin detalle)</dd>
          </div>
        </dl>
      </article>

      <style>{`
        .receipt-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: #f0f0f0;
          color: #222;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .notification {
          position: relative;
          width: 100%;
          max-width: 380px;
          overflow: hidden;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .header {
          padding: 24px 24px 16px;
        }

        .header h1 {
          margin: 0;
          color: #333;
          font-size: 15px;
          font-weight: 400;
          line-height: 1.3;
        }

        .header strong {
          display: block;
          font-size: 16px;
          font-weight: 700;
        }

        .body {
          padding: 0 24px 20px;
          color: #444;
          font-size: 14px;
          line-height: 1.55;
        }

        .body p {
          margin: 0;
        }

        .body strong {
          color: #222;
          font-weight: 700;
        }

        .details {
          margin: 0;
          padding: 16px 24px 24px;
          border-top: 1px solid #eee;
        }

        .row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 20px;
          padding: 10px 0;
          font-size: 14px;
        }

        .row:not(:last-child) {
          border-bottom: 1px solid #f5f5f5;
        }

        .row dt {
          color: #666;
          font-weight: 400;
        }

        .row dd {
          margin: 0;
          color: #222;
          font-weight: 500;
          text-align: right;
        }

        .row dd.amount {
          font-weight: 600;
        }

        .notification::after {
          display: block;
          height: 12px;
          background:
            linear-gradient(135deg, #fff 25%, transparent 25%) -6px 0,
            linear-gradient(225deg, #fff 25%, transparent 25%) -6px 0,
            linear-gradient(315deg, #fff 25%, transparent 25%),
            linear-gradient(45deg, #fff 25%, transparent 25%);
          background-color: #f0f0f0;
          background-size: 12px 12px;
          content: "";
        }
      `}</style>
    </main>
  );
}
