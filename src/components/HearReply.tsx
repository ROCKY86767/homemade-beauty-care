import { useEffect, useRef, useState } from 'react';
import { Volume2, Square } from 'lucide-react';

export default function HearReply({ value }: { value: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<number | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      setError('এই ব্রাউজারে ভয়েস চালু করা যাচ্ছে না। Chrome ব্রাউজারে চেষ্টা করুন।');
      return;
    }

    if (speaking || window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      activeUtteranceRef.current = null;
      setSpeaking(false);
      setError('');
      return;
    }

    const text = value
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\[\[NEXT_MESSAGE\]\]/g, ' ')
      .trim();

    if (!text) {
      setError('শোনার মতো লেখা নেই।');
      return;
    }

    setError('');
    setSpeaking(true);
    window.speechSynthesis.cancel();

    // Chrome sometimes needs a short pause after cancel() before it accepts a new utterance.
    timerRef.current = window.setTimeout(() => {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'bn-BD';
      utterance.rate = 0.88;
      utterance.pitch = 1;
      activeUtteranceRef.current = utterance;

      const chooseVoice = () => {
        const voices = synth.getVoices();
        const bengaliVoice = voices.find(voice => /^bn([_-]|$)/i.test(voice.lang));
        if (bengaliVoice) utterance.voice = bengaliVoice;
      };

      chooseVoice();
      // Voice lists can load asynchronously in Chrome; retry once they are available.
      if (synth.getVoices().length === 0) {
        const onVoicesChanged = () => {
          chooseVoice();
          synth.removeEventListener?.('voiceschanged', onVoicesChanged);
        };
        synth.addEventListener?.('voiceschanged', onVoicesChanged);
      }

      utterance.onstart = () => {
        setSpeaking(true);
        setError('');
      };
      utterance.onend = () => {
        setSpeaking(false);
        activeUtteranceRef.current = null;
      };
      utterance.onerror = (event) => {
        setSpeaking(false);
        activeUtteranceRef.current = null;
        const reason = (event as SpeechSynthesisErrorEvent).error;
        setError(reason === 'not-allowed'
          ? 'ব্রাউজার ভয়েস চালাতে বাধা দিচ্ছে। পেজ রিফ্রেশ করে আবার চাপ দিন।'
          : 'ভয়েস চালু হয়নি। ডিভাইসে বাংলা Text-to-Speech voice ইনস্টল/চালু আছে কি না দেখুন।');
      };

      synth.resume();
      synth.speak(utterance);

      // If the browser silently refuses speech, do not leave the button stuck in "playing".
      window.setTimeout(() => {
        if (activeUtteranceRef.current === utterance && !synth.speaking && !synth.pending) {
          setSpeaking(false);
          activeUtteranceRef.current = null;
          setError('ডিভাইসের Text-to-Speech ভয়েস পাওয়া যায়নি। Chrome/ফোনের বাংলা voice সেটিংস পরীক্ষা করুন।');
        }
      }, 2500);
    }, 120);
  };

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        aria-label={speaking ? 'ভয়েস বন্ধ করুন' : 'উত্তর শুনুন'}
        title={speaking ? 'ভয়েস বন্ধ করুন' : 'উত্তর শুনুন'}
        onClick={toggleSpeech}
        className="mt-1 inline-flex items-center gap-1 text-xs text-primary"
      >
        {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        {speaking ? 'বন্ধ করুন' : 'শুনুন'}
      </button>
      {error && <span role="status" className="mt-1 max-w-[240px] text-[11px] text-red-600">{error}</span>}
    </span>
  );
}
