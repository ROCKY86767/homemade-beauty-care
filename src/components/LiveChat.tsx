import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, User, Mic, Square, Bookmark, Search, ImagePlus, Phone, MoreVertical, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'admin';
  sender_name: string | null;
  message: string;
  is_read: boolean;
  message_type: 'text' | 'audio' | 'image';
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
  const [chatError, setChatError] = useState('');

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
    const newAdminMessages = nextMessages.filter(
      (item) => item.sender_type === 'admin' && !notifiedMessageIdsRef.current.has(item.id)
    );
    if (!chatLoadedRef.current) {
      nextMessages.forEach((item) => notifiedMessageIdsRef.current.add(item.id));
      chatLoadedRef.current = true;
      return;
    }
    newAdminMessages.forEach((item) => {
      notifiedMessageIdsRef.current.add(item.id);
      if (document.visibilityState !== 'visible' || !open) {
        const body = item.message_type === 'audio' ? '🎤 নতুন voice message' : item.message_type === 'image' ? '🖼️ নতুন picture message' : item.message;
        const notification = new window.Notification('Homemade Beauty Care — Live Chat', {
          body: body || 'আপনার জন্য নতুন message এসেছে।',
          icon: '/homemade-logo.png',
          tag: 'hbc-live-chat',
        });
        notification.onclick = () => {
          window.focus();
          setOpen(true);
          notification.close();
        };
      }
    });
  };



  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase.rpc('get_guest_chat', {
      p_visitor_token: token(),
      p_conversation_id: conversationId,
    });
    if (!error) {
      const nextMessages = (data || []) as ChatMessage[];
      setMessages(nextMessages);
      notifyNewAdminMessages(nextMessages);
    }
  };

  const loadConversation = async () => {
    const id = localStorage.getItem(CONVERSATION_KEY);
    if (!id) return;
    const { data } = await supabase.rpc('get_guest_chat_conversation', {
      p_visitor_token: token(),
      p_conversation_id: id,
    });
    if (data) {
      setConversation(data as Conversation);
      if ((data as Conversation).status === 'closed') {
        setStarted(false);
        setMessage('');
      } else {
        setStarted(true);
        await loadMessages(id);
      }
    }
  };

  useEffect(() => {
    if (open) {
      enableBrowserNotifications();
      loadConversation();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !conversation?.id) return;
    let active = true;
    const syncChat = async () => {
      const id = localStorage.getItem(CONVERSATION_KEY);
      if (!id || id !== conversation.id) return;
      const { data, error } = await supabase.rpc('get_guest_chat_conversation', {
        p_visitor_token: token(),
        p_conversation_id: id,
      });
      if (!active || error || !data) return;
      const nextConversation = data as Conversation;
      setConversation(nextConversation);
      if (nextConversation.status === 'open') {
        setStarted(true);
        await loadMessages(id);
      } else {
        setStarted(false);
        setMessages([]);
        setMessage('');
      }
    };
    syncChat();
    const timer = window.setInterval(syncChat, 1500);
    return () => { active = false; window.clearInterval(timer); };
  }, [open, conversation?.id]);

  const startChat = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSending(true);
    setChatError('');
    try {
      const { data, error } = await supabase.rpc('create_guest_chat', {
        p_customer_name: name.trim(),
        p_customer_mobile: mobile.trim() || null,
        p_visitor_token: token(),
        p_message: message.trim(),
      });
      if (error) throw error;
      if (!data?.id) throw new Error('Chat তৈরি হয়নি। আবার চেষ্টা করুন।');
      localStorage.setItem(CONVERSATION_KEY, data.id);
      setConversation(data as Conversation);
      setStarted(true);
      setMessage('');
      await loadMessages(data.id);
    } catch (err: any) {
      console.error(err);
      setChatError(err?.message || 'মেসেজ পাঠানো যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setSending(false);
    }
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
    setVoiceUploading(true);
    setChatError('');
    try {
      const url = await uploadChatAudio(pendingVoice, `customer/${conversation.id}`);
      const { error } = await supabase.rpc('send_guest_chat_audio', {
        p_visitor_token: token(), p_conversation_id: conversation.id, p_media_url: url,
      });
      if (error) throw error;
      clearPendingVoice();
      await loadMessages(conversation.id);
    } catch (err: any) {
      setChatError(err?.message || 'Voice message পাঠানো যায়নি।');
    } finally {
      setVoiceUploading(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) { mediaRecorderRef.current?.stop(); return; }
    if (pendingVoice) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setChatError('এই ব্রাউজারে voice message support নেই। Chrome/Edge ব্যবহার করুন.');
      return;
    }
    try {
      setChatError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, getRecorderOptions());
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        if (!audioChunksRef.current.length) return;
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setPendingVoice(blob);
        setPendingVoiceUrl(URL.createObjectURL(blob));
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setChatError('Voice recording বন্ধ হয়ে গেছে। আবার চেষ্টা করুন।');
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err: any) {
      setChatError(err?.message || 'Microphone permission দেওয়া হয়নি.');
      setRecording(false);
    }
  };

  const saveReply = () => {
    const text = message.trim();
    if (!text || savedReplies.includes(text)) return;
    const next = [text, ...savedReplies].slice(0, 30);
    setSavedReplies(next);
    localStorage.setItem('hbc-saved-replies', JSON.stringify(next));
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!conversation?.id || !message.trim()) return;
    setSending(true);
    setChatError('');
    try {
      const { error } = await supabase.rpc('send_guest_chat', {
        p_visitor_token: token(), p_conversation_id: conversation.id, p_message: message.trim(),
      });
      if (error) throw error;
      setMessage('');
      await loadMessages(conversation.id);
    } catch (err: any) {
      setChatError(err?.message || 'মেসেজ পাঠানো যায়নি। আবার চেষ্টা করুন.');
    } finally { setSending(false); }
  };

  return (
    <>
      {open && (
        <div className="fixed right-4 bottom-36 sm:right-5 sm:bottom-20 z-[70] w-[calc(100vw-2rem)] max-w-[360px] overflow-hidden rounded-2xl border border-brand-border bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <div><div className="font-semibold">Live Chat</div><div className="text-xs text-white/80">Homemade Beauty Care</div></div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full p-1 hover:bg-white/10"><X className="h-5 w-5" /></button>
          </div>
          {!started ? (
            <form onSubmit={startChat} className="space-y-3 p-4">
              <p className="text-sm text-gray-600">{conversation?.status === 'closed' ? 'আগের chatটি বন্ধ হয়েছে। নতুন করে chat শুরু করুন—আপনার নম্বর না দিলেও চলবে.' : 'আপনার তথ্য দিন, আমরা এখানেই উত্তর দেব.'}</p>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম *" required className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="মোবাইল নম্বর (ঐচ্ছিক — না দিলেও চলবে)" className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="আপনার মেসেজ লিখুন *" required rows={3} className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <button disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Chat শুরু করুন</button>
            </form>
          ) : (
            <>
              <div className="h-80 space-y-3 overflow-y-auto bg-cream/40 p-4">
                {messages.map((item) => (
                  <div key={item.id} className={`flex ${item.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${item.sender_type === 'customer' ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm border bg-white text-gray-800'}`}>
                      {item.message_type === 'audio' && item.media_url ? <audio controls preload="metadata" src={item.media_url} className="h-8 w-[180px] max-w-full" /> : item.message_type === 'image' && item.media_url ? <img src={item.media_url} alt="chat attachment" className="max-h-56 max-w-full rounded-lg" /> : item.message}
                    </div>
                  </div>
                ))}
                {!messages.length && <p className="pt-8 text-center text-xs text-gray-400">মেসেজ লোড হচ্ছে...</p>}
              </div>
              {chatError && <div className="border-t bg-red-50 px-3 py-2 text-xs text-red-600">{chatError}</div>}
              {pendingVoiceUrl && (
                <div className="flex items-center gap-2 border-t bg-gray-50 px-3 py-2">
                  <audio controls preload="metadata" src={pendingVoiceUrl} className="min-w-0 flex-1" />
                  <button type="button" onClick={clearPendingVoice} disabled={voiceUploading} title="Delete voice" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                  <button type="button" onClick={sendPendingVoice} disabled={voiceUploading} title="Send voice" className="flex h-10 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-white disabled:opacity-50">{voiceUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send</button>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex items-end gap-2 border-t bg-white p-3">
                <button type="button" onClick={toggleRecording} disabled={voiceUploading || !!pendingVoice} title={recording ? 'Stop recording' : 'Record voice message'} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${recording ? 'bg-red-50 text-red-600' : 'text-primary'}`}>{recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
                <textarea rows={1} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="মেসেজ লিখুন..." className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary" />
                <button type="button" onClick={saveReply} title="Save reply" disabled={!message.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-primary disabled:opacity-40"><Bookmark className="h-4 w-4" /></button>
                <button disabled={sending || voiceUploading || !message.trim()} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
              </form>
            </>
          )}
        </div>
      )}
      <button onClick={() => setOpen((value) => !value)} aria-label="Open live chat" title="Live Chat" className="fixed right-4 bottom-36 sm:right-5 sm:bottom-24 z-[65] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/25"><MessageCircle className="h-7 w-7" /></button>
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
  const [chatImageUrl, setChatImageUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const messageRequestRef = useRef(0);
  const conversationRequestRef = useRef(0);
  const mobileChatHistoryRef = useRef(false);
  const conversationsRef = useRef<Conversation[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);

  const loadQuickReplies = async () => {
    const { data } = await supabase.from('chat_quick_replies').select('id,title,message,media_url').order('created_at', { ascending: false });
    setQuickReplies(data || []);
  };

  const uploadImage = async (file: File, prefix: string) => {
    const path = prefix + '/' + crypto.randomUUID() + '-' + file.name;
    const { error } = await supabase.storage.from('chat-quick-replies').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return supabase.storage.from('chat-quick-replies').getPublicUrl(path).data.publicUrl;
  };

  const loadConversations = async () => {
    const requestId = ++conversationRequestRef.current;

    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Live chat conversation sync failed:', error);
      return;
    }

    if (requestId !== conversationRequestRef.current) return;

    let rows = (data || []) as Conversation[];

    // Never wipe a healthy chat list because of a transient empty response.
    if (!rows.length && conversationsRef.current.length) {
      const retry = await supabase
        .from('chat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (requestId !== conversationRequestRef.current) return;

      if (retry.error) {
        console.error('Live chat conversation retry failed:', retry.error);
        return;
      }

      rows = (retry.data || []) as Conversation[];

      if (!rows.length) {
        return;
      }
    }

    conversationsRef.current = rows;
    setConversations(rows);
    setUnread(rows.filter((row) => row.status === 'open').length);

    if (selectedIdRef.current) {
      const freshSelected = rows.find(
        (row) => row.id === selectedIdRef.current
      );

      if (freshSelected) {
        setSelected(freshSelected);
      }
    }
  };

  const loadMessages = async (conversationId: string) => {
    const requestId = ++messageRequestRef.current;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Live chat message sync failed:', error);
      return;
    }

    if (
      requestId !== messageRequestRef.current ||
      selectedIdRef.current !== conversationId
    ) {
      return;
    }

    const rows = (data || []) as ChatMessage[];

    // Never wipe visible messages because of a transient empty response.
    if (!rows.length && messagesRef.current.length) {
      return;
    }

    messagesRef.current = rows;
    setMessages(rows);

    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'customer');
  };

  useEffect(() => {
    let disposed = false;
    let syncTimer: number | null = null;

    const refreshAdminChat = async () => {
      if (disposed) return;

      await loadConversations();

      if (disposed) return;

      const id = selectedIdRef.current;

      if (id) {
        await loadMessages(id);
      }
    };

    const scheduleRefresh = () => {
      if (disposed || syncTimer !== null) return;

      syncTimer = window.setTimeout(() => {
        syncTimer = null;
        void refreshAdminChat();
      }, 250);
    };

    void refreshAdminChat().finally(() => {
      if (!disposed) setLoading(false);
    });

    void loadQuickReplies();

    const channel = supabase
      .channel('admin-live-chat')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations' },
        scheduleRefresh
      )
      .subscribe((status) => {
        // Re-sync after Realtime reconnects.
        if (
          status === 'SUBSCRIBED' ||
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          scheduleRefresh();
        }
      });

    const handleAdminReturn = () => {
      if (document.visibilityState === 'visible') {
        scheduleRefresh();
      }
    };

    const handlePageShow = () => {
      scheduleRefresh();
    };

    document.addEventListener('visibilitychange', handleAdminReturn);
    window.addEventListener('focus', handleAdminReturn);
    window.addEventListener('pageshow', handlePageShow);

    const timer = window.setInterval(() => {
      scheduleRefresh();
    }, 5000);

    return () => {
      disposed = true;

      if (syncTimer !== null) {
        window.clearTimeout(syncTimer);
      }

      window.clearInterval(timer);

      document.removeEventListener('visibilitychange', handleAdminReturn);
      window.removeEventListener('focus', handleAdminReturn);
      window.removeEventListener('pageshow', handlePageShow);

      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!selected?.id) return;
    selectedIdRef.current = selected.id;
    loadMessages(selected.id);
  }, [selected?.id]);

  const adminRecorderRef = useRef<MediaRecorder | null>(null);
  const adminAudioChunksRef = useRef<Blob[]>([]);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [pendingVoice, setPendingVoice] = useState<Blob | null>(null);
  const [pendingVoiceUrl, setPendingVoiceUrl] = useState('');

  const clearPendingVoice = () => {
    if (pendingVoiceUrl) URL.revokeObjectURL(pendingVoiceUrl);
    setPendingVoice(null);
    setPendingVoiceUrl('');
  };

  const sendPendingVoice = async () => {
    if (!selected?.id || !pendingVoice) return;
    setVoiceUploading(true);
    setChatError('');
    try {
      const url = await uploadChatAudio(pendingVoice, `admin/${selected.id}`);
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: selected.id, sender_type: 'admin', sender_name: 'Admin', message: 'Voice message',
        is_read: true, message_type: 'audio', media_url: url,
      });
      if (error) throw error;
      await supabase.from('chat_conversations').update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', selected.id);
      clearPendingVoice();
      await loadMessages(selected.id);
    } catch (err: any) {
      setChatError(err?.message || 'Voice message পাঠানো যায়নি.');
    } finally {
      setVoiceUploading(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) { adminRecorderRef.current?.stop(); return; }
    if (pendingVoice) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setChatError('এই ব্রাউজারে voice message support নেই। Chrome/Edge ব্যবহার করুন.');
      return;
    }
    if (!selected) return;
    try {
      setChatError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, getRecorderOptions());
      adminAudioChunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) adminAudioChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        if (!adminAudioChunksRef.current.length) return;
        const blob = new Blob(adminAudioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setPendingVoice(blob);
        setPendingVoiceUrl(URL.createObjectURL(blob));
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setChatError('Voice recording বন্ধ হয়ে গেছে। আবার চেষ্টা করুন.');
      };
      recorder.start();
      adminRecorderRef.current = recorder;
      setRecording(true);
    } catch (err: any) {
      setChatError(err?.message || 'Microphone permission দেওয়া হয়নি.');
      setRecording(false);
    }
  };

  const saveCurrentReply = () => {
    const text = message.trim();
    if (!text) return;
    const next = [text, ...savedReplies.filter((item) => item !== text)].slice(0, 30);
    setSavedReplies(next);
    localStorage.setItem('hbc-saved-replies', JSON.stringify(next));
    setShowSavedReplies(false);
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setChatError('');
    if (!selected || (!message.trim() && !chatImage && !chatImageUrl)) return;
    try {
      const { data: fresh, error: freshError } = await supabase.from('chat_conversations').select('*').eq('id', selected.id).maybeSingle();
      if (freshError) throw freshError;
      if (!fresh) throw new Error('Chat conversation পাওয়া যায়নি.');
      if (fresh.status === 'closed') {
        const { error: reopenError } = await supabase.from('chat_conversations').update({
          status: 'open', updated_at: new Date().toISOString(), last_message_at: new Date().toISOString(),
        }).eq('id', selected.id);
        if (reopenError) throw reopenError;
        fresh.status = 'open';
      }
      let media_url = null;
      if (chatImage) media_url = await uploadImage(chatImage, 'chat/' + selected.id);
      else media_url = chatImageUrl;
      const messageType = chatImage || chatImageUrl ? 'image' : 'text';
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: selected.id, sender_type: 'admin', sender_name: 'Admin',
        message: message.trim() || 'Image', is_read: true, message_type: messageType, media_url,
      });
      if (error) throw error;
      await supabase.from('chat_conversations').update({
        last_message_at: new Date().toISOString(), updated_at: new Date().toISOString(), status: 'open',
      }).eq('id', selected.id);
      setSelected({ ...selected, status: 'open', last_message_at: new Date().toISOString() });
      setMessage('');
      setChatImage(null);
      setChatImageUrl(null);
      await Promise.all([loadMessages(selected.id), loadConversations()]);
    } catch (err: any) {
      setChatError(err?.message || 'মেসেজ পাঠানো যায়নি.');
    }
  };

  const reopenChat = async () => {
    if (!selected) return;
    const { error } = await supabase.from('chat_conversations').update({ status: 'open', updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() }).eq('id', selected.id);
    if (error) { setChatError(error.message || 'Chat reopen করা যায়নি.'); return; }
    setChatError('');
    setSelected({ ...selected, status: 'open' });
    await loadConversations();
  };

  const closeChat = async () => {
    if (!selected) return;
    await supabase.from('chat_conversations').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', selected.id);
    setSelected({ ...selected, status: 'closed' });
    await loadConversations();
  };

  const selectConversation = (item: Conversation) => {
    selectedIdRef.current = item.id;
    messageRequestRef.current += 1;
    messagesRef.current = [];
    setSelected(item);
    setMessages([]);
    setMessage('');
    setChatError('');
    setShowSavedReplies(false);
    if (window.innerWidth < 1024 && !mobileChatHistoryRef.current) {
      window.history.pushState({ hbcLiveChat: true }, '', window.location.href);
      mobileChatHistoryRef.current = true;
    }
  };

  useEffect(() => {
    const handleMobileChatBack = () => {
      if (!mobileChatHistoryRef.current) return;
      mobileChatHistoryRef.current = false;
      selectedIdRef.current = null;
      messageRequestRef.current += 1;
      setSelected(null);
      messagesRef.current = [];
      setMessages([]);
      setMessage('');
      setChatError('');
      setShowSavedReplies(false);
    };
    window.addEventListener('popstate', handleMobileChatBack);
    return () => window.removeEventListener('popstate', handleMobileChatBack);
  }, []);

  const filtered = conversations.filter(item => `${item.customer_name} ${item.customer_mobile || ''}`.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f7f8f6]">
      <div className="flex shrink-0 items-center justify-between border-b bg-white px-5 py-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><MessageCircle className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Live Chat</h1>
              <p className="text-xs text-gray-500">{unread} open conversation{unread === 1 ? '' : 's'} • Customer Support</p>
            </div>
          </div>
        </div>
        <button onClick={loadConversations} className="rounded-lg border bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Refresh</button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="grid h-full min-h-0 overflow-hidden rounded-none border-y border-gray-200 bg-white shadow-sm sm:rounded-2xl sm:border lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className={"min-h-0 flex-col border-r bg-white " + (selected ? "hidden lg:flex" : "flex")}>
            <div className="shrink-0 border-b bg-gray-50/80 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div><h2 className="text-sm font-bold text-gray-900">Customers</h2><p className="mt-0.5 text-[11px] text-gray-500">{conversations.length} total conversations</p></div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">{unread} Open</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 shadow-sm">
                <Search className="h-4 w-4 shrink-0 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer..." className="w-full py-2.5 text-sm outline-none" />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {filtered.map((item) => (
                <button key={item.id} onClick={() => selectConversation(item)} className={`w-full border-b border-gray-100 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 ${selected?.id === item.id ? 'bg-primary/[0.07] border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected?.id === item.id ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}><User className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><div className="truncate text-sm font-semibold text-gray-900">{item.customer_name}</div><span className={`h-2 w-2 shrink-0 rounded-full ${item.status === 'open' ? 'bg-green-500' : 'bg-gray-300'}`} /></div>
                      <div className="mt-0.5 truncate text-xs text-gray-500">{item.customer_mobile || 'No phone number'}</div>
                      <div className="mt-1 text-[10px] text-gray-400">{new Date(item.last_message_at).toLocaleString()}</div>
                    </div>
                  </div>
                </button>
              ))}
              {!filtered.length && <div className="p-8 text-center text-sm text-gray-400">No customer found.</div>}
            </div>
          </aside>

          <section className={"min-h-0 flex-col overflow-hidden bg-[#fbfcfa] " + (selected ? "flex" : "hidden lg:flex")}>
            {selected ? (
              <>
                <div className="flex shrink-0 items-center justify-between border-b bg-white px-3 py-3.5 sm:px-5">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <button type="button" onClick={() => { selectedIdRef.current = null; messageRequestRef.current += 1; messagesRef.current = []; setSelected(null); setMessages([]); setChatError(""); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-gray-600 hover:bg-gray-50 lg:hidden" aria-label="Back to customers"><ArrowLeft className="h-4 w-4" /></button>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><User className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-gray-900">{selected.customer_name}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500"><span className={`h-1.5 w-1.5 rounded-full ${selected.status === 'open' ? 'bg-green-500' : 'bg-gray-300'}`} />{selected.status === 'open' ? 'Online / Open' : 'Chat Closed'}{selected.customer_mobile && <> • {selected.customer_mobile}</>}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.customer_mobile && <a href={`tel:${selected.customer_mobile}`} className="hidden rounded-lg border p-2 text-gray-500 hover:bg-gray-50 sm:block" title="Call customer"><Phone className="h-4 w-4" /></a>}
                    {selected.status === 'open' ? <button onClick={closeChat} className="rounded-lg border px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Close Chat</button> : <button onClick={reopenChat} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:opacity-90">Reopen Chat</button>}
                    <button className="rounded-lg border p-2 text-gray-400 hover:bg-gray-50" title="More"><MoreVertical className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 sm:py-5">
                  <div className="mx-auto flex max-w-4xl flex-col gap-3">
                    {messages.map((item) => (
                      <div key={item.id} className={`flex ${item.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[68%] rounded-xl px-3 py-2 text-[13px] shadow-sm ${item.sender_type === 'admin' ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm border border-gray-200 bg-white text-gray-800'}`}>
                          {item.message_type === 'audio' && item.media_url ? <audio controls preload="metadata" src={item.media_url} className="max-w-full" /> : item.message_type === 'image' && item.media_url ? <><img src={item.media_url} alt="chat attachment" className="max-h-72 max-w-full rounded-xl object-contain" />{item.message && item.message !== 'Image' && <div className="mt-2">{item.message}</div>}</> : item.message}
                          <div className={`mt-1 text-[9px] ${item.sender_type === 'admin' ? 'text-white/60' : 'text-gray-400'}`}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    ))}
                    {!messages.length && <div className="flex flex-1 items-center justify-center py-24 text-sm text-gray-400">No messages yet.</div>}
                  </div>
                </div>

                {selected.status === 'open' ? (
                  <div className="shrink-0 border-t bg-white">
                    {chatError && <div className="border-b bg-red-50 px-4 py-2 text-xs text-red-600">{chatError}</div>}
                    {showSavedReplies && (
                      <div className="max-h-48 overflow-y-auto border-b bg-gray-50 p-3">
                        <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-gray-600">Quick Responses</span><button type="button" onClick={() => setQuickReplyOpen(true)} className="rounded-md border bg-white px-2 py-1 text-[10px]">+ Add</button></div>
                        {quickReplies.length ? quickReplies.map((item) => (
                          <button key={item.id} type="button" onClick={() => { setMessage(item.message || ''); setChatImageUrl(item.media_url || null); setChatImage(null); setShowSavedReplies(false); }} className="mb-1 block w-full rounded-lg border bg-white px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100">
                            <span className="font-medium">{item.title || 'Quick response'}</span>{item.message && <span className="ml-1 text-gray-500">— {item.message}</span>}{item.media_url && <span className="ml-1">🖼️</span>}
                          </button>
                        )) : <div className="px-2 py-3 text-center text-xs text-gray-400">কোনো quick response নেই। + Add দিয়ে save করুন.</div>}
                      </div>
                    )}
                    {chatImageUrl && <div className="flex items-center gap-3 border-b bg-gray-50 px-4 py-2"><img src={chatImageUrl} alt="selected" className="h-12 w-12 rounded-lg object-cover" /><span className="text-xs text-gray-600">Saved picture selected</span><button type="button" onClick={() => setChatImageUrl(null)} className="ml-auto rounded p-1 text-gray-400 hover:bg-gray-200"><X className="h-4 w-4" /></button></div>}
                    {chatImage && <div className="flex items-center gap-3 border-b bg-gray-50 px-4 py-2"><img src={URL.createObjectURL(chatImage)} alt="selected" className="h-12 w-12 rounded-lg object-cover" /><span className="truncate text-xs text-gray-600">{chatImage.name}</span><button type="button" onClick={() => setChatImage(null)} className="ml-auto rounded p-1 text-gray-400 hover:bg-gray-200"><X className="h-4 w-4" /></button></div>}
                    {pendingVoiceUrl && (
                      <div className="flex items-center gap-3 border-b bg-gray-50 px-4 py-2">
                        <audio controls preload="metadata" src={pendingVoiceUrl} className="h-9 w-[180px] max-w-[45%] min-w-0 shrink" />
                        <button type="button" onClick={clearPendingVoice} disabled={voiceUploading} title="Delete voice" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                        <button type="button" onClick={sendPendingVoice} disabled={voiceUploading} title="Send voice" className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{voiceUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send</button>
                      </div>
                    )}
                    <form onSubmit={send} className="flex items-end gap-1.5 p-2.5 sm:gap-2 sm:p-4">
                      <button type="button" onClick={toggleRecording} disabled={voiceUploading || !!pendingVoice} title={recording ? 'Stop recording' : 'Record voice message'} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${recording ? 'bg-red-50 text-red-600' : 'text-primary hover:bg-primary/5'}`}>{recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
                      <textarea rows={1} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement)?.requestSubmit(); } }} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a reply...  Enter to send" className="min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-primary focus:bg-white" />
                      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { setChatImage(e.target.files?.[0] || null); setChatImageUrl(null); }} />
                      <button type="button" onClick={() => imageInputRef.current?.click()} title="Picture" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-gray-600 hover:bg-gray-50 sm:h-11 sm:w-11"><ImagePlus className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setShowSavedReplies((value) => !value)} title="Quick responses" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${showSavedReplies ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}><Bookmark className="h-4 w-4" /></button>
                      <button disabled={voiceUploading || (!message.trim() && !chatImage && !chatImageUrl)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm disabled:opacity-50 sm:h-11 sm:w-auto sm:gap-2 sm:px-5"><Send className="h-4 w-4" /><span className="hidden sm:inline">Send</span></button>
                    </form>
                  </div>
                ) : (
                  <div className="shrink-0 border-t bg-white p-4 text-center text-sm text-gray-500">Chat is closed. Click <span className="font-semibold text-primary">Reopen Chat</span> to continue.</div>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MessageCircle className="h-8 w-8" /></div>
                  <h3 className="font-semibold text-gray-800">Select a customer</h3>
                  <p className="mt-1 text-sm text-gray-400">বাম পাশ থেকে customer নির্বাচন করুন এবং chat শুরু করুন.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {quickReplyOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Quick Response</h3><button onClick={() => setQuickReplyOpen(false)}><X className="h-5 w-5" /></button></div>
            <input value={quickReplyTitle} onChange={e => setQuickReplyTitle(e.target.value)} placeholder="Name / title" className="mb-2 w-full rounded-lg border px-3 py-2 text-sm" />
            <textarea value={quickReplyMessage} onChange={e => setQuickReplyMessage(e.target.value)} placeholder="Message" rows={3} className="mb-2 w-full rounded-lg border px-3 py-2 text-sm" />
            <input type="file" accept="image/*" onChange={e => setQuickReplyImage(e.target.files?.[0] || null)} className="mb-3 w-full text-sm" />
            <button onClick={async () => { try { let url = null; if (quickReplyImage) url = await uploadImage(quickReplyImage, 'quick-replies'); const r = await supabase.from('chat_quick_replies').insert({ title: quickReplyTitle || quickReplyMessage.slice(0, 40) || 'Quick response', message: quickReplyMessage || null, media_url: url }); if (r.error) throw r.error; await loadQuickReplies(); setQuickReplyTitle(''); setQuickReplyMessage(''); setQuickReplyImage(null); setQuickReplyOpen(false); } catch (err: any) { setChatError(err.message); } }} className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white">Save Quick Response</button>
          </div>
        </div>
      )}
    </div>
  );
}