import { useEffect, useRef, useState } from 'react';

/** Speech to text in the browser (Chrome, Edge, Safari). Final words go to onFinal, live words to onInterim. */
export function useSpeech(onFinal: (t: string) => void) {
  const Rec = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
  const rec = useRef<SpeechRec | null>(null);
  const [on, setOn] = useState(false);
  const [interim, setInterim] = useState('');
  const [err, setErr] = useState('');
  const cb = useRef(onFinal);
  cb.current = onFinal;
  const stop = () => { rec.current?.stop(); setOn(false); setInterim(''); };
  const start = () => {
    if (!Rec) { setErr('Voice input needs Chrome, Edge or Safari.'); return; }
    setErr('');
    const r = new Rec();
    r.lang = 'en-US'; r.continuous = true; r.interimResults = true;
    r.onresult = (e: SpeechEvent) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) cb.current(res[0].transcript.trim());
        else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e: { error: string }) => { setErr(e.error === 'not-allowed' ? 'Microphone permission was blocked. Allow it in the address bar, then try again.' : `Voice input stopped (${e.error}).`); setOn(false); };
    r.onend = () => { setOn(false); setInterim(''); };
    rec.current = r;
    r.start();
    setOn(true);
  };
  useEffect(() => () => rec.current?.stop(), []);
  return { supported: !!Rec, on, interim, err, start, stop };
}
interface SpeechRec { lang: string; continuous: boolean; interimResults: boolean; onresult: (e: SpeechEvent) => void; onerror: (e: { error: string }) => void; onend: () => void; start(): void; stop(): void }
interface SpeechEvent { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] & { length: number } }

