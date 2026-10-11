'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CircleHelp, Download, FileVideo2, MonitorUp, Play, RotateCcw, Share2, Square, Upload, Video, X } from 'lucide-react';

type Status = 'idle' | 'ready' | 'recording' | 'stopped' | 'error';

const formatDuration = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export default function Page() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasWebcam, setHasWebcam] = useState(false);
  const [hasScreen, setHasScreen] = useState(false);
  const [includeCamera, setIncludeCamera] = useState(true);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedType, setRecordedType] = useState('video/webm');
  const [uploadedVideoName, setUploadedVideoName] = useState<string | null>(null);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const webcamOverlayRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const uploadedVideoUrlRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const cleanupRecording = useCallback(() => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
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
  }, [cleanupRecording]);

  useEffect(() => () => {
    cleanupStreams();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    if (uploadedVideoUrlRef.current) URL.revokeObjectURL(uploadedVideoUrlRef.current);
  }, [cleanupStreams, recordedUrl]);

  const startDrawLoop = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const draw = () => {
      const { width, height } = canvas;
      const video = screenVideoRef.current;
      ctx.fillStyle = '#111318';
      ctx.fillRect(0, 0, width, height);
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
        const drawWidth = video.videoWidth * scale;
        const drawHeight = video.videoHeight * scale;
        ctx.drawImage(video, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      } else {
        ctx.fillStyle = '#1b1d22';
        ctx.fillRect(18, 18, width - 36, height - 36);
        ctx.strokeStyle = '#33363e';
        ctx.lineWidth = 2;
        ctx.strokeRect(19, 19, width - 38, height - 38);
      }

      const camera = webcamVideoRef.current;
      if (includeCamera && hasWebcam && camera && camera.readyState >= 2 && camera.videoWidth > 0) {
        const diameter = Math.round(height * 0.245);
        const margin = Math.round(height * 0.035);
        const cx = width - margin - diameter / 2;
        const cy = height - margin - diameter / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, diameter / 2, 0, Math.PI * 2);
        ctx.clip();
        const scale = Math.max(diameter / camera.videoWidth, diameter / camera.videoHeight);
        const w = camera.videoWidth * scale;
        const h = camera.videoHeight * scale;
        ctx.translate(cx, cy);
        ctx.scale(-1, 1);
        ctx.drawImage(camera, -w / 2, -h / 2, w, h);
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
  }, [hasWebcam, includeCamera]);

  useEffect(() => {
    if (hasWebcam) {
      for (const video of [webcamVideoRef.current, webcamOverlayRef.current]) {
        if (video && webcamStreamRef.current && video.srcObject !== webcamStreamRef.current) {
          video.srcObject = webcamStreamRef.current;
          void video.play().catch(() => {});
        }
      }
    }
    startDrawLoop();
  }, [hasWebcam, hasScreen, includeCamera, startDrawLoop, uploadedVideoName]);

  useEffect(() => {
    if (status !== 'recording') return;
    startTimeRef.current = Date.now();
    const tick = () => {
      if (startTimeRef.current) setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    };
    const timer = window.setInterval(tick, 500);
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

  const shareScreen = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 60 } }, audio: true });
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = stream;
      const video = screenVideoRef.current;
      if (video) {
        video.srcObject = stream;
        video.src = '';
        await video.play();
      }
      if (uploadedVideoUrlRef.current) URL.revokeObjectURL(uploadedVideoUrlRef.current);
      uploadedVideoUrlRef.current = null;
      setUploadedVideoName(null);
      setHasScreen(true);
      setStatus((current) => current === 'idle' ? 'ready' : current);
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        screenStreamRef.current = null;
        setHasScreen(false);
        setStatus((current) => current === 'recording' ? current : (hasWebcam ? 'ready' : 'idle'));
        if (video) video.srcObject = null;
      }, { once: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not share your screen.');
      setStatus('error');
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setHasScreen(false);
    if (uploadedVideoUrlRef.current) URL.revokeObjectURL(uploadedVideoUrlRef.current);
    const url = URL.createObjectURL(file);
    uploadedVideoUrlRef.current = url;
    const video = screenVideoRef.current;
    if (video) {
      video.srcObject = null;
      video.src = url;
      video.loop = true;
      void video.play().catch(() => setError('This video could not be previewed in your browser.'));
    }
    setUploadedVideoName(file.name);
    setStatus((current) => current === 'idle' ? 'ready' : current);
    event.target.value = '';
  };

  const handleDocUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setUploadedDocName(file.name);
    event.target.value = '';
  };

  const startRecording = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setError(null);
    chunksRef.current = [];
    try {
      const stream = canvas.captureStream(30);
      recordingStreamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();
      const audioStreams = [webcamStreamRef.current, screenStreamRef.current].filter((item): item is MediaStream => Boolean(item));
      for (const sourceStream of audioStreams) {
        const tracks = sourceStream.getAudioTracks();
        if (tracks.length) audioCtx.createMediaStreamSource(new MediaStream(tracks)).connect(destination);
      }
      if (destination.stream.getAudioTracks().length) stream.addTrack(destination.stream.getAudioTracks()[0]);
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        setRecordedType(blob.type || 'video/webm');
        setRecordedUrl((oldUrl) => {
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          return URL.createObjectURL(blob);
        });
        cleanupRecording();
        setStatus('stopped');
      };
      recorder.onerror = () => {
        setError('Recording stopped because the browser encountered an error.');
        cleanupRecording();
        setStatus('error');
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setElapsed(0);
      setStatus('recording');
    } catch (cause) {
      cleanupRecording();
      setError(cause instanceof Error ? cause.message : 'Could not start recording.');
      setStatus('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  };

  const downloadRecording = () => {
    if (!recordedUrl) return;
    const link = document.createElement('a');
    link.href = recordedUrl;
    const extension = recordedType.includes('mp4') ? 'mp4' : 'webm';
    link.download = `loom-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const reset = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    cleanupStreams();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    if (uploadedVideoUrlRef.current) URL.revokeObjectURL(uploadedVideoUrlRef.current);
    uploadedVideoUrlRef.current = null;
    setRecordedUrl(null);
    setUploadedVideoName(null);
    setUploadedDocName(null);
    setError(null);
    setElapsed(0);
    setIncludeCamera(true);
    setStatus('idle');
    if (screenVideoRef.current) { screenVideoRef.current.pause(); screenVideoRef.current.srcObject = null; screenVideoRef.current.removeAttribute('src'); screenVideoRef.current.load(); }
    if (webcamVideoRef.current) webcamVideoRef.current.srcObject = null;
    if (webcamOverlayRef.current) webcamOverlayRef.current.srcObject = null;
  };

  const hasSource = hasScreen || Boolean(uploadedVideoName) || hasWebcam;
  const idlePreview = !hasScreen && !uploadedVideoName;

  return (
    <main className="min-h-screen bg-[#090a0c] text-white selection:bg-violet-400/30">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 pb-5 sm:px-6 lg:px-10">
        <header className="flex min-h-[76px] items-center justify-between border-b border-white/[0.08]">
          <a href="/loom" className="flex items-center gap-3" aria-label="Loom Studio home">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg shadow-violet-950/40"><Video className="size-5 text-white" /></span>
            <span><span className="block text-sm font-semibold tracking-tight">loom studio</span><span className="block text-[11px] text-zinc-500">A little more you in every video</span></span>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 sm:flex"><span className={`size-1.5 rounded-full ${status === 'recording' ? 'animate-pulse bg-rose-400' : 'bg-emerald-400'}`} />{status === 'recording' ? `Recording ${formatDuration(elapsed)}` : status === 'stopped' ? 'Video ready' : 'Ready when you are'}</span>
            {status === 'recording' ? <button onClick={stopRecording} className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-400"><Square className="size-3.5 fill-current" /> Stop</button> : <button onClick={startRecording} disabled={!hasSource} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"><span className="size-2 rounded-full bg-rose-500" /> Start recording</button>}
            {recordedUrl && <button onClick={downloadRecording} title="Download recording" className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] transition hover:bg-white/10"><Download className="size-4" /></button>}
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-8 lg:py-8">
          <section className="flex min-w-0 flex-col">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-violet-300">Your recording room</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Make something worth sharing.</h1><p className="mt-1.5 text-sm text-zinc-500">Bring a screen, a camera, or both. You’re in control.</p></div>
              <button onClick={reset} disabled={!hasSource && !recordedUrl && !error} className="hidden items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-500 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-30 sm:inline-flex"><RotateCcw className="size-3.5" /> Reset</button>
            </div>

            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-[#131419] shadow-2xl shadow-black/40">
              <video ref={screenVideoRef} autoPlay playsInline muted className="hidden" />
              <video ref={webcamVideoRef} autoPlay muted playsInline className="hidden" />
              <canvas ref={canvasRef} width={1920} height={1080} className="absolute inset-0 size-full object-contain" />
              {idlePreview && <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_rgba(124,58,237,0.12),_transparent_55%)] px-5 text-center">
                <div className="mb-4 grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400"><MonitorUp className="size-7" /></div>
                <p className="text-sm font-medium text-zinc-200">Your stage is ready</p><p className="mt-1 max-w-sm text-xs leading-5 text-zinc-500">Share your screen or choose a video to see your composition here.</p>
              </div>}
              {hasWebcam && includeCamera && <div className={`${status === 'recording' ? 'invisible' : ''} absolute bottom-[3.5%] right-[3.5%] size-[18%] min-h-[72px] min-w-[72px] overflow-hidden rounded-full border-[3px] border-white bg-zinc-800 shadow-xl shadow-black/40 sm:border-4`}><video ref={webcamOverlayRef} autoPlay muted playsInline className="size-full scale-x-[-1] object-cover" /></div>}
              {status === 'stopped' && recordedUrl && <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-950/80 px-3 py-1.5 text-xs font-medium text-emerald-200 backdrop-blur"><span className="size-1.5 rounded-full bg-emerald-400" /> Recording ready</div>}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500"><span className="flex items-center gap-2"><span className={`size-1.5 rounded-full ${error ? 'bg-rose-400' : hasSource ? 'bg-emerald-400' : 'bg-zinc-600'}`} />{error || (hasSource ? 'Preview is composed exactly as it will be recorded' : 'Add a source to begin')}</span><span className="hidden sm:inline">16:9 · camera overlay is included in your video</span></div>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-2xl border border-white/[0.08] bg-[#101115] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Add your sources</h2><p className="mt-1 text-xs text-zinc-500">Choose what appears in your video.</p></div><span className="grid size-8 place-items-center rounded-lg bg-white/[0.05] text-zinc-400"><Share2 className="size-4" /></span></div>
              <div className="space-y-2">
                <button onClick={shareScreen} className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${hasScreen ? 'border-violet-400/30 bg-violet-400/[0.08]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'}`}><span className="grid size-9 place-items-center rounded-lg bg-violet-400/10 text-violet-300"><MonitorUp className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium">Share screen</span><span className="mt-0.5 block text-[11px] text-zinc-500">Show a tab, window, or display</span></span>{hasScreen && <span className="size-2 rounded-full bg-emerald-400" />}</button>
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition ${uploadedVideoName ? 'border-violet-400/30 bg-violet-400/[0.08]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'}`}><span className="grid size-9 place-items-center rounded-lg bg-sky-400/10 text-sky-300"><FileVideo2 className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium">Choose a video</span><span className="mt-0.5 block truncate text-[11px] text-zinc-500">{uploadedVideoName || 'Use a video file as your stage'}</span></span><Upload className="size-4 text-zinc-500" /><input type="file" accept="video/*" className="sr-only" onChange={handleVideoUpload} /></label>
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-[#101115] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Camera & audio</h2><p className="mt-1 text-xs text-zinc-500">Add your voice and face.</p></div><span className="grid size-8 place-items-center rounded-lg bg-white/[0.05] text-zinc-400"><Camera className="size-4" /></span></div>
              <button onClick={enableWebcam} disabled={hasWebcam} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-left transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-default"><span className="grid size-9 place-items-center rounded-lg bg-rose-400/10 text-rose-300"><Camera className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-medium">{hasWebcam ? 'Camera is on' : 'Turn on camera'}</span><span className="mt-0.5 block text-[11px] text-zinc-500">{hasWebcam ? 'Camera and mic are available' : 'Browser will ask for permission'}</span></span><span className={`size-2 rounded-full ${hasWebcam ? 'bg-emerald-400' : 'bg-zinc-600'}`} /></button>
              {hasWebcam && <label className="mt-3 flex cursor-pointer items-center justify-between rounded-lg px-1 py-1 text-xs text-zinc-400"><span>Show camera in recording</span><input type="checkbox" checked={includeCamera} onChange={(event) => setIncludeCamera(event.target.checked)} className="size-4 accent-violet-400" /></label>}
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-[#101115] p-4 sm:p-5">
              <div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-300/10 text-amber-200"><CircleHelp className="size-4" /></span><div><h2 className="text-xs font-semibold">Presenting slides?</h2><p className="mt-1 text-[11px] leading-5 text-zinc-500">Open your PDF or presentation, then share that window. Your slides will appear on stage.</p></div></div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2.5 text-xs text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"><Upload className="size-3.5" />{uploadedDocName || 'Attach slides for reference'}<input type="file" accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="sr-only" onChange={handleDocUpload} /></label>
            </section>

            {recordedUrl && <button onClick={downloadRecording} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400"><Download className="size-4" /> Download your video</button>}
            <button onClick={reset} disabled={!hasSource && !recordedUrl && !error} className="inline-flex items-center justify-center gap-2 rounded-lg py-2 text-xs text-zinc-500 transition hover:text-white disabled:opacity-30 sm:hidden"><X className="size-3.5" /> Reset studio</button>
          </aside>
        </div>

        <footer className="flex flex-col gap-2 border-t border-white/[0.08] pt-4 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between"><span>Recordings stay on your device. Nothing is uploaded.</span><span className="flex items-center gap-1.5"><Play className="size-3" /> Screen audio is included when your browser makes it available.</span></footer>
      </div>
    </main>
  );
}
