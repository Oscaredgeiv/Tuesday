import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useCallback } from 'react';

type VoiceState = 'idle' | 'listening' | 'processing' | 'responding' | 'error';
type InputMode = 'mixed' | 'dictation' | 'command';

function VoiceConsolePage() {
  const [state, setState] = useState<VoiceState>('idle');
  const [mode, setMode] = useState<InputMode>('mixed');
  const [transcript, setTranscript] = useState<Array<{ text: string; type: string; time: string }>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setState('processing');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

        try {
          const formData = new FormData();
          formData.append('audio', blob);
          // TODO: Send to /api/voice/transcribe
          // Simulated for now
          setTimeout(() => {
            setTranscript(prev => [...prev, {
              text: 'Voice processing connected. Audio captured successfully.',
              type: mode,
              time: new Date().toLocaleTimeString(),
            }]);
            setState('idle');
          }, 1000);
        } catch {
          setState('error');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setState('listening');
    } catch {
      setState('error');
    }
  }, [mode]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const stateConfig = {
    idle: { color: 'bg-zinc-700', ring: 'ring-zinc-700/30', label: 'Ready', desc: 'Press to talk' },
    listening: { color: 'bg-tuesday-500', ring: 'ring-tuesday-500/30', label: 'Listening', desc: 'Speak now...' },
    processing: { color: 'bg-warning', ring: 'ring-warning/30', label: 'Processing', desc: 'Transcribing audio...' },
    responding: { color: 'bg-success', ring: 'ring-success/30', label: 'Responding', desc: 'Generating response...' },
    error: { color: 'bg-danger', ring: 'ring-danger/30', label: 'Error', desc: 'Something went wrong' },
  };

  const cfg = stateConfig[state];

  return (
    <div className="flex h-full">
      {/* Main voice area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* State indicator */}
        <div className="mb-8 text-center">
          <div className="flex items-center gap-2 justify-center mb-2">
            <div className={`w-2 h-2 rounded-full ${cfg.color} ${state === 'listening' ? 'animate-pulse-glow' : ''}`} />
            <span className="text-sm font-medium text-zinc-300">{cfg.label}</span>
          </div>
          <p className="text-xs text-zinc-600">{cfg.desc}</p>
        </div>

        {/* Push-to-talk button */}
        <button
          onClick={toggleRecording}
          className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${
            isRecording
              ? `${cfg.color} ring-4 ${cfg.ring} scale-110`
              : 'bg-surface-raised border-2 border-border hover:border-tuesday-500 hover:shadow-[0_0_40px_-10px_var(--color-glow-tuesday)]'
          }`}
        >
          {/* Waveform rings */}
          {isRecording && (
            <>
              <div className={`absolute inset-0 rounded-full ${cfg.ring} ring-8 animate-ping opacity-20`} />
              <div className={`absolute inset-[-12px] rounded-full border ${state === 'listening' ? 'border-tuesday-500/20' : 'border-transparent'} animate-pulse`} />
            </>
          )}
          <span className="text-4xl">{isRecording ? '⏹' : '🎙'}</span>
        </button>

        {/* Mode selector */}
        <div className="mt-8 flex items-center gap-1 bg-surface-raised border border-border rounded-full p-1">
          {(['mixed', 'dictation', 'command'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 text-xs rounded-full transition-all ${
                mode === m ? 'bg-tuesday-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mt-6 flex items-center gap-2">
          <ActionChip label="→ Command" desc="Execute as command" />
          <ActionChip label="→ Memory" desc="Save as memory" />
          <ActionChip label="→ Library" desc="Add to library" />
          <ActionChip label="→ Task" desc="Create as task" />
        </div>

        {/* Hotkey hint */}
        <p className="mt-6 text-xs text-zinc-700">
          Hold <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-zinc-500 font-mono">⌘⇧T</kbd> for push-to-talk
        </p>
      </div>

      {/* Transcript panel */}
      <div className="w-96 shrink-0 border-l border-border bg-surface-raised flex flex-col">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-300">Transcript</h3>
          <span className="text-xs text-zinc-600">{transcript.length} segments</span>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {transcript.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-zinc-600">No transcript yet.</p>
              <p className="text-xs text-zinc-700 mt-1">Press the mic button to start recording.</p>
            </div>
          ) : (
            transcript.map((seg, i) => (
              <div key={i} className="bg-surface rounded-lg p-3 border border-border-subtle">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    seg.type === 'command' ? 'bg-tuesday-600/20 text-tuesday-400'
                    : seg.type === 'dictation' ? 'bg-blue-600/20 text-blue-400'
                    : 'bg-zinc-800 text-zinc-500'
                  }`}>{seg.type}</span>
                  <span className="text-[10px] text-zinc-700">{seg.time}</span>
                </div>
                <p className="text-sm text-zinc-300">{seg.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Transcript actions */}
        <div className="p-3 border-t border-border-subtle flex items-center gap-2">
          <button className="flex-1 px-3 py-2 text-xs text-zinc-400 bg-surface border border-border rounded-lg hover:bg-surface-hover">
            Clear
          </button>
          <button className="flex-1 px-3 py-2 text-xs text-zinc-400 bg-surface border border-border rounded-lg hover:bg-surface-hover">
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionChip({ label, desc }: { label: string; desc: string }) {
  return (
    <button className="px-3 py-1.5 text-xs text-zinc-500 bg-surface-raised border border-border rounded-full hover:border-border-active hover:text-zinc-300" title={desc}>
      {label}
    </button>
  );
}

export const Route = createFileRoute('/voice')({
  component: VoiceConsolePage,
});
