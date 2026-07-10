"use client";

import { useMemo, useState } from "react";

/**
 * Graficas SVG livianas para el tema oscuro del app.
 * Colores de marca validados para datos sobre superficie #0d0d0d:
 * lima #65a30d y cian #0891b2 (contraste >= 3:1, banda de luminosidad OK).
 */
export const CHART_LIME = "#65a30d";
export const CHART_CYAN = "#0891b2";

const SURFACE = "#101010";
const GRID = "rgba(255,255,255,0.08)";
const TICK_TEXT = "rgba(255,255,255,0.45)";
const LABEL_TEXT = "rgba(255,255,255,0.85)";

type Point = { date: string; value: number };

function niceTicks(min: number, max: number): number[] {
  if (max <= min) return [min];
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span)));
  const norm = span / step;
  const unit = norm >= 5 ? step * 2 : norm >= 2.5 ? step : step / 2;
  const start = Math.ceil(min / unit) * unit;
  const ticks: number[] = [];
  for (let v = start; v <= max + 1e-9; v += unit) ticks.push(Math.round(v * 100) / 100);
  return ticks.slice(0, 5);
}

function formatValue(value: number) {
  return value.toLocaleString("es-CR", { maximumFractionDigits: 1 });
}

function shortDate(date: string) {
  return date.slice(5).replace("-", "/");
}

/** Linea de tendencia (una serie): 2px, marcador final con anillo, crosshair + tooltip. */
export function LineTrendChart({
  data,
  unit,
  color = CHART_LIME,
  height = 170,
}: {
  data: Point[];
  unit: string;
  color?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = height;
  const pad = { top: 16, right: 56, bottom: 24, left: 44 };

  const { points, ticks, yFor } = useMemo(() => {
    const values = data.map((d) => d.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const spread = Math.max(rawMax - rawMin, 1);
    const min = rawMin - spread * 0.15;
    const max = rawMax + spread * 0.15;
    const xFor = (i: number) =>
      data.length === 1
        ? (pad.left + W - pad.right) / 2
        : pad.left + (i * (W - pad.left - pad.right)) / (data.length - 1);
    const yFor = (v: number) => pad.top + (1 - (v - min) / (max - min)) * (H - pad.top - pad.bottom);
    return {
      points: data.map((d, i) => ({ ...d, x: xFor(i), y: yFor(d.value) })),
      ticks: niceTicks(rawMin, rawMax),
      yFor,
    };
  }, [data, H, pad.left, pad.right, pad.top, pad.bottom]);

  if (!data.length) return null;
  const last = points[points.length - 1];
  const active = hover !== null ? points[hover] : null;

  function onMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={yFor(t)} y2={yFor(t)} stroke={GRID} strokeWidth={1} />
            <text x={pad.left - 6} y={yFor(t) + 3.5} textAnchor="end" fontSize={11} fill={TICK_TEXT}>
              {formatValue(t)}
            </text>
          </g>
        ))}
        <line x1={pad.left} x2={W - pad.right} y1={H - pad.bottom} y2={H - pad.bottom} stroke={GRID} strokeWidth={1} />

        {points.map((p, i) =>
          i === 0 || i === points.length - 1 || points.length <= 6 ? (
            <text key={p.date} x={p.x} y={H - pad.bottom + 15} textAnchor="middle" fontSize={10.5} fill={TICK_TEXT}>
              {shortDate(p.date)}
            </text>
          ) : null,
        )}

        {active && (
          <line x1={active.x} x2={active.x} y1={pad.top} y2={H - pad.bottom} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
        )}

        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Marcador final con anillo de superficie */}
        <circle cx={last.x} cy={last.y} r={6.5} fill={SURFACE} />
        <circle cx={last.x} cy={last.y} r={4.5} fill={color} />
        <text x={last.x + 9} y={last.y + 4} fontSize={12} fontWeight={700} fill={LABEL_TEXT}>
          {formatValue(last.value)} {unit}
        </text>

        {active && active !== last && (
          <>
            <circle cx={active.x} cy={active.y} r={6.5} fill={SURFACE} />
            <circle cx={active.x} cy={active.y} r={4.5} fill={color} />
          </>
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 border border-white/15 bg-black/90 px-2.5 py-1.5 text-xs font-bold text-white"
          style={{ left: `${(active.x / W) * 100}%` }}
        >
          {active.date} · {formatValue(active.value)} {unit}
        </div>
      )}
    </div>
  );
}

/** Barras (una serie): <=24px de grosor, punta redondeada 4px, gap de 2px, tooltip por barra. */
export function BarTrendChart({
  data,
  unit,
  color = CHART_LIME,
  height = 170,
  compactValue,
}: {
  data: Point[];
  unit: string;
  color?: string;
  height?: number;
  compactValue?: (value: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = height;
  const pad = { top: 18, right: 12, bottom: 24, left: 44 };

  const max = Math.max(...data.map((d) => d.value), 1);
  const ticks = niceTicks(0, max);
  const yFor = (v: number) => pad.top + (1 - v / (ticks.at(-1)! > max ? ticks.at(-1)! : max)) * (H - pad.top - pad.bottom);
  const band = (W - pad.left - pad.right) / Math.max(data.length, 1);
  const barW = Math.min(24, Math.max(6, band - 2));
  const maxIndex = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const fmt = compactValue ?? formatValue;

  if (!data.length) return null;
  const active = hover !== null ? data[hover] : null;
  const activeX = hover !== null ? pad.left + hover * band + band / 2 : 0;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={yFor(t)} y2={yFor(t)} stroke={GRID} strokeWidth={1} />
            <text x={pad.left - 6} y={yFor(t) + 3.5} textAnchor="end" fontSize={11} fill={TICK_TEXT}>
              {fmt(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = pad.left + i * band + band / 2;
          const y = yFor(d.value);
          const baseline = H - pad.bottom;
          const h = Math.max(baseline - y, d.value > 0 ? 3 : 0);
          const r = Math.min(4, barW / 2, h);
          const x = cx - barW / 2;
          return (
            <g key={d.date}>
              {/* zona de hover mas grande que la barra */}
              <rect
                x={pad.left + i * band}
                y={pad.top}
                width={band}
                height={H - pad.top - pad.bottom}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
              {h > 0 && (
                <path
                  d={`M ${x} ${baseline} V ${y + r} Q ${x} ${y} ${x + r} ${y} H ${x + barW - r} Q ${x + barW} ${y} ${x + barW} ${y + r} V ${baseline} Z`}
                  fill={color}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                  pointerEvents="none"
                />
              )}
              {(i === 0 || i === data.length - 1 || data.length <= 8) && (
                <text x={cx} y={H - pad.bottom + 15} textAnchor="middle" fontSize={10.5} fill={TICK_TEXT}>
                  {shortDate(d.date)}
                </text>
              )}
              {i === maxIndex && d.value > 0 && (
                <text x={cx} y={y - 6} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={LABEL_TEXT}>
                  {fmt(d.value)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={pad.left} x2={W - pad.right} y1={H - pad.bottom} y2={H - pad.bottom} stroke={GRID} strokeWidth={1} />
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 border border-white/15 bg-black/90 px-2.5 py-1.5 text-xs font-bold text-white"
          style={{ left: `${(activeX / W) * 100}%` }}
        >
          {active.date} · {fmt(active.value)} {unit}
        </div>
      )}
    </div>
  );
}
