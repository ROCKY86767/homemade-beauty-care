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

  const openInChrome = () => {
    const currentUrl = window.location.href;
    if (/Android/i.test(navigator.userAgent)) {
      const target = currentUrl.replace(/^https?:\/\//i, '');
      window.location.href = `intent://${target}#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  };

  const toggleSpeechUnsafe = () => {
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
      .replace(/!\\[([^\\]]*)\\]\\([^)]*\\)/g, '$1')
      .replace(/\\[([^\\]]*)\\]\\([^)]*\\)/g, '$1')
      .replace(/https?:\\/\\/\\S+/g, '')
      .replace(/\\[\\[NEXT_MESSAGE\\]\\]/g, ' ')
      .replace(/[*_#`]/g, '')
      .replace(/\\s+/g, ' ')
      .trim();

    if (!text) {
      setError('শোনার মতো লেখা নেই।');
      return;
    }

    // Keep each utterance short: some browser speech engines truncate long utterances.
    const chunks: string[] = [];
    const sentences = text.match(/[^।!?]+[।!?]?/g) || [text];
    let current = '';
    const maxChunkLength = 180;

    const pushWords = (sentence: string) => {
      const words = sentence.trim().split(/\\s+/);
      for (const word of words) {
        if (!word) continue;
        if (!current) {
          current = word;
        } else if ((current + ' ' + word).length <= maxChunkLength) {
          current += ' ' + word;
        } else {
          chunks.push(current);
          current = word;
        }
      }
    };

    for (const sentence of sentences) {
      const part = sentence.trim();
      if (!part) continue;
      if (!current || (current + ' ' + part).length <= maxChunkLength) {
        current = current ? current + ' ' + part : part;
      } else {
        chunks.push(current);
        current = '';
        pushWords(part);
      }
    }
    if (current) chunks.push(current);

    if (chunks.length === 0) {
      setError('শোনার মতো লেখা নেই।');
      return;
    }

    setError('');
    activeRef.current = true;
    setSpeaking(false);

    const voices = synth.getVoices();
    const bengaliVoice = voices.find(v => /^bn([_-]|$)/i.test(v.lang));

    const speakChunk = (index: number) => {
      if (!activeRef.current) return;
      if (index >= chunks.length) {
        activeRef.current = false;
        utteranceRef.current = null;
        setSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = bengaliVoice?.lang || 'bn-BD';
      utterance.rate = 0.88;
      utterance.pitch = 1;
      if (bengaliVoice) utterance.voice = bengaliVoice;
      utteranceRef.current = utterance;

      utterance.onstart = () => {
        if (utteranceRef.current !== utterance) return;
        setSpeaking(true);
        setError('');
      };
      utterance.onend = () => {
        if (utteranceRef.current !== utterance || !activeRef.current) return;
        speakChunk(index + 1);
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

      synth.speak(utterance);
    };

    // Start the first short chunk directly from the click gesture.
    synth.resume();
    speakChunk(0);
  };


  const toggleSpeech = () => {
    try { toggleSpeechUnsafe(); }
    catch (caught) {
      activeRef.current = false;
      utteranceRef.current = null;
      setSpeaking(false);
      const detail = caught instanceof Error ? caught.message : 'unknown error';
      console.error('Live chat speech playback error:', caught);
      setError(`ভয়েস চালু করা যায়নি: ${detail}`);
    }
  };

  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" aria-label={speaking ? 'ভয়েস বন্ধ করুন' : 'উত্তর শুনুন'} title={speaking ? 'ভয়েস বন্ধ করুন' : 'উত্তর শুনুন'} onClick={toggleSpeech} className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
        {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        {speaking ? 'বন্ধ করুন' : 'শুনুন'}
      </button>
      {error && <span role="status" className="mt-1 max-w-[240px] text-[11px] text-red-600">{error}{error.includes('Chrome-এ চেষ্টা করুন') && <button type="button" onClick={openInChrome} className="ml-1 font-semibold text-primary underline underline-offset-2">Chrome-এ খুলুন</button>}</span>}
    </span>
  );
}
