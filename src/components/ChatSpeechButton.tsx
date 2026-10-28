import { Volume2 } from 'lucide-react';

export default function ChatSpeechButton({ text }: { text: string }) {
  const speak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'bn-BD';
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };
  return <button type="button" onClick={speak} aria-label="উত্তরটি শুনুন" title="উত্তরটি শুনুন" className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-primary hover:bg-cream"><Volume2 className="h-3.5 w-3.5" />শুনুন</button>;
}
