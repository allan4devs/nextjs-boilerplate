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
  startCamera: () => Promise<void>;
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

  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCameraOn(true);
    } catch {
      setCameraError(permissionErrorMessage);
      setCameraOn(false);
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
