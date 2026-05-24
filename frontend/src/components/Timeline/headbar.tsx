import { useState } from 'react';

interface HeadbarTimeLineProps {
  onSave:            () => void;
  onGoToSceneEditor: () => void;
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';
type SendState       = 'idle' | 'sending'    | 'sent'      | 'error';
type SequenceState   = 'ready' | 'running' | 'stopped';

export function HeadbarTimeLine({ onSave, onGoToSceneEditor }: HeadbarTimeLineProps) {
  const [managerCode,     setManagerCode]     = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [sendState,       setSendState]       = useState<SendState>('idle');
  const [sequenceState,   setSequenceState]   = useState<SequenceState>('ready');
  const [errorMsg,        setErrorMsg]        = useState('');

  async function handleConnect() {
    if (managerCode.length !== 6) return;
    setConnectionState('connecting');
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:3000/manager/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: managerCode }),
      });
      if (res.ok) {
        setConnectionState('connected');
        setSendState('idle');
      } else {
        setConnectionState('error');
        try {
          const body = await res.json();
          setErrorMsg(body.message ?? `Connection failed (${res.status})`);
        } catch {
          setErrorMsg(`Connection failed (${res.status})`);
        }
      }
    } catch {
      setConnectionState('error');
      setErrorMsg('Manager not found');
    }
  }

  async function handleSendTimeline() {
    setSendState('sending');
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:3000/manager/send', { method: 'POST' });
      if (res.ok) {
        setSendState('sent');
        setSequenceState('ready');
      } else {
        setSendState('error');
        try {
          const body = await res.json();
          setErrorMsg(body.message ?? `Sent failed (${res.status})`);
        } catch {
          setErrorMsg(`Sent failed (${res.status})`);
        }
      }
    } catch {
      setSendState('error');
      setErrorMsg("failed to send data");
    }
  }

  async function handleStart() {
    try {
      const res = await fetch('http://localhost:3000/manager/start', { method: 'POST' });
      if (res.ok) setSequenceState('running');
    } catch { /* serveur pas encore pret */ }
  }

  async function handleStop() {
    try {
      const res = await fetch('http://localhost:3000/manager/stop', { method: 'POST' });
      if (res.ok) setSequenceState('stopped');
    } catch { /* serveur pas encore pret */ }
  }

  async function handleReset() {
    try {
      await fetch('http://localhost:3000/manager/reset', { method: 'POST' });
    } catch { /* serveur pas encore pret */ }
    setSendState('idle');
    setSequenceState('ready');
  }

  const btn = 'px-4 py-2 rounded text-xs font-medium border transition-colors cursor-pointer';

  return (
    <header className="relative pr-6 flex items-center gap-6 bg-zinc-950 border-b border-zinc-800 text-white text-xs w-full min-h-14 shadow-md z-30 select-none">

      <div className="w-0.25" />

      <div className="flex items-center gap-2">
        <img src="/Logo.svg" alt="Hack the Sommet" className="h-10 w-10 shrink-0" />
        <div className="font-['JetBrains_Mono'] select-none tracking-[0.31em] text-sm">
          <span className="text-white font-normal">Manage</span>
          <span className="text-[#008358] font-bold">US</span>
        </div>
      </div>

      <div className="w-px h-6 bg-zinc-700 shrink-0" />

      {(connectionState === 'idle' || connectionState === 'error') && (
        <div className="flex items-center gap-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Manager 6 digit code"
            value={managerCode}
            onChange={e => setManagerCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs w-36 text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            onClick={handleConnect}
            disabled={managerCode.length !== 6}
            className={`${btn} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Connect to manager
          </button>
          {connectionState === 'error' && (
            <span className="text-red-400">{errorMsg}</span>
          )}
        </div>
      )}

      {connectionState === 'connecting' && (
        <span className="text-zinc-400 animate-pulse">Connecting...</span>
      )}

      {connectionState === 'connected' && (
        <div className="flex items-center gap-3">

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-400 font-medium">Manager connected</span>
          </div>

          <div className="w-px h-5 bg-zinc-700 shrink-0" />

          {(sendState === 'idle' || sendState === 'error') && (
            <>
              <button onClick={handleSendTimeline} className={`${btn} bg-blue-600 text-white border-blue-600 hover:bg-blue-500`}>
                Send timeline
              </button>
              {sendState === 'error' && <span className="text-red-400">{errorMsg}</span>}
            </>
          )}

          {sendState === 'sending' && (
            <span className="text-zinc-400 animate-pulse">Sending...</span>
          )}

          {sendState === 'sent' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-blue-300 font-medium">Timeline sent!</span>
              </div>

              {sequenceState === 'ready' && (
                <button onClick={handleStart} className={`${btn} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500`}>
                  Start
                </button>
              )}

              {sequenceState === 'running' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-yellow-300 font-medium">En cours</span>
                  </div>
                  <button onClick={handleStop} className={`${btn} bg-transparent text-zinc-300 border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500`}>
                    Stop
                  </button>
                </>
              )}

              {sequenceState === 'stopped' && (
                <>
                  <span className="text-zinc-400">ArrÃªtÃ©e</span>
                  <button onClick={handleStart} className={`${btn} bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500`}>
                    Continue
                  </button>
                </>
              )}

              {(sequenceState === 'running' || sequenceState === 'stopped') && (
                <button onClick={handleReset} className={`${btn} bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200`}>
                  Reset
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <button onClick={onSave} className={`${btn} bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200`}>
          Save timeline
        </button>
        <button onClick={onGoToSceneEditor} className={`${btn} bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200`}>
          Modify the current scene
        </button>
      </div>
    </header>
  );
}
