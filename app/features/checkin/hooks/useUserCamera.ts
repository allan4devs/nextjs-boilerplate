"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export type UseUserCameraOptions = {
  idealWidth: number;
  idealHeight: number;
  permissionErrorMessage: string;
};

export type UserCamera = {
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraOn: boolean;
  cameraError: string;
  reportCameraError: (message: string) => void;
  startCamera: (facingMode?: "user" | "environment") => Promise<boolean>;
  stopCamera: () => void;
};

export function useUserCamera({
  idealWidth,
  idealHeight,
  permissionErrorMessage,
}: UseUserCameraOptions): UserCamera {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const reportCameraError = useCallback((message: string) => {
    setCameraError(message);
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async (facingMode: "user" | "environment" = "user") => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Este navegador no permite usar la cámara aquí. Abra la recepción con HTTPS o use el lector/teclado.",
      );
      return false;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("camera-video-missing");
      }
      video.srcObject = stream;
      await video.play();
      setCameraOn(true);
      return true;
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      const message =
        name === "NotAllowedError" || name === "SecurityError"
          ? "La cámara está bloqueada. Permítala en la configuración del navegador e intente de nuevo."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "No encontramos una cámara disponible en este dispositivo."
            : name === "NotReadableError"
              ? "La cámara está siendo usada por otra aplicación. Ciérrela e intente de nuevo."
              : permissionErrorMessage;
      setCameraError(message);
      setCameraOn(false);
      return false;
    }
  }, [idealHeight, idealWidth, permissionErrorMessage, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    videoRef,
    cameraOn,
    cameraError,
    reportCameraError,
    startCamera,
    stopCamera,
  };
}
