import { useEffect, useRef, useState } from 'react';
import { Volume2, Square } from 'lucide-react';

export default function HearReply({ value }: { value: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const activeRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => () => {
    // Do not cancel global speech on unmount; other messages may be speaking.
    activeRef.current = false;
  }, []);

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setError('এই ব্রাউজারে ভয়েস চালানোর সুবিধা নেই। Chrome-এ চেষ্টা করুন।');
      return;
    }

    const synth = window.speechSynthesis;
    if (activeRef.current) {
      activeRef.current = false;
      synth.cancel();
      utteranceRef.current = null;
      setSpeaking(false);
      setError('');
      return;
    }

    const text = value
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\[\[NEXT_MESSAGE\]\]/g, ' ')
      .replace(/[*_#`]/g, '')
      .trim();

    if (!text) {
      setError('শোনার মতো লেখা নেই।');
      return;
    }

    setError('');
    activeRef.current = true;
    setSpeaking(false);
    // Do not cancel the browser speech queue here: Chrome can cancel the new utterance too.
    // Use one utterance and let the browser start it from the direct click event.
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'bn-BD';
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utteranceRef.current = utterance;

    const chooseVoice = () => {
      const voices = synth.getVoices();
      const voice = voices.find(v => /^bn([_-]|$)/i.test(v.lang))
        || voices.find(v => /^en([_-]|$)/i.test(v.lang))
        || voices[0];
      if (voice) {
        utterance.voice = voice;
        // Some desktop speech engines stay silent if the requested locale has no installed voice.
        utterance.lang = voice.lang || 'bn-BD';
      }
    };
    chooseVoice();

    utterance.onstart = () => {
      if (utteranceRef.current !== utterance) return;
      setSpeaking(true);
      setError('');
    };
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return;
      activeRef.current = false;
      utteranceRef.current = null;
      setSpeaking(false);
    };
    utterance.onerror = (event) => {
      if (utteranceRef.current !== utterance) return;
      activeRef.current = false;
      utteranceRef.current = null;
      setSpeaking(false);
      const reason = (event as SpeechSynthesisErrorEvent).error;
      if (reason === 'canceled' || reason === 'interrupted') return;
      setError(reason === 'not-allowed'
        ? 'ব্রাউজার ভয়েস চালাতে বাধা দিচ্ছে (not-allowed)।'
        : `ভয়েস চালু হয়নি: ${reason || 'unknown'}। Chrome-এর sound ও voice settings পরীক্ষা করুন।`);
    };

    // Load voice list when the browser supplies it asynchronously.
    if (synth.getVoices().length === 0) {
      const onVoicesChanged = () => {
        chooseVoice();
        synth.removeEventListener?.('voiceschanged', onVoicesChanged);
      };
      synth.addEventListener?.('voiceschanged', onVoicesChanged);
    }

    synth.resume();
    synth.speak(utterance);
  };

  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" aria-label={speaking ? 'ভয়েস বন্ধ করুন' : 'উত্তর শুনুন'} title={speaking ? 'ভয়েস বন্ধ করুন' : 'উত্তর শুনুন'} onClick={toggleSpeech} className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
        {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        {speaking ? 'বন্ধ করুন' : 'শুনুন'}
      </button>
      {error && <span role="status" className="mt-1 max-w-[240px] text-[11px] text-red-600">{error}</span>}
    </span>
  );
}
