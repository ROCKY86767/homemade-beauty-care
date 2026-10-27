import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, User, Mic, Square, Bookmark, Search, ImagePlus, Phone, MoreVertical, Trash2, ArrowLeft, Video, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'admin';
  sender_name: string | null;
  message: string;
  is_read: boolean;
  message_type: 'text' | 'audio' | 'image' | 'video';
  media_url: string | null;
  created_at: string;
};

type Conversation = {
  id: string;
  customer_name: string;
  customer_mobile: string | null;
  status: 'open' | 'closed';
  last_message_at: string;
  created_at: string;
  updated_at?: string;
  customer_last_seen_at?: string | null;
};

const TOKEN_KEY = 'hbc-live-chat-token';
const CONVERSATION_KEY = 'hbc-live-chat-conversation';

async function uploadChatAudio(blob: Blob, prefix: string) {
  const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('ogg') ? 'ogg' : 'mp4';
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('chat-audio').upload(path, blob, {
    contentType: blob.type || 'audio/webm',
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from('chat-audio').getPublicUrl(path).data.publicUrl;
}

async function uploadChatFile(file: File, prefix: string) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'attachment';
  const path = `${prefix}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from('chat-audio').upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
  if (error) throw error;
  return supabase.storage.from('chat-audio').getPublicUrl(path).data.publicUrl;
}

function mediaTypeFor(file: File): 'image' | 'video' | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

function getRecorderOptions() {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type));
  return mimeType ? { mimeType } : undefined;
}

function token() {
  let value = localStorage.getItem(TOKEN_KEY);
  if (!value) {
    value = crypto.randomUUID() + crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, value);
  }
  return value;
}

export default function LiveChat() {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [message, setMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const [savedReplies, setSavedReplies] = useState<string[]>(() => JSON.parse(localStorage.getItem('hbc-saved-replies') || '[]'));
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatAttachment, setChatAttachment] = useState<File | null>(null);
  const customerFileInputRef = useRef<HTMLInputElement | null>(null);
  const customerMessageRequestRef = useRef(0);
  const customerMessagesRef = useRef<ChatMessage[]>([]);

  const savedConversationId = useMemo(() => localStorage.getItem(CONVERSATION_KEY), []);
  const notifiedMessageIdsRef = useRef<Set<string>>(new Set());
  const chatLoadedRef = useRef(false);

  const enableBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (window.Notification.permission === 'default') {
      try { await window.Notification.requestPermission(); } catch {}
    }
  };

  const notifyNewAdminMessages = (nextMessages: ChatMessage[]) => {
    if (typeof window === 'undefined' || !('Notification' in window) || window.Notification.permission !== 'granted') return;
    const newAdminMessages = nextMessages.filter((item) => item.sender_type === 'admin' && !notifiedMessageIdsRef.current.has(item.id));
    if (!chatLoadedRef.current) {
      nextMessages.forEach((item) => notifiedMessageIdsRef.current.add(item.id));
      chatLoadedRef.current = true;
      return;
    }
    newAdminMessages.forEach((item) => {
      notifiedMessageIdsRef.current.add(item.id);
      if (document.visibilityState !== 'visible' || !open) {
        const body = item.message_type === 'audio' ? '🎤 নতুন voice message' : item.message_type === 'video' ? '🎬 নতুন video message' : item.message_type === 'image' ? '🖼️ নতুন picture message' : item.message;
        const notification = new window.Notification('Homemade Beauty Care — Live Chat', { body: body || 'আপনার জন্য নতুন message এসেছে।', icon: '/homemade-logo.png', tag: `hbc-live-chat-${item.id}` });
        notification.onclick = () => { window.focus(); setOpen(true); notification.close(); };
      }
    });
  };

  const loadMessages = async (conversationId: string) => {
    const requestId = ++customerMessageRequestRef.current;
    const { data, error } = await supabase.rpc('get_guest_chat', { p_visitor_token: token(), p_conversation_id: conversationId });
    if (error || requestId !== customerMessageRequestRef.current || localStorage.getItem(CONVERSATION_KEY) !== conversationId) return;
    const nextMessages = (data || []) as ChatMessage[];
    if (!nextMessages.length && customerMessagesRef.current.length) return;
    customerMessagesRef.current = nextMessages;
    setMessages(nextMessages);
    notifyNewAdminMessages(nextMessages);
  };

  const loadConversation = async () => {
    const id = localStorage.getItem(CONVERSATION_KEY);
    if (!id) return;
    const { data } = await supabase.rpc('get_guest_chat_conversation', { p_visitor_token: token(), p_conversation_id: id });
    if (data) {
      setConversation(data as Conversation);
      setStarted(true);
      await loadMessages(id);
    }
  };

  const askAI = async (conversationId: string, customerText: string, history: ChatMessage[]) => {
    const trimmed = customerText.trim();
    if (!trimmed) return;
    setAiTyping(true);
    try {
      const aiMessages = [...history.filter((item) => item.message_type === 'text' && item.message.trim()), {
        sender_type: 'customer', message: trimmed,
      }].slice(-12).map((item) => ({
        role: item.sender_type === 'customer' ? 'user' : 'assistant',
        content: item.message,
      }));

      const response = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: aiMessages, customerName: name || conversation?.customer_name || 'Customer' }),
      });
      const result = await response.json();
      if (!response.ok || !result?.text) throw new Error(result?.error || 'AI reply পাওয়া যায়নি।');

      const { error } = await supabase.rpc('send_guest_ai_chat_message', {
        p_visitor_token: token(),
        p_conversation_id: conversationId,
        p_message: result.text,
      });
      if (error) throw error;
      await loadMessages(conversationId);
    } catch (error: any) {
      console.error('AI chat error', error);
      setChatError(error?.message || 'AI reply পাওয়া যায়নি।');
    } finally {
      setAiTyping(false);
    }
  };

  useEffect(() => {
    const openLiveChat = () => setOpen(true);
    window.addEventListener('hbc:open-live-chat', openLiveChat);
    return () => window.removeEventListener('hbc:open-live-chat', openLiveChat);
  }, []);

  useEffect(() => {
    if (open) { enableBrowserNotifications(); loadConversation(); }
  }, [open]);

  useEffect(() => {
    if (!conversation?.id) return;
    let active = true;
    const syncChat = async () => {
      const id = localStorage.getItem(CONVERSATION_KEY);
      if (!id || id !== conversation.id) return;
      const { data, error } = await supabase.rpc('get_guest_chat_conversation', { p_visitor_token: token(), p_conversation_id: id });
      if (!active || error || !data) return;
      const nextConversation = data as Conversation;
      setConversation(nextConversation);
      setStarted(true);
      if (nextConversation.status === 'open' && document.visibilityState === 'visible') void supabase.rpc('touch_guest_chat', { p_visitor_token: token(), p_conversation_id: id, p_current_path: window.location.pathname });
      await loadMessages(id);
    };
    void syncChat();
    const timer = window.setInterval(() => { void syncChat(); }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [open, conversation?.id]);

  const startChat = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSending(true);
    setChatError('');
    try {
      const firstMessage = message.trim();
      const { data, error } = await supabase.rpc('create_guest_chat', {
        p_customer_name: name.trim(), p_customer_mobile: mobile.trim() || null, p_visitor_token: token(), p_message: firstMessage,
      });
      if (error) throw error;
      if (!data?.id) throw new Error('Chat তৈরি হয়নি। আবার চেষ্টা করুন।');
      localStorage.setItem(CONVERSATION_KEY, data.id);
      setConversation(data as Conversation);
      setStarted(true);
      setMessage('');
      await loadMessages(data.id);
      void askAI(data.id, firstMessage, []);
    } catch (err: any) {
      console.error(err);
      setChatError(err?.message || 'মেসেজ পাঠানো যায়নি। আবার চেষ্টা করুন।');
    } finally { setSending(false); }
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [pendingVoice, setPendingVoice] = useState<Blob | null>(null);
  const [pendingVoiceUrl, setPendingVoiceUrl] = useState('');

  const clearPendingVoice = () => {
    if (pendingVoiceUrl) URL.revokeObjectURL(pendingVoiceUrl);
    setPendingVoice(null);
    setPendingVoiceUrl('');
  };

  const sendPendingVoice = async () => {
    if (!conversation?.id || !pendingVoice) return;
    setVoiceUploading(true); setChatError('');
    try {
      const url = await uploadChatAudio(pendingVoice, `customer/${conversation.id}`);
      const { error } = await supabase.rpc('send_guest_chat_audio', { p_visitor_token: token(), p_conversation_id: conversation.id, p_media_url: url });
      if (error) throw error;
      clearPendingVoice(); await loadMessages(conversation.id);
    } catch (err: any) { setChatError(err?.message || 'Voice message পাঠানো যায়নি।'); }
    finally { setVoiceUploading(false); }
  };

  const toggleRecording = async () => {
    if (recording) { mediaRecorderRef.current?.stop(); return; }
    if (pendingVoice) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setChatError('এই ব্রাউজারে voice message support নেই। Chrome/Edge ব্যবহার করুন.'); return; }
    try {
      setChatError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, getRecorderOptions());
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      recorder.onstop = () => { stream.getTracks().forEach((track) => track.stop()); setRecording(false); if (!audioChunksRef.current.length) return; const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' }); setPendingVoice(blob); setPendingVoiceUrl(URL.createObjectURL(blob)); };
      recorder.onerror = () => { stream.getTracks().forEach((track) => track.stop()); setRecording(false); setChatError('Voice recording বন্ধ হয়ে গেছে। আবার চেষ্টা করুন।'); };
      recorder.start(); mediaRecorderRef.current = recorder; setRecording(true);
    } catch (err: any) { setChatError(err?.message || 'Microphone permission দেওয়া হয়নি.'); setRecording(false); }
  };

  const saveReply = () => {
    const text = message.trim(); if (!text || savedReplies.includes(text)) return;
    const next = [text, ...savedReplies].slice(0, 30); setSavedReplies(next); localStorage.setItem('hbc-saved-replies', JSON.stringify(next));
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!conversation?.id || conversation.status !== 'open' || (!message.trim() && !chatAttachment)) return;
    setSending(true); setChatError('');
    try {
      const customerText = message.trim();
      const history = messages;
      if (chatAttachment) {
        const kind = mediaTypeFor(chatAttachment);
        if (!kind) throw new Error('শুধু ছবি বা ভিডিও পাঠানো যাবে।');
        if (chatAttachment.size > (kind === 'video' ? 40 : 10) * 1024 * 1024) throw new Error(kind === 'video' ? 'ভিডিও সর্বোচ্চ 40 MB হতে পারবে।' : 'ছবি সর্বোচ্চ 10 MB হতে পারবে।');
        const url = await uploadChatFile(chatAttachment, `customer/${conversation.id}`);
        const { error } = await supabase.rpc('send_guest_chat_media', { p_visitor_token: token(), p_conversation_id: conversation.id, p_media_url: url, p_message_type: kind, p_message: customerText });
        if (error) throw error;
        setChatAttachment(null); if (customerFileInputRef.current) customerFileInputRef.current.value = '';
      } else {
        const { error } = await supabase.rpc('send_guest_chat', { p_visitor_token: token(), p_conversation_id: conversation.id, p_message: customerText });
        if (error) throw error;
      }
      setMessage('');
      await loadMessages(conversation.id);
      if (customerText) void askAI(conversation.id, customerText, history);
    } catch (err: any) { setChatError(err?.message || 'মেসেজ পাঠানো যায়নি। আবার চেষ্টা করুন.'); }
    finally { setSending(false); }
  };

  return (
    <>
      {open && (
        <div className="fixed right-2 bottom-36 sm:right-5 sm:bottom-20 z-[70] flex max-h-[min(78dvh,640px)] w-[calc(100vw-1rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-2xl sm:w-[360px]">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white"><div><div className="font-semibold">Live Chat</div><div className="text-xs text-white/80">Homemade Beauty Care</div></div><button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full p-1 hover:bg-white/10"><X className="h-5 w-5" /></button></div>
          {!started ? (
            <form onSubmit={startChat} className="space-y-3 p-4">
              <p className="text-sm text-gray-600">{conversation?.status === 'closed' ? 'আগের chatটি বন্ধ হয়েছে। নতুন করে chat শুরু করুন—আপনার নম্বর না দিলেও চলবে.' : 'আপনার তথ্য দিন, AI assistant এখানেই উত্তর দেবে.'}</p>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম *" required className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="মোবাইল নম্বর (ঐচ্ছিক — না দিলেও চলবে)" className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="আপনার মেসেজ লিখুন *" required rows={3} className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <button disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Chat শুরু করুন</button>
            </form>
          ) : (
            <>
              <div className="min-h-[180px] flex-1 space-y-3 overflow-y-auto overscroll-contain bg-cream/40 p-4">
                {messages.map((item) => <div key={item.id} className={`flex ${item.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${item.sender_type === 'customer' ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm border bg-white text-gray-800'}`}>{item.message_type === 'audio' && item.media_url ? <audio controls preload="metadata" src={item.media_url} className="h-8 w-[180px] max-w-full" /> : item.message_type === 'image' && item.media_url ? <img src={item.media_url} alt="chat attachment" className="max-h-56 max-w-full rounded-lg" /> : item.message_type === 'video' && item.media_url ? <video controls preload="metadata" src={item.media_url} className="max-h-56 max-w-full rounded-lg" /> : item.message}</div></div>)}
                {aiTyping && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-sm border bg-white px-3 py-2 text-xs text-gray-500">AI লিখছে…</div></div>}
                {!messages.length && !aiTyping && <p className="pt-8 text-center text-xs text-gray-400">মেসেজ লোড হচ্ছে...</p>}
              </div>
              {conversation?.status === 'closed' && <div className="border-t bg-amber-50 px-3 py-2 text-xs text-amber-800">এই চ্যাটটি বন্ধ হয়েছে। পুরোনো মেসেজ দেখা যাবে। নতুন চ্যাট শুরু করতে <button type="button" onClick={() => { setStarted(false); setMessages([]); setConversation(null); localStorage.removeItem(CONVERSATION_KEY); }} className="font-semibold underline">নতুন চ্যাট</button> করুন।</div>}
              {chatError && <div className="border-t bg-red-50 px-3 py-2 text-xs text-red-600">{chatError}</div>}
              {chatAttachment && conversation?.status === 'open' && <div className="flex items-center gap-2 border-t bg-gray-50 px-3 py-2 text-xs"><span className="min-w-0 flex-1 truncate">{chatAttachment.name}</span><button type="button" onClick={() => setChatAttachment(null)} className="text-red-600">বাদ দিন</button></div>}
              {pendingVoiceUrl && <div className="flex items-center gap-2 border-t bg-gray-50 px-3 py-2"><audio controls preload="metadata" src={pendingVoiceUrl} className="min-w-0 flex-1" /><button type="button" onClick={clearPendingVoice} disabled={voiceUploading} title="Delete voice" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button><button type="button" onClick={sendPendingVoice} disabled={voiceUploading} title="Send voice" className="flex h-10 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-white disabled:opacity-50">{voiceUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send</button></div>}
              {conversation?.status === 'open' && <form onSubmit={sendMessage} className="flex items-end gap-1.5 border-t bg-white p-3"><button type="button" onClick={() => customerFileInputRef.current?.click()} title="ছবি বা ভিডিও পাঠান" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-primary"><ImagePlus className="h-4 w-4" /></button><input ref={customerFileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0] || null; if (file && !mediaTypeFor(file)) { setChatError('শুধু ছবি বা ভিডিও পাঠানো যাবে।'); e.currentTarget.value = ''; return; } setChatAttachment(file); setChatError(''); }} /><button type="button" onClick={toggleRecording} disabled={voiceUploading || !!pendingVoice} title={recording ? 'Stop recording' : 'Record voice message'} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${recording ? 'bg-red-50 text-red-600' : 'text-primary'}`}>{recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button><textarea rows={1} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="মেসেজ লিখুন..." className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary" /><button type="button" onClick={saveReply} title="Save reply" disabled={!message.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-primary disabled:opacity-40"><Bookmark className="h-4 w-4" /></button><button disabled={sending || voiceUploading || !message.trim()} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50"><Send className="h-4 w-4" /></button></form>}
            </>
          )}
        </div>
      )}
      <button onClick={() => setOpen((value) => !value)} aria-label="Open live chat" title="Live Chat" className="fixed right-4 bottom-36 sm:right-5 sm:bottom-24 z-[65] flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/25"><MessageCircle className="h-5 w-5" /></button>
    </>
  );
}

export function ChatAdminView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [savedReplies, setSavedReplies] = useState<string[]>(() => JSON.parse(localStorage.getItem('hbc-saved-replies') || '[]'));
  const [search, setSearch] = useState('');
  const [recording, setRecording] = useState(false);
  const [chatError, setChatError] = useState('');
  const [showSavedReplies, setShowSavedReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const [quickReplyTitle, setQuickReplyTitle] = useState('');
  const [quickReplyMessage, setQuickReplyMessage] = useState('');
  const [quickReplyImage, setQuickReplyImage] = useState<File | null>(null);
  const [chatImage, setChatImage] = useState<File | null>(null);
  const [chatImageType, setChatImageType] = useState<'image' | 'video'>('image');
  const [chatImageUrl, setChatImageUrl] = useState('');
  const [adminAudio, setAdminAudio] = useState<Blob | null>(null);
  const [adminAudioUrl, setAdminAudioUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [isQuickReplyLoading, setIsQuickReplyLoading] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const adminSeenMessageIdsRef = useRef<Set<string>>(new Set());
  const adminLoadedConversationIdsRef = useRef<Set<string>>(new Set());
  const selectedIdRef = useRef<string | null>(null);

  // Admin UI continues below unchanged.
