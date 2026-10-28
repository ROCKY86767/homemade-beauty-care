import { useEffect, useState } from 'react';
import { Volume2, Square } from 'lucide-react';

export default function HearReply({ value }: { value: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const update = () => setSpeaking(window.speechSynthesis.speaking);
    window.speechSynthesis.addEventListener?.('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', update);
  }, []);

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setError('এই ব্রাউজারে ভয়েস শোনার সুবিধা নেই।');
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = value.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '').trim();
    if (!text) { setError('শোনার মতো লেখা নেই।'); return; }
    setError('');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'bn-BD';
    utterance.rate = 0.9;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => { setSpeaking(false); setError('ভয়েস চালু হয়নি। ব্রাউজার/কম্পিউটারের সাউন্ড ও বাংলা ভয়েস পরীক্ষা করুন।'); };
    const voices = window.speechSynthesis.getVoices();
    const bengaliVoice = voices.find(voice => /^bn([_-]|$)/i.test(voice.lang));
    if (bengaliVoice) utterance.voice = bengaliVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
    // Some browsers do not fire onstart if speech is blocked; report unsupported speech after a short wait is avoided.
  };

  return <span className="inline-flex flex-col items-start"><button type="button" aria-label={speaking ? 'ভয়েস বন্ধ করুন' : 'উত্তর শুনুন'} title={speaking ? 'ভয়েস বন্ধ করুন' : 'উত্তর শুনুন'} onClick={toggleSpeech} className="mt-1 inline-flex items-center gap-1 text-xs text-primary">{speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}{speaking ? 'বন্ধ করুন' : 'শুনুন'}</button>{error && <span role="status" className="mt-1 max-w-[220px] text-[11px] text-red-600">{error}</span>}</span>;
}
