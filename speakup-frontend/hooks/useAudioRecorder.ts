// hooks/useAudioRecorder.ts
'use client';
import { useRef, useState, useCallback, useEffect } from 'react';

export type RecorderState = 'idle' | 'recording' | 'processing';

interface UseAudioRecorderProps {
  onRecordingDone: (blob: Blob, mimeType: string) => Promise<void>;
  barCount?: number;
}

export function useAudioRecorder({ onRecordingDone, barCount = 12 }: UseAudioRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [barHeights, setBarHeights] = useState<number[]>(Array(barCount).fill(4));

  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const micStreamRef      = useRef<MediaStream | null>(null);
  const chunksRef         = useRef<Blob[]>([]);
  const audioContextRef   = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const animationIdRef    = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVisualizer();
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  function getSupportedMimeType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  }

  function stopVisualizer() {
    if (animationIdRef.current) { cancelAnimationFrame(animationIdRef.current); animationIdRef.current = null; }
    if (analyserRef.current)    { try { analyserRef.current.disconnect(); } catch (_) {} analyserRef.current = null; }
    setBarHeights(Array(barCount).fill(4));
  }

  async function startVisualizer(stream: MediaStream) {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 64;
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const step = Math.floor(dataArray.length / barCount);

    const draw = () => {
      animationIdRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);
      const heights = Array.from({ length: barCount }, (_, i) => {
        const val = dataArray[i * step];
        return Math.max(4, (val / 255) * 32);
      });
      setBarHeights(heights);
    };
    draw();
  }

  const startRecording = useCallback(async () => {
    try {
      if (!micStreamRef.current) {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        });
      }

      await startVisualizer(micStreamRef.current);

      chunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const recorder  = new MediaRecorder(micStreamRef.current, mimeType ? { mimeType } : {});

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const recordedMime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: recordedMime });
        setState('processing');
        await onRecordingDone(blob, recordedMime);
        setState('idle');
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setState('recording');
    } catch (err) {
      console.error('Recording start error:', err);
      setState('idle');
      throw err;
    }
  }, [onRecordingDone, barCount]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopVisualizer();
  }, []);

  const acquireMic = useCallback(async () => {
    if (micStreamRef.current) return;
    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch (_) {}
  }, []);

  return { state, barHeights, startRecording, stopRecording, acquireMic };
}
