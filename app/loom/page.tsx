'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Download, FileVideo2, Play, RotateCcw, Share2, Square, Upload, Video, X } from 'lucide-react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

type Status = 'idle' | 'ready' | 'recording' | 'finalizing' | 'stopped' | 'error';
type PdfDocument = Awaited<ReturnType<typeof getDocument>['promise']>;
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export default function Page() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasWebcam, setHasWebcam] = useState(false);
  const [hasScreen, setHasScreen] = useState(false);
  const [includeCamera, setIncludeCamera] = useState(true);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedName, setRecordedName] = useState<string | null>(null);
  const [recordedSize, setRecordedSize] = useState(0);
  const [recordingBytes, setRecordingBytes] = useState(0);
  const [finalizeStep, setFinalizeStep] = useState('');
  const [uploadedVideoName, setUploadedVideoName] = useState<string | null>(null);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [slideUrl, setSlideUrl] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [slideReady, setSlideReady] = useState(false);
  const [videoIsBubble, setVideoIsBubble] = useState(false);
  const [isPresentationFullscreen, setIsPresentationFullscreen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const webcamOverlayRef = useRef<HTMLVideoElement>(null);
  const uploadedVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const presentationStageRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingDoneRef = useRef<Promise<void> | null>(null);
  const resolveRecordingDoneRef = useRef<(() => void) | null>(null);
  const saveFileHandleRef = useRef<Promise<FileSystemFileHandle | null> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const recordingFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const uploadedVideoUrlRef = useRef<string | null>(null);
  const slideFileRef = useRef<File | null>(null);
  const slideImageRef = useRef<HTMLImageElement | null>(null);
  const slideIndexRef = useRef(0);
  const slideRenderQueueRef = useRef(Promise.resolve());
  const videoAudioStreamRef = useRef<MediaStream | null>(null);
  const pdfRef = useRef<PdfDocument | null>(null);
  const pdfTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const cleanupRecording = useCallback(() => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    videoAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
    videoAudioStreamRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  const cleanupStreams = useCallback(() => {
    webcamStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    webcamStreamRef.current = null;
    screenStreamRef.current = null;
    setHasWebcam(false);
    setHasScreen(false);
    cleanupRecording();
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    if (recordingFrameRef.current !== null) cancelAnimationFrame(recordingFrameRef.current);
    recordingFrameRef.current = null;
  }, [cleanupRecording]);

  useEffect(() => () => {
    cleanupStreams();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    if (uploadedVideoUrlRef.current) URL.revokeObjectURL(uploadedVideoUrlRef.current);
    if (slideUrl) URL.revokeObjectURL(slideUrl);
    void pdfTaskRef.current?.destroy();
  }, [cleanupStreams, recordedUrl, slideUrl]);

  const startDrawLoop = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const draw = () => {
      const { width, height } = canvas;
      ctx.fillStyle = '#111318';
      ctx.fillRect(0, 0, width, height);
      const slide = slideImageRef.current;
      if (slide && slide.complete && slide.naturalWidth > 0) {
        const scale = Math.min(width / slide.naturalWidth, height / slide.naturalHeight);
        const drawWidth = slide.naturalWidth * scale;
        const drawHeight = slide.naturalHeight * scale;
        ctx.fillStyle = '#202127';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(slide, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      } else {
        ctx.fillStyle = '#1b1d22';
        ctx.fillRect(18, 18, width - 36, height - 36);
        ctx.strokeStyle = '#33363e';
        ctx.lineWidth = 2;
        ctx.strokeRect(19, 19, width - 38, height - 38);
      }
      const video = uploadedVideoRef.current;
      const camera = webcamVideoRef.current;
      const bubble = videoIsBubble && video && video.readyState >= 2 && video.videoWidth > 0 ? video : null;
      const overlay = bubble ?? (includeCamera && hasWebcam && camera && camera.readyState >= 2 && camera.videoWidth > 0 ? camera : null);
      if (overlay) {
        const diameter = Math.round(height * (bubble ? 0.29 : 0.245));
        const margin = Math.round(height * 0.035);
        const cx = width - margin - diameter / 2;
        const cy = height - margin - diameter / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
        ctx.clip();
        const scale = Math.max(diameter / overlay.videoWidth, diameter / overlay.videoHeight);
        const w = overlay.videoWidth * scale;
        const h = overlay.videoHeight * scale;
        ctx.translate(cx, cy);
        if (!bubble) ctx.scale(-1, 1);
        ctx.drawImage(overlay, -w / 2, -h / 2, w, h);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(5, height * 0.008);
        ctx.stroke();
      }
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, [hasWebcam, includeCamera, videoIsBubble]);

  useEffect(() => {
    if (hasWebcam) {
      for (const video of [webcamVideoRef.current, webcamOverlayRef.current]) {
        if (video && webcamStreamRef.current && video.srcObject !== webcamStreamRef.current) {
          video.srcObject = webcamStreamRef.current;
          void video.play().catch(() => {});
        }
      }
    }
    const uploadedVideo = uploadedVideoRef.current;
    if (uploadedVideo && uploadedVideoUrlRef.current && uploadedVideo.src !== uploadedVideoUrlRef.current) {
      uploadedVideo.src = uploadedVideoUrlRef.current;
    }
    startDrawLoop();
  }, [hasWebcam, includeCamera, startDrawLoop, uploadedVideoName, slideReady]);

  useEffect(() => {
    if (status !== 'recording') return;
    startTimeRef.current = Date.now();
    const timer = window.setInterval(() => {
      if (startTimeRef.current) setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
    return () => window.clearInterval(timer);
  }, [status]);

  const enableWebcam = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: true });
      webcamStreamRef.current = stream;
      setHasWebcam(true);
      setStatus((current) => current === 'idle' ? 'ready' : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not access your camera and microphone.');
      setStatus('error');
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (uploadedVideoUrlRef.current) URL.revokeObjectURL(uploadedVideoUrlRef.current);
    uploadedVideoUrlRef.current = URL.createObjectURL(file);
    setUploadedVideoName(file.name);
    setVideoIsBubble(Boolean(slideFileRef.current));
    setStatus((current) => current === 'idle' ? 'ready' : current);
    event.target.value = '';
  };

  const renderPdfPage = async (file: File, pageIndex: number) => {
    try {
      if (!pdfTaskRef.current) pdfTaskRef.current = getDocument({ data: await file.arrayBuffer() });
      const pdf = pdfRef.current ?? await pdfTaskRef.current.promise;
      pdfRef.current = pdf;
      setSlideCount(pdf.numPages);
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1.8 });
      const rendered = document.createElement('canvas');
      rendered.width = Math.ceil(viewport.width);
      rendered.height = Math.ceil(viewport.height);
      const context = rendered.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable.');
      await page.render({ canvas: rendered, canvasContext: context, viewport }).promise;
      const image = new Image();
      image.onload = () => { slideImageRef.current = image; setSlideReady(true); };
      image.src = rendered.toDataURL('image/png');
      setError(null);
    } catch {
      setError('This PDF could not be rendered. Try another PDF file.');
    }
  };

  const handleDocUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('PowerPoint files are not supported yet. Export the presentation as PDF and upload that file.');
      return;
    }
    try {
      await pdfTaskRef.current?.destroy();
      pdfTaskRef.current = null;
      pdfRef.current = null;
      if (slideUrl) URL.revokeObjectURL(slideUrl);
      setSlideReady(false);
      slideImageRef.current = null;
      slideFileRef.current = file;
      setSlideUrl(URL.createObjectURL(file));
      setUploadedDocName(file.name);
      setSlideIndex(0);
      slideIndexRef.current = 0;
      setVideoIsBubble(Boolean(uploadedVideoName));
      await renderPdfPage(file, 0);
      setStatus((current) => current === 'idle' ? 'ready' : current);
    } catch {
      setError('This PDF could not be opened. Try another file.');
    }
  };

  const moveSlide = useCallback((direction: number) => {
    const file = slideFileRef.current;
    if (!file || slideCount < 1) return;
    const next = Math.max(0, Math.min(slideCount - 1, slideIndexRef.current + direction));
    if (next === slideIndexRef.current) return;
    slideIndexRef.current = next;
    setSlideIndex(next);
    setSlideReady(false);
    slideRenderQueueRef.current = slideRenderQueueRef.current.then(() => renderPdfPage(file, next));
  }, [slideCount]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!slideUrl || !['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', ' '].includes(event.key)) return;
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
      event.preventDefault();
      moveSlide(event.key === 'ArrowLeft' || event.key === 'PageUp' ? -1 : 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveSlide, slideUrl]);


  const startRecording = async () => {
    setError(null);
    if (document.fullscreenElement !== presentationStageRef.current) {
      setError('Enter presentation full screen before starting the recording.');
      return;
    }
    const displayStream = screenStreamRef.current;
    if (!displayStream || displayStream.getVideoTracks().every((track) => track.readyState === 'ended')) {
      setError('Allow screen capture before entering full screen.');
      return;
    }
    const uploadedVideo = uploadedVideoRef.current;
    if (uploadedVideo && uploadedVideoUrlRef.current) {
      uploadedVideo.currentTime = 0;
      try {
        // Start playback directly from the Record button gesture so browser autoplay policy allows it.
        await uploadedVideo.play();
      } catch {
        setError('The uploaded video could not play. Check that the file is a supported video format.');
        return;
      }
    }
    chunksRef.current = [];
    try {
      if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') throw new Error('Chrome screen recording is not available in this browser.');
      const screenVideo = screenVideoRef.current;
      if (screenVideo) {
        screenVideo.srcObject = displayStream;
        await screenVideo.play().catch(() => {});
        if (screenVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          await new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error('Chrome screen capture did not start.')), 10000);
            screenVideo.addEventListener('loadeddata', () => { window.clearTimeout(timeout); resolve(); }, { once: true });
          });
        }
      }
      const videoTracks = displayStream.getVideoTracks();
      if (!videoTracks.length) throw new Error('Chrome did not provide a screen video track.');

      const recordingCanvas = document.createElement('canvas');
      recordingCanvas.width = 1920;
      recordingCanvas.height = 1080;
      const recordingContext = recordingCanvas.getContext('2d');
      if (!recordingContext || !recordingCanvas.captureStream) throw new Error('Canvas recording is not supported by this browser.');
      const drawRecordingFrame = () => {
        const width = recordingCanvas.width;
        const height = recordingCanvas.height;
        recordingContext.fillStyle = '#101116';
        recordingContext.fillRect(0, 0, width, height);
        if (screenVideo && screenVideo.videoWidth > 0 && screenVideo.videoHeight > 0) {
          const scale = Math.min(width / screenVideo.videoWidth, height / screenVideo.videoHeight);
          const drawWidth = screenVideo.videoWidth * scale;
          const drawHeight = screenVideo.videoHeight * scale;
          recordingContext.drawImage(screenVideo, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
        }
        recordingFrameRef.current = requestAnimationFrame(drawRecordingFrame);
      };
      drawRecordingFrame();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();
      const audioStreams = [displayStream, webcamStreamRef.current].filter((source): source is MediaStream => Boolean(source));
      for (const source of audioStreams) {
        const tracks = source.getAudioTracks();
        if (tracks.length) audioCtx.createMediaStreamSource(new MediaStream(tracks)).connect(destination);
      }
      const captureVideoStream = (uploadedVideo as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream;
      if (uploadedVideo && captureVideoStream) {
        videoAudioStreamRef.current = captureVideoStream.call(uploadedVideo);
        const videoAudio = videoAudioStreamRef.current.getAudioTracks();
        if (videoAudio.length) audioCtx.createMediaStreamSource(new MediaStream(videoAudio)).connect(destination);
      }
      const stream = recordingCanvas.captureStream(30);
      for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
      recordingStreamRef.current = stream;
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const mimeType = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('MP4 recording is not supported by this Chrome installation. Update Chrome or enable an available H.264 encoder, then try again.');
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (item) => {
        if (item.data.size) {
          chunksRef.current.push(item.data);
          setRecordingBytes((size) => size + item.data.size);
        }
      };
      recordingDoneRef.current = new Promise<void>((resolve) => {
        resolveRecordingDoneRef.current = resolve;
        recorder.onstop = async () => {
          setFinalizeStep('Finishing the recording…');
          await new Promise<void>((done) => requestAnimationFrame(() => done()));
          setFinalizeStep('Preparing the video file…');
          const type = recorder.mimeType || mimeType;
          const blob = new Blob(chunksRef.current, { type });
          if (!blob.size) {
            setError('The browser did not produce a playable recording. Try another browser or recording format.');
            cleanupRecording();
            setStatus('error');
            resolveRecordingDoneRef.current?.();
            resolveRecordingDoneRef.current = null;
            return;
          }
          const fileName = `loom-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`;
          const fileUrl = URL.createObjectURL(blob);
          setRecordedSize(blob.size);
          setRecordedName(fileName);
          setRecordedUrl((oldUrl) => { if (oldUrl) URL.revokeObjectURL(oldUrl); return fileUrl; });
          const saveHandle = await saveFileHandleRef.current;
          if (saveHandle) {
            try {
              setFinalizeStep('Saving the video…');
              const writable = await saveHandle.createWritable();
              await writable.write(blob);
              await writable.close();
            } catch {
              setFinalizeStep('The save dialog could not write the file. Use Download video below.');
            }
          } else {
            const downloadLink = document.createElement('a');
            downloadLink.href = fileUrl;
            downloadLink.download = fileName;
            downloadLink.style.display = 'none';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
          }
          if (recordingFrameRef.current !== null) cancelAnimationFrame(recordingFrameRef.current);
          recordingFrameRef.current = null;
          cleanupRecording();
          displayStream.getTracks().forEach((track) => track.stop());
          screenStreamRef.current = null;
          setHasScreen(false);
          if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
          setFinalizeStep('Video ready. Download it below.');
          setStatus('stopped');
          resolveRecordingDoneRef.current?.();
          resolveRecordingDoneRef.current = null;
        };
      });
      recorder.onerror = () => {
        uploadedVideoRef.current?.pause();
        setError('Recording stopped because the browser encountered an error.');
        if (recordingFrameRef.current !== null) cancelAnimationFrame(recordingFrameRef.current);
        recordingFrameRef.current = null;
        cleanupRecording();
        displayStream.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
        setHasScreen(false);
        if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
        setStatus('error');
        setFinalizeStep('');
        resolveRecordingDoneRef.current?.();
        resolveRecordingDoneRef.current = null;
      };
      mediaRecorderRef.current = recorder;
      if (document.fullscreenElement !== presentationStageRef.current || screenStreamRef.current !== displayStream || videoTracks.every((track) => track.readyState === 'ended')) {
        throw new Error('Stay in presentation full screen to record.');
      }
      recorder.start(250);
      setElapsed(0);
      setRecordingBytes(0);
      setFinalizeStep('');
      setStatus('recording');
    } catch (cause) {
      uploadedVideoRef.current?.pause();
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setHasScreen(false);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      cleanupRecording();
      setError(cause instanceof Error ? cause.message : 'Could not start recording.');
      setStatus('error');
    }
  };

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      uploadedVideoRef.current?.pause();
      setStatus('finalizing');
      setFinalizeStep('Finishing the recording…');
      const pickerWindow = window as Window & {
        showSaveFilePicker?: (options: {
          suggestedName: string;
          types: Array<{ description: string; accept: Record<string, string[]> }>;
        }) => Promise<FileSystemFileHandle>;
      };
      const picker = pickerWindow.showSaveFilePicker;
      saveFileHandleRef.current = picker
        ? picker({
            suggestedName: `loom-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`,
            types: [{ description: 'MP4 video', accept: { 'video/mp4': ['.mp4'] } }],
          }).catch(() => null)
        : Promise.resolve(null);
      try { recorder.requestData(); } catch { /* the final data event still fires on stop */ }
      recorder.stop();
      await recordingDoneRef.current;
    }
  }, []);

  const requestScreenPermission = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Chrome screen recording is not available in this browser.');
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser', frameRate: { ideal: 30, max: 60 } },
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        monitorTypeSurfaces: 'exclude',
      } as DisplayMediaStreamOptions & { preferCurrentTab?: boolean; selfBrowserSurface?: string; monitorTypeSurfaces?: string });
      const videoTrack = displayStream.getVideoTracks()[0];
      if (!videoTrack) throw new Error('Chrome did not provide a screen video track.');
      if (videoTrack.getSettings().displaySurface !== 'browser') {
        displayStream.getTracks().forEach((track) => track.stop());
        throw new Error('Choose This tab in Chrome’s picker so only the presentation is captured.');
      }
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = displayStream;
      setHasScreen(true);
      videoTrack.addEventListener('ended', () => {
        if (screenStreamRef.current !== displayStream) return;
        screenStreamRef.current = null;
        setHasScreen(false);
        setError('Screen capture permission ended. Allow it again before entering full screen.');
        if (mediaRecorderRef.current?.state === 'recording') void stopRecording();
      }, { once: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not get screen capture permission.');
    }
  };

  const enterPresentationFullscreen = async () => {
    setError(null);
    if (!screenStreamRef.current) {
      setError('Allow screen capture before entering full screen.');
      return;
    }
    try {
      await presentationStageRef.current?.requestFullscreen();
    } catch {
      setError('Your browser could not enter presentation full screen.');
    }
  };

  const exitPresentationFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === presentationStageRef.current;
      setIsPresentationFullscreen(active);
      if (!active) {
        uploadedVideoRef.current?.pause();
        if (mediaRecorderRef.current?.state === 'recording') void stopRecording();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isPresentationFullscreen && mediaRecorderRef.current?.state === 'recording') {
        void stopRecording();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [isPresentationFullscreen, stopRecording]);

  const reset = async () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    cleanupStreams();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    if (uploadedVideoUrlRef.current) URL.revokeObjectURL(uploadedVideoUrlRef.current);
    if (slideUrl) URL.revokeObjectURL(slideUrl);
    await pdfTaskRef.current?.destroy();
    pdfTaskRef.current = null;
    pdfRef.current = null;
    uploadedVideoUrlRef.current = null;
    slideFileRef.current = null;
    slideImageRef.current = null;
    setRecordedUrl(null);
    setRecordedName(null);
    setUploadedVideoName(null);
    setUploadedDocName(null);
    setSlideUrl(null);
    setSlideReady(false);
    setSlideIndex(0);
    setSlideCount(0);
    setVideoIsBubble(false);
    setError(null);
    setElapsed(0);
    setIncludeCamera(true);
    setStatus('idle');
    if (uploadedVideoRef.current) { uploadedVideoRef.current.pause(); uploadedVideoRef.current.removeAttribute('src'); uploadedVideoRef.current.load(); }
    if (webcamVideoRef.current) webcamVideoRef.current.srcObject = null;
    if (webcamOverlayRef.current) webcamOverlayRef.current.srcObject = null;
  };

  const hasSource = Boolean(slideReady || uploadedVideoName || hasWebcam || hasScreen);

  return (
    <main className="min-h-screen bg-[#090a0c] text-white selection:bg-violet-400/30">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 pb-5 sm:px-6 lg:px-10">
        <header className="flex min-h-[76px] items-center justify-between border-b border-white/[0.08]">
          <a href="/loom" className="flex items-center gap-3" aria-label="Loom Studio home">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg shadow-violet-950/40"><Video className="size-5 text-white" /></span>
            <span><span className="block text-sm font-semibold tracking-tight">loom studio</span><span className="block text-[11px] text-zinc-500">A little more you in every video</span></span>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 sm:flex"><span className={`size-1.5 rounded-full ${status === 'recording' ? 'animate-pulse bg-rose-400' : status === 'finalizing' ? 'animate-pulse bg-amber-300' : 'bg-emerald-400'}`} />{status === 'recording' ? `Recording ${formatDuration(elapsed)} · ${(recordingBytes / (1024 * 1024)).toFixed(1)} MB` : status === 'finalizing' ? 'Generating video…' : status === 'stopped' ? 'Video ready' : 'Ready when you are'}</span>
            {status === 'recording' ? <button onClick={stopRecording} className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-400"><Square className="size-3.5 fill-current" /> Stop</button> : status === 'finalizing' ? <span role="status" className="inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2.5 text-sm text-amber-100"><span className="size-2 animate-pulse rounded-full bg-amber-300" /> Generating…</span> : hasScreen ? <button onClick={enterPresentationFullscreen} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"><span className="size-2 rounded-full bg-rose-500" /> Enter full screen</button> : <button onClick={() => void requestScreenPermission()} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"><span className="size-2 rounded-full bg-rose-500" /> Allow screen capture</button>}
            {recordedUrl && <a href={recordedUrl} download={recordedName ?? 'loom-recording.webm'} title="Download recording" className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400"><Download className="size-4" /><span className="hidden sm:inline">Download video</span></a>}
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-8 lg:py-8">
          <section className="flex min-w-0 flex-col">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-violet-300">Your recording room</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Make something worth sharing.</h1><p className="mt-1.5 text-sm text-zinc-500">Upload slides and a video, then record your presentation.</p></div>
              <button onClick={() => void reset()} disabled={!hasSource && !recordedUrl && !error} className="hidden items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-500 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-30 sm:inline-flex"><RotateCcw className="size-3.5" /> Reset</button>
            </div>

            <div ref={presentationStageRef} className={`relative aspect-video w-full overflow-hidden border border-white/10 bg-[#131419] shadow-2xl shadow-black/40 ${isPresentationFullscreen ? '!h-screen !w-screen !max-w-none !aspect-auto !rounded-none !border-0 shadow-none' : 'rounded-2xl'}`}>
              <video ref={screenVideoRef} autoPlay muted playsInline className="fixed -left-2 -top-2 size-px opacity-0" />
              <video ref={uploadedVideoRef} loop playsInline className="fixed -left-2 -top-2 size-px opacity-0" />
              <video ref={webcamVideoRef} autoPlay muted playsInline className="fixed -left-2 -top-2 size-px opacity-0" />
              <canvas ref={canvasRef} width={1920} height={1080} className="absolute inset-0 size-full object-contain" />
              {!slideUrl && !slideReady && <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_rgba(124,58,237,0.12),_transparent_55%)] px-5 text-center"><div className="mb-4 grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400"><FileVideo2 className="size-7" /></div><p className="text-sm font-medium text-zinc-200">Your stage is ready</p><p className="mt-1 max-w-sm text-xs leading-5 text-zinc-500">Upload a PDF presentation. Your uploaded video appears in a circle.</p></div>}
              {isPresentationFullscreen && status !== 'recording' && status !== 'finalizing' && <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-4 bg-gradient-to-b from-black/75 to-transparent p-6"><div><p className="text-sm font-semibold text-white">Presentation full screen</p><p className="mt-1 text-xs text-white/70">Use the arrow keys to navigate slides, then press Esc to stop and save.</p>{error && <p role="alert" className="mt-2 text-xs text-rose-200">{error}</p>}</div><div className="flex items-center gap-2"><button onClick={() => void exitPresentationFullscreen()} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white">Exit</button><button onClick={startRecording} className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white"><span className="size-2 rounded-full bg-white" /> Start recording</button></div></div>}
              {slideUrl && status !== 'recording' && status !== 'finalizing' && <div className="absolute inset-x-4 bottom-4 flex items-center justify-between"><button aria-label="Previous slide" disabled={slideIndex <= 0} onClick={() => moveSlide(-1)} className="grid size-12 place-items-center rounded-full bg-black/70 text-white backdrop-blur disabled:opacity-40"><ChevronLeft /></button><span className="rounded-full bg-black/70 px-3 py-1.5 text-xs text-white">{slideIndex + 1} / {slideCount} · ← →</span><button aria-label="Next slide" disabled={slideIndex >= slideCount - 1} onClick={() => moveSlide(1)} className="grid size-12 place-items-center rounded-full bg-black/70 text-white backdrop-blur disabled:opacity-40"><ChevronRight /></button></div>}
              {hasWebcam && includeCamera && !videoIsBubble && status !== 'recording' && <div className="absolute bottom-[3.5%] right-[3.5%] size-[18%] min-h-[72px] min-w-[72px] overflow-hidden rounded-full border-[3px] border-white bg-zinc-800 shadow-xl shadow-black/40 sm:border-4"><video ref={webcamOverlayRef} autoPlay muted playsInline className="size-full scale-x-[-1] object-cover" /></div>}
              {status === 'stopped' && recordedUrl && <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-950/80 px-3 py-1.5 text-xs font-medium text-emerald-200 backdrop-blur"><span className="size-1.5 rounded-full bg-emerald-400" /> Recording ready</div>}
            </div>

          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-2xl border border-white/[0.08] bg-[#101115] p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Presentation video</h2><p className="mt-1 text-xs text-zinc-500">Add the content and circular video.</p></div><span className="grid size-8 place-items-center rounded-lg bg-white/[0.05] text-zinc-400"><Share2 className="size-4" /></span></div>
              <div className="space-y-2">
                <div className="rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-3.5 py-3 text-[11px] leading-5 text-zinc-300">First allow screen capture and choose This tab in Chrome. Then enter presentation full screen and press Start recording. Browser chrome and the rest of Loom stay out. Press Esc to stop and save.</div>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 transition hover:border-white/20 hover:bg-white/[0.05]"><span className="grid size-9 place-items-center rounded-lg bg-amber-300/10 text-amber-200"><Upload className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium">{uploadedDocName || 'Upload PDF slides'}</span><span className="mt-0.5 block text-[11px] text-zinc-500">Use arrow keys while recording</span></span><input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => void handleDocUpload(event)} /></label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 transition hover:border-white/20 hover:bg-white/[0.05]"><span className="grid size-9 place-items-center rounded-lg bg-sky-400/10 text-sky-300"><FileVideo2 className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium">{uploadedVideoName || 'Upload circular video'}</span><span className="mt-0.5 block text-[11px] text-zinc-500">Plays inside a circle on stage</span></span><input type="file" accept="video/*" className="sr-only" onChange={handleVideoUpload} /></label>
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-[#101115] p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Camera & audio</h2><p className="mt-1 text-xs text-zinc-500">Optional live camera and microphone.</p></div><span className="grid size-8 place-items-center rounded-lg bg-white/[0.05] text-zinc-400"><Camera className="size-4" /></span></div>
              <button onClick={enableWebcam} disabled={hasWebcam} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-left transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-default"><span className="grid size-9 place-items-center rounded-lg bg-rose-400/10 text-rose-300"><Camera className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium">{hasWebcam ? 'Camera is on' : 'Turn on camera'}</span><span className="mt-0.5 block text-[11px] text-zinc-500">{hasWebcam ? 'Camera and mic are available' : 'Browser will ask for permission'}</span></span></button>
              {hasWebcam && <label className="mt-3 flex cursor-pointer items-center justify-between rounded-lg px-1 py-1 text-xs text-zinc-400"><span>Show camera in recording</span><input type="checkbox" checked={includeCamera} onChange={(event) => setIncludeCamera(event.target.checked)} className="size-4 accent-violet-400" /></label>}
            </section>

            {status === 'finalizing' && <section role="status" aria-live="polite" className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.08] p-4"><div className="flex items-center gap-3"><span className="size-5 animate-spin rounded-full border-2 border-violet-200/30 border-t-violet-200" /><div><h2 className="text-sm font-semibold text-white">Generating your video</h2><p className="mt-1 text-xs text-zinc-400">{finalizeStep || 'Finishing the recording…'} Captured {(recordingBytes / (1024 * 1024)).toFixed(1)} MB. Keep this page open.</p></div></div></section>}
            {recordedUrl && status === 'stopped' && <section className="space-y-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4"><div><h2 className="text-sm font-semibold text-emerald-100">Video ready to download</h2><p className="mt-1 text-xs text-zinc-400">{recordedName} · {(recordedSize / (1024 * 1024)).toFixed(1)} MB</p></div><video src={recordedUrl} controls playsInline className="aspect-video w-full rounded-lg bg-black" /><a href={recordedUrl} download={recordedName ?? 'loom-recording.webm'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400"><Download className="size-4" /> Download your video</a></section>}
            <button onClick={() => void reset()} disabled={!hasSource && !recordedUrl && !error} className="inline-flex items-center justify-center gap-2 rounded-lg py-2 text-xs text-zinc-500 transition hover:text-white disabled:opacity-30 sm:hidden"><X className="size-3.5" /> Reset studio</button>
          </aside>
        </div>
        <footer className="flex flex-col gap-2 border-t border-white/[0.08] pt-4 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><span>Recordings stay on your device. Nothing is uploaded.</span><span className="flex items-center gap-1.5"><Play className="size-3" /> Uploaded video audio is included when available.</span></footer>
      </div>
    </main>
  );
}
