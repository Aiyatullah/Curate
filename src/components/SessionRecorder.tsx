"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Local-only recorder for practice sessions. Camera+mic and/or screen+mic are
 * captured with MediaRecorder and handed back as downloadable .webm files.
 * Nothing is uploaded — the clips never leave the browser.
 */
type Mode = "camera" | "screen";
type Clip = { mode: Mode; url: string; size: number };

const MIME =
  typeof MediaRecorder !== "undefined" &&
  MediaRecorder.isTypeSupported?.("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm";

export function SessionRecorder({ label = "Record this session" }: { label?: string }) {
  // Feature detection must run only after mount so SSR and first client render match.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag for SSR-safe feature detection
    setMounted(true);
  }, []);
  const supported =
    mounted &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    "MediaRecorder" in window;

  const [active, setActive] = useState<Mode | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [clips, setClips] = useState<Clip[]>([]);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  async function start(mode: Mode) {
    setError(null);
    try {
      const stream =
        mode === "camera"
          ? await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

      streamRef.current = stream;
      if (mode === "camera" && previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.muted = true;
        await previewRef.current.play().catch(() => {});
      }
      // if the user stops screen-share from the browser chrome, end the recording
      stream.getVideoTracks()[0]?.addEventListener("ended", stop);

      chunksRef.current = [];
      const rec = new MediaRecorder(stream, { mimeType: MIME });
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setClips((c) => [
          { mode, url: URL.createObjectURL(blob), size: blob.size },
          ...c,
        ]);
        cleanup();
        setActive(null);
        setElapsed(0);
      };
      rec.start();
      recorderRef.current = rec;
      setActive(mode);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Permission denied — allow camera/screen access and retry."
          : "Could not start recording in this browser.",
      );
      cleanup();
    }
  }

  function stop() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  if (!mounted) {
    return (
      <div className="rounded-xl border border-border bg-bg-raised p-4 text-xs text-text-faint">
        {label}…
      </div>
    );
  }
  if (!supported) {
    return (
      <div className="rounded-xl border border-border bg-bg-raised p-4 text-xs text-text-faint">
        Recording needs a Chromium browser with camera/screen permissions.
      </div>
    );
  }

  const mm = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(
    elapsed % 60,
  ).padStart(2, "0")}`;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-bg-raised p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-text-faint">
          {label}
        </span>
        {active ? (
          <>
            <span className="flex items-center gap-1.5 text-xs text-danger">
              <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
              rec {mm} · {active}
            </span>
            <button
              onClick={stop}
              className="rounded-md border border-danger px-3 py-1 text-xs text-danger"
            >
              Stop
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => start("camera")}
              className="rounded-md border border-border px-3 py-1 text-xs text-text-dim hover:text-text"
            >
              🎥 Camera + mic
            </button>
            <button
              onClick={() => start("screen")}
              className="rounded-md border border-border px-3 py-1 text-xs text-text-dim hover:text-text"
            >
              🖥 Screen + mic
            </button>
          </>
        )}
      </div>

      <video
        ref={previewRef}
        className={`w-40 rounded-lg border border-border ${active === "camera" ? "" : "hidden"}`}
        playsInline
      />

      {error && <p className="text-xs text-danger">{error}</p>}

      {clips.length > 0 && (
        <ul className="space-y-1 text-xs">
          {clips.map((c, i) => (
            <li key={i} className="flex items-center gap-2 text-text-dim">
              <span>
                {c.mode} · {(c.size / 1_048_576).toFixed(1)} MB
              </span>
              <a
                href={c.url}
                download={`scl-${c.mode}-${Date.now()}.webm`}
                className="text-accent"
              >
                download
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-text-faint">
        Clips stay in your browser — nothing is uploaded. Download before you leave the page.
      </p>
    </div>
  );
}
