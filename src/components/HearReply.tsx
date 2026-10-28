import { Volume2 } from 'lucide-react';

export default function HearReply({ value }: { value: string }) {
  return <button type="button" aria-label="উত্তর শুনুন" onClick={() => {
    if (!('speechSynthesis' in window)) return;
    const speech = new SpeechSynthesisUtterance(value);
    speech.lang = 'bn-BD';
    speech.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
  }} className="mt-1 inline-flex items-center gap-1 text-xs text-primary"><Volume2 className="h-3.5 w-3.5" />শুনুন</button>;
}
