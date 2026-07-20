"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_URL = "https://www.xtremecr.com/app";

export default function XtremeQrFlyer() {
  const qrRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrInstanceRef = useRef<any>(null);
  const [url, setUrl] = useState(DEFAULT_URL);

  // Inicializar qr-code-styling solo en el cliente
  useEffect(() => {
    let cancelled = false;

    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !qrRef.current) return;

      // Limpiar instancia anterior si existiera
      if (qrRef.current.firstChild) {
        qrRef.current.innerHTML = "";
      }

      const qr = new QRCodeStyling({
        width: 230,
        height: 230,
        type: "svg",
        data: DEFAULT_URL,
        image: "/xtreme/logo.webp",
        margin: 0,
        qrOptions: {
          errorCorrectionLevel: "H", // nivel H = soporta logo encima sin romper el escaneo
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.32,
          margin: 6,
          crossOrigin: "anonymous",
        },
        dotsOptions: {
          color: "#111111",
          type: "extra-rounded",
        },
        backgroundOptions: {
          color: "#ffffff",
        },
        cornersSquareOptions: {
          color: "#111111",
          type: "extra-rounded",
        },
        cornersDotOptions: {
          color: "#ffcc00", // amarillo Xtreme en los puntos interiores de esquina
          type: "dot",
        },
      });

      qr.append(qrRef.current);
      qrInstanceRef.current = qr;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Actualizar QR cuando cambia la URL
  useEffect(() => {
    if (qrInstanceRef.current && url) {
      qrInstanceRef.current.update({ data: url });
    }
  }, [url]);

  const displayUrl = url.replace(/^https?:\/\//i, "");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @page { size: letter portrait; margin: 0; }

        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* ── TOOLBAR (se oculta al imprimir) ─────────────────────── */
        .toolbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 9999;
          background: #0f172a;
          border-bottom: 2px solid #ffcc00;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          color: #fff;
          box-shadow: 0 10px 25px rgba(0,0,0,.8);
        }
        .toolbar-title {
          font-size: 13px;
          font-weight: 800;
          color: #ffcc00;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .toolbar-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .url-input-group {
          display: flex;
          align-items: center;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 6px;
          padding: 4px 10px;
          gap: 8px;
        }
        .url-input-group label {
          font-size: 11px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .url-input-group input {
          background: transparent;
          border: none;
          color: #fff;
          font-family: monospace;
          font-size: 13px;
          width: 280px;
          outline: none;
        }
        .btn-print {
          background: #ffcc00;
          color: #111;
          border: none;
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
          padding: 8px 18px;
          border-radius: 6px;
          cursor: pointer;
          transition: all .2s;
          box-shadow: 0 4px 12px rgba(255,204,0,.3);
        }
        .btn-print:hover { transform: translateY(-1px); background: #ffe066; }

        /* ── HOJA ─────────────────────────────────────────────────── */
        .page-wrapper {
          padding-top: 60px;
          padding-bottom: 40px;
          display: flex;
          justify-content: center;
          background: #000;
          min-height: 100vh;
        }
        .letter-page {
          position: relative;
          width: 8.5in;
          height: 11in;
          background: #fff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          border: 8px solid #111;
          box-shadow: 0 0 20px rgba(0,0,0,.15);
        }
        .page-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* ── HEADER ───────────────────────────────────────────────── */
        .header {
          text-align: center;
          padding: 14px 20px 10px;
          background: linear-gradient(135deg, #111, #222);
          color: #fff;
          border-bottom: 6px solid #ffcc00;
        }
        .header-logo {
          display: block;
          width: 88px;
          height: 88px;
          object-fit: contain;
          margin: 4px auto 6px;
          mix-blend-mode: screen;
          filter: drop-shadow(0 2px 8px rgba(255,204,0,.4));
        }
        .top-badge {
          display: inline-block;
          background: #ffcc00;
          color: #111;
          font-weight: bold;
          padding: 5px 16px;
          border-radius: 30px;
          margin-bottom: 6px;
          font-size: .95rem;
          text-transform: uppercase;
        }
        .title-main {
          font-size: 2.1rem;
          line-height: 1.1;
          margin: 6px 0;
          font-weight: 900;
          text-transform: uppercase;
        }
        .title-main span { display: block; white-space: nowrap; }
        .title-highlight { color: #ffcc00; font-size: 1.85rem; }
        .subtitle {
          font-size: .93rem;
          font-weight: 500;
          color: #e2e8f0;
          max-width: 90%;
          margin: 4px auto 0;
          line-height: 1.35;
        }

        /* ── QR HERO ──────────────────────────────────────────────── */
        .qr-hero-card {
          text-align: center;
          padding: 25px 20px;
          background: #f8f8f8;
          border-bottom: 1px solid #ddd;
        }
        .qr-box {
          width: 260px;
          height: 260px;
          margin: 0 auto 18px;
          padding: 12px;
          background: #fff;
          border: 4px solid #111;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,.1);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .qr-box > div { display: flex !important; align-items: center; justify-content: center; }
        .qr-box svg, .qr-box canvas, .qr-box img {
          width: 100% !important;
          height: 100% !important;
          display: block;
        }
        .qr-callout-badge {
          background: #111;
          color: #ffcc00;
          font-weight: bold;
          padding: 10px 25px;
          border-radius: 50px;
          display: inline-block;
          margin: 10px 0;
          font-size: 1.15rem;
          text-transform: uppercase;
        }
        .qr-desc {
          font-size: 1.05rem;
          color: #444;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .qr-url-display {
          background: #111;
          color: #ffcc00;
          font-family: monospace;
          font-size: 1.2rem;
          font-weight: 900;
          padding: 8px 24px;
          border-radius: 8px;
          display: inline-block;
          letter-spacing: .5px;
        }

        /* ── PASOS ────────────────────────────────────────────────── */
        .section-title {
          text-align: center;
          font-size: 1.45rem;
          font-weight: bold;
          margin: 24px 0 16px;
          color: #111;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .steps-grid, .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          padding: 0 20px 20px;
        }
        .step-card {
          background: #f9f9f9;
          border: 2px solid #ddd;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }
        .step-num {
          width: 44px; height: 44px;
          background: #111; color: #fff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; font-weight: bold;
          margin: 0 auto 10px;
        }
        .step-head { font-size: 1.05rem; font-weight: bold; color: #111; text-transform: uppercase; margin-bottom: 4px; }
        .step-body { font-size: .9rem; color: #555; line-height: 1.3; }

        /* ── FEATURES ─────────────────────────────────────────────── */
        .feature-item {
          display: flex; align-items: center; gap: 14px;
          background: #f9f9f9; padding: 14px 16px;
          border-radius: 12px;
          border-left: 5px solid #ffcc00;
          border-top: 1px solid #eee;
          border-right: 1px solid #eee;
          border-bottom: 1px solid #eee;
        }
        .feature-icon { font-size: 2.2rem; flex-shrink: 0; }
        .feature-info { flex: 1; }
        .feature-title { font-size: 1.05rem; font-weight: bold; color: #111; text-transform: uppercase; margin-bottom: 2px; }
        .feature-desc { font-size: .88rem; color: #555; line-height: 1.25; }

        /* ── FOOTER ───────────────────────────────────────────────── */
        .footer-bar {
          background: #111; color: #fff;
          padding: 18px 24px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          font-size: .95rem;
        }
        .gym-brand { display: flex; flex-direction: column; align-items: flex-start; }
        .footer-logo { width: 72px; height: 72px; object-fit: contain; filter: brightness(1.1); }
        .gym-sub { color: #ffcc00; font-weight: bold; font-size: .85rem; text-transform: uppercase; letter-spacing: 1px; }
        .gym-details { display: flex; gap: 18px; font-size: .88rem; color: #ccc; }
        .detail-block { display: flex; flex-direction: column; }
        .detail-label { font-size: .75rem; font-weight: 800; color: #ffcc00; text-transform: uppercase; letter-spacing: .5px; }
        .detail-val { font-weight: 700; }

        /* ── PRINT ────────────────────────────────────────────────── */
        @media print {
          html, body {
            width: 8.5in !important; height: 11in !important;
            margin: 0 !important; padding: 0 !important;
            background: #fff !important;
          }
          .toolbar { display: none !important; }
          .page-wrapper {
            padding: 0 !important; margin: 0 !important;
            background: none !important; min-height: 0 !important;
            display: block !important;
          }
          .letter-page {
            width: 8.5in !important; height: 11in !important;
            max-height: 11in !important;
            padding: 0 !important; border: none !important;
            box-shadow: none !important; margin: 0 !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* ── BARRA DE CONTROL ─────────────────────────────────────── */}
      <div className="toolbar">
        <div className="toolbar-title">⚡ XTREME GYM · PÓSTER OFICIAL APP SOCIOS</div>
        <div className="toolbar-controls">
          <div className="url-input-group">
            <label htmlFor="qrUrlInput">URL del QR:</label>
            <input
              id="qrUrlInput"
              type="text"
              value={url}
              placeholder="https://..."
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <button className="btn-print" onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* ── HOJA CARTA ───────────────────────────────────────────── */}
      <div className="page-wrapper">
        <div className="letter-page">
          <div className="page-body">

            {/* HEADER */}
            <header className="header">
              <div className="top-badge">⚡ APP OFICIAL DE SOCIOS XTREME GYM</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/xtreme/logo.webp" alt="Xtreme Gym Logo" className="header-logo" />
              <h1 className="title-main">
                <span>ACTIVE SU CUENTA</span>
                <span className="title-highlight">EN LA APP DE SOCIOS</span>
              </h1>
              <p className="subtitle">
                Escanee el código QR aquí y active su cuenta al toque.<br />
                ¡Va a poder usar un montón de herramientas para seguir su plan y llevar el ritmo que quiere!
              </p>
            </header>

            {/* QR HERO */}
            <div className="qr-hero-card">
              <div className="qr-box" ref={qrRef} />
              <div className="qr-callout-badge">👉 APUNTE SU CEL AL CÓDIGO QR</div>
              <p className="qr-desc">
                Ingrese su <strong>cédula o correo</strong> y cree su perfil al toque.
              </p>
              <div className="qr-url-display">{displayUrl}</div>
            </div>

            {/* PASOS */}
            <section>
              <div className="section-title">¿CÓMO ACTIVARLA? EN 3 PASOS FÁCILES</div>
              <div className="steps-grid">
                <div className="step-card">
                  <div className="step-num">1</div>
                  <div className="step-head">APUNTE SU CEL</div>
                  <div className="step-body">Abra la cámara, enfoque el QR y toque el enlace.</div>
                </div>
                <div className="step-card">
                  <div className="step-num">2</div>
                  <div className="step-head">DIGITE SU CÉDULA O CORREO</div>
                  <div className="step-body">Use el mismo correo o cédula que tiene registrado en recepción.</div>
                </div>
                <div className="step-card">
                  <div className="step-num">3</div>
                  <div className="step-head">CREÉ SU PIN</div>
                  <div className="step-body">Ponga su clave de 4 dígitos para marcar el entreno fácil.</div>
                </div>
              </div>
            </section>

            {/* HERRAMIENTAS */}
            <section>
              <div className="section-title">HERRAMIENTAS QUE TENÉS EN LA APP</div>
              <div className="features-grid">
                <div className="feature-item">
                  <div className="feature-icon">🪪</div>
                  <div className="feature-info">
                    <div className="feature-title">Carné Digital &amp; Marcaje</div>
                    <div className="feature-desc">Entre sin filas solo digitando su cédula en recepción.</div>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">🏋️</div>
                  <div className="feature-info">
                    <div className="feature-title">Entrenamientos</div>
                    <div className="feature-desc">Registre sus sesiones y siga el plan que le mandó el profe.</div>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">⚙️</div>
                  <div className="feature-info">
                    <div className="feature-title">Guía de Máquinas</div>
                    <div className="feature-desc">Vea videos con la técnica correcta de cada aparato.</div>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">⚡</div>
                  <div className="feature-info">
                    <div className="feature-title">Reservas &amp; Rachas</div>
                    <div className="feature-desc">Reserve clases y mantenga viva su racha de entreno.</div>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* FOOTER */}
          <footer className="footer-bar">
            <div className="gym-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/xtreme/logo.webp" alt="Xtreme Gym" className="footer-logo" />
              <span className="gym-sub">CIUDAD QUESADA - SAN CARLOS</span>
            </div>
            <div className="gym-details">
              <div className="detail-block">
                <span className="detail-label">Ubicación</span>
                <span className="detail-val">Barrio San Pablo, contiguo a la plaza</span>
              </div>
              <div className="detail-block">
                <span className="detail-label">Horarios</span>
                <span className="detail-val">L-V: 5am-10pm | S: 6am-6pm | D: 7am-1pm</span>
              </div>
              <div className="detail-block">
                <span className="detail-label">WhatsApp</span>
                <span className="detail-val">8898-4000</span>
              </div>
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}
