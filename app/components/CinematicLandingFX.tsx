"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amp * noise(p);
    p = p * 2.03 + 11.7;
    amp *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv - 0.5;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);
  vec2 pointer = (u_pointer - 0.5) * vec2(0.34, 0.2);
  float time = u_time * 0.085;
  float field = fbm(p * 2.25 + vec2(time, -time * 0.42));
  float line = abs(p.y + 0.12 - sin(p.x * 2.4 + time * 2.0 + field * 2.8) * 0.16);
  float ribbon = smoothstep(0.24, 0.0, line) * smoothstep(1.05, 0.05, abs(p.x));
  float halo = smoothstep(0.5, 0.0, length(p - pointer));
  float grain = (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.035;
  vec3 gold = vec3(0.965, 0.73, 0.02);
  vec3 warm = vec3(1.0, 0.94, 0.72);
  vec3 color = mix(gold, warm, clamp(field * 0.7 + halo * 0.25, 0.0, 1.0));
  float alpha = ribbon * (0.055 + field * 0.11) + halo * 0.035 + grain;
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.2));
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function CinematicLandingFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas?.closest<HTMLElement>("[data-cinema-stage]");
    if (!canvas || !stage) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compactViewport = window.matchMedia("(max-width: 767px)").matches;
    const revealItems = document.querySelectorAll<HTMLElement>("[data-cinema-reveal]");
    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.cinemaVisible = "true";
          revealObserver.unobserve(entry.target);
        }
      }),
      { threshold: 0.14, rootMargin: "0px 0px -8%" },
    );
    revealItems.forEach((item) => revealObserver.observe(item));

    const cards = document.querySelectorAll<HTMLElement>("[data-cinema-card]");
    const cardCleanups = [...cards].map((card) => {
      const move = (event: PointerEvent) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
        card.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
      };
      card.addEventListener("pointermove", move);
      return () => card.removeEventListener("pointermove", move);
    });

    let targetX = 0;
    let targetY = 0;
    let parallaxFrame = 0;
    const updateParallax = () => {
      stage.style.setProperty("--cinema-x", `${targetX * 12}px`);
      stage.style.setProperty("--cinema-y", `${targetY * 8}px`);
      parallaxFrame = 0;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion || event.pointerType === "touch") return;
      const rect = stage.getBoundingClientRect();
      targetX = (event.clientX - rect.left) / rect.width - 0.5;
      targetY = (event.clientY - rect.top) / rect.height - 0.5;
      if (!parallaxFrame) parallaxFrame = requestAnimationFrame(updateParallax);
    };
    stage.addEventListener("pointermove", onPointerMove, { passive: true });

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
      premultipliedAlpha: true,
    });
    if (!gl) {
      return () => {
        revealObserver.disconnect();
        cardCleanups.forEach((cleanup) => cleanup());
        stage.removeEventListener("pointermove", onPointerMove);
      };
    }

    const vertex = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, "u_resolution");
    const pointer = gl.getUniformLocation(program, "u_pointer");
    const time = gl.getUniformLocation(program, "u_time");
    const pointerState = { x: 0.66, y: 0.44, tx: 0.66, ty: 0.44 };
    let running = true;
    let visible = true;
    let frame = 0;
    let lastDraw = -100;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, compactViewport ? 1.15 : 1.5);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };
    const shaderPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerState.tx = (event.clientX - rect.left) / rect.width;
      pointerState.ty = 1 - (event.clientY - rect.top) / rect.height;
    };
    const render = (now: number) => {
      if (!running) return;
      const frameInterval = compactViewport ? 1000 / 30 : 0;
      if (visible && now - lastDraw >= frameInterval) {
        lastDraw = now;
        resize();
        pointerState.x += (pointerState.tx - pointerState.x) * 0.045;
        pointerState.y += (pointerState.ty - pointerState.y) * 0.045;
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.uniform2f(pointer, pointerState.x, pointerState.y);
        gl.uniform1f(time, reducedMotion ? 0 : now * 0.001);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (!reducedMotion) frame = requestAnimationFrame(render);
    };
    const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibilityObserver.observe(stage);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    stage.addEventListener("pointermove", shaderPointer, { passive: true });
    render(0);

    return () => {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      if (parallaxFrame) cancelAnimationFrame(parallaxFrame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      revealObserver.disconnect();
      cardCleanups.forEach((cleanup) => cleanup());
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointermove", shaderPointer);
      gl.deleteProgram(program);
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[2] h-full w-full opacity-90" aria-hidden="true" />;
}
