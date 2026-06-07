import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 學生端語音輸入 hook（Web Speech API）。
 *
 * 使用瀏覽器原生 SpeechRecognition（webkit prefixed on Chromium）。語言預設 zh-TW。
 * 不支援的瀏覽器 supported=false；呼叫端應隱藏麥克風按鈕，學生仍可改用打字。
 *
 * @param {(finalText: string) => void} onFinalResult 取得一段最終辨識文字時的 callback（呼叫端通常用 append）
 * @param {string} lang BCP-47 語言碼，預設 'zh-TW'
 */
export default function useSpeechRecognition(onFinalResult, lang = 'zh-TW') {
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
  const supported = !!SpeechRecognition;

  const recognitionRef = useRef(null);
  const onFinalRef = useRef(onFinalResult);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    onFinalRef.current = onFinalResult;
  }, [onFinalResult]);

  useEffect(() => {
    if (!supported) return undefined;

    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let interimText = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) {
        setInterim('');
        if (typeof onFinalRef.current === 'function') onFinalRef.current(finalText);
      } else {
        setInterim(interimText);
      }
    };
    rec.onerror = (e) => {
      setError(e.error || 'speech_error');
      setListening(false);
      setInterim('');
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
    };

    recognitionRef.current = rec;
    return () => {
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [SpeechRecognition, supported, lang]);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || listening) return;
    setError(null);
    try {
      rec.start();
      setListening(true);
    } catch (e) {
      setError(e?.message || 'start_failed');
    }
  }, [listening]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, interim, error, start, stop, toggle };
}
