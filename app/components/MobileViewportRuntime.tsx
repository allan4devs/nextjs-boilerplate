"use client";

import { useEffect, useRef } from "react";

const KEYBOARD_THRESHOLD_PX = 120;

function isIosLikeDevice() {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isEditableTarget(target: EventTarget | null): target is HTMLElement {
  return (
    target instanceof HTMLElement &&
    (target.matches("input, textarea, select") || target.isContentEditable)
  );
}

/**
 * Mantiene una altura CSS basada en el viewport realmente visible.
 * `dvh` no siempre se reduce con el teclado en iOS/PWA; VisualViewport sí.
 */
export default function MobileViewportRuntime() {
  const largestHeightRef = useRef(0);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const ios = isIosLikeDevice();
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

    root.dataset.xgPlatform = ios ? "ios" : "other";
    root.dataset.xgDisplayMode = standalone ? "standalone" : "browser";

    const visibleHeight = () => Math.round(viewport?.height ?? window.innerHeight);
    const updateViewport = () => {
      const height = visibleHeight();
      const focused = isEditableTarget(document.activeElement);

      if (!focused || height > largestHeightRef.current) {
        largestHeightRef.current = Math.max(largestHeightRef.current, height);
      }
      const keyboardOpen =
        focused && largestHeightRef.current - height >= KEYBOARD_THRESHOLD_PX;

      root.style.setProperty("--xg-visual-viewport-height", `${height}px`);
      root.style.setProperty(
        "--xg-visual-viewport-offset",
        `${Math.max(0, Math.round(viewport?.offsetTop ?? 0))}px`,
      );
      root.dataset.xgKeyboard = keyboardOpen ? "open" : "closed";
    };

    const revealFocusedControl = (event: FocusEvent) => {
      updateViewport();
      const control = event.target;
      if (!isEditableTarget(control)) return;
      if (!control.closest(".xg-os-login-shell, .xg-keyboard-panel")) return;
      window.setTimeout(() => {
        updateViewport();
        control.scrollIntoView({ block: "center", inline: "nearest" });
      }, 120);
    };
    const afterFocusLeaves = () => window.setTimeout(updateViewport, 160);
    const resetForOrientation = () => {
      largestHeightRef.current = 0;
      window.setTimeout(updateViewport, 120);
    };

    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", resetForOrientation);
    document.addEventListener("focusin", revealFocusedControl);
    document.addEventListener("focusout", afterFocusLeaves);

    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", resetForOrientation);
      document.removeEventListener("focusin", revealFocusedControl);
      document.removeEventListener("focusout", afterFocusLeaves);
      root.style.removeProperty("--xg-visual-viewport-height");
      root.style.removeProperty("--xg-visual-viewport-offset");
      delete root.dataset.xgKeyboard;
      delete root.dataset.xgPlatform;
      delete root.dataset.xgDisplayMode;
    };
  }, []);

  return null;
}
