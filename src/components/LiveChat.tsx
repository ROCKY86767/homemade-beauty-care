import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, User, Mic, Square, Bookmark, Search, ImagePlus } from 'lucide-react';
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
  const { data } = supabase.storage.from('chat-audio').getPublicUrl(path);
  return data.publicUrl;
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

  const savedConversationId = useMemo(
    () => localStorage.getItem(CONVERSATION_KEY),
    []
  );

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase.rpc('get_guest_chat', {
      p_visitor_token: token(),
      p_conversation_id: conversationId,
    });
    if (!error) setMessages((data || []) as ChatMessage[]);
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
    if (open) loadConversation();
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
    return () => {
      active = false;
      window.clearInterval(timer);
    };
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

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setChatError('এই ব্রাউজারে voice message support নেই। Chrome/Edge ব্যবহার করুন।');
      return;
    }
    try {
      setChatError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, getRecorderOptions());
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        if (!conversation?.id || !audioChunksRef.current.length) return;
        try {
          setVoiceUploading(true);
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const url = await uploadChatAudio(blob, `customer/${conversation.id}`);
          const { error } = await supabase.rpc('send_guest_chat_audio', {
            p_visitor_token: token(),
            p_conversation_id: conversation.id,
            p_media_url: url,
          });
          if (error) throw error;
          await loadMessages(conversation.id);
        } catch (err: any) {
          console.error(err);
          setChatError(err?.message || 'Voice message পাঠানো যায়নি।');
        } finally {
          setVoiceUploading(false);
        }
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
      setChatError(err?.message || 'Microphone permission দেওয়া হয়নি।');
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
        p_visitor_token: token(),
        p_conversation_id: conversation.id,
        p_message: message.trim(),
      });
      if (error) throw error;
      setMessage('');
      await loadMessages(conversation.id);
    } catch (err: any) {
      console.error(err);
      setChatError(err?.message || 'মেসেজ পাঠানো যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed right-4 bottom-36 sm:right-5 sm:bottom-20 z-[70] w-[calc(100vw-2rem)] max-w-[360px] overflow-hidden rounded-2xl border border-brand-border bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
            <div>
              <div className="font-semibold">Live Chat</div>
              <div className="text-xs text-white/80">Homemade Beauty Care</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full p-1 hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!started ? (
            <form onSubmit={startChat} className="p-4 space-y-3">
              <p className="text-sm text-gray-600">{conversation?.status === 'closed' ? 'আগের chatটি বন্ধ হয়েছে। নতুন করে chat শুরু করুন—আপনার নম্বর না দিলেও চলবে।' : 'আপনার তথ্য দিন, আমরা এখানেই উত্তর দেব।'}</p>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম *" required className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="মোবাইল নম্বর (ঐচ্ছিক — না দিলেও চলবে)" className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="আপনার মেসেজ লিখুন *" required rows={3} className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <button disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Chat শুরু করুন
              </button>
            </form>
          ) : (
            <>
              <div className="h-80 space-y-3 overflow-y-auto bg-cream/40 p-4">
                {messages.map((item) => (
                  <div key={item.id} className={`flex ${item.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${item.sender_type === 'customer' ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm bg-white border text-gray-800'}`}>
                      {item.message_type === 'audio' && item.media_url ? <audio controls preload="metadata" src={item.media_url} className="max-w-full" /> : item.message_type === 'image' && item.media_url ? <img src={item.media_url} alt="chat attachment" className="max-h-56 max-w-full rounded-lg" /> : item.message}
                    </div>
                  </div>
                ))}
                {!messages.length && <p className="text-center text-xs text-gray-400 pt-8">মেসেজ লোড হচ্ছে...</p>}
              </div>
              {chatError && <div className="border-t bg-red-50 px-3 py-2 text-xs text-red-600">{chatError}</div>}
              <form onSubmit={sendMessage} className="flex items-end gap-2 border-t bg-white p-3">
                <button type="button" onClick={toggleRecording} title={recording ? "Stop & send voice message" : "Record voice message"} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${recording ? "bg-red-50 text-red-600" : "text-primary"}`}>{recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button><textarea rows={1} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="মেসেজ লিখুন..." className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary" />
                <button type="button" onClick={saveReply} title="Save reply" disabled={!message.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-primary disabled:opacity-40"><Bookmark className="h-4 w-4" /></button><button disabled={sending || voiceUploading || (!message.trim() && !chatImage)} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Open live chat"
        title="Live Chat"
        className="fixed right-4 bottom-36 sm:right-5 sm:bottom-24 z-[65] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/25"
      >
        <MessageCircle className="h-7 w-7" />
      </button>
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
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const messageRequestRef = useRef(0);

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
    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('last_message_at', { ascending: false });
    const rows = (data || []) as Conversation[];
    setConversations(rows);
    setUnread(rows.filter((row) => row.status === 'open').length);
  };

  const loadMessages = async (conversationId: string) => {
    const requestId = ++messageRequestRef.current;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (requestId !== messageRequestRef.current || selectedIdRef.current !== conversationId) return;

    setMessages((data || []) as ChatMessage[]);
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'customer');
  };

  useEffect(() => {
    loadConversations().finally(() => setLoading(false));
    loadQuickReplies();

    const channel = supabase
      .channel('admin-live-chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        loadConversations();
        const id = selectedIdRef.current;
        if (id) loadMessages(id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => {
        loadConversations();
      })
      .subscribe();

    const timer = window.setInterval(() => {
      loadConversations();
      const id = selectedIdRef.current;
      if (id) loadMessages(id);
    }, 5000);

    return () => {
      window.clearInterval(timer);
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

  const toggleRecording = async () => {
    if (recording) {
      adminRecorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setChatError('এই ব্রাউজারে voice message support নেই। Chrome/Edge ব্যবহার করুন।');
      return;
    }
    if (!selected) return;
    try {
      setChatError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, getRecorderOptions());
      adminAudioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) adminAudioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        if (!selected?.id || !adminAudioChunksRef.current.length) return;
        try {
          setVoiceUploading(true);
          const blob = new Blob(adminAudioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const url = await uploadChatAudio(blob, `admin/${selected.id}`);
          const { error } = await supabase.from('chat_messages').insert({
            conversation_id: selected.id,
            sender_type: 'admin',
            sender_name: 'Admin',
            message: 'Voice message',
            is_read: true,
            message_type: 'audio',
            media_url: url,
          });
          if (error) throw error;
          await supabase.from('chat_conversations').update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', selected.id);
          await loadMessages(selected.id);
        } catch (err: any) {
          console.error(err);
          setChatError(err?.message || 'Voice message পাঠানো যায়নি।');
        } finally {
          setVoiceUploading(false);
        }
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setChatError('Voice recording বন্ধ হয়ে গেছে। আবার চেষ্টা করুন।');
      };
      recorder.start();
      adminRecorderRef.current = recorder;
      setRecording(true);
    } catch (err: any) {
      setChatError(err?.message || 'Microphone permission দেওয়া হয়নি।');
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
    if (!selected || (!message.trim() && !chatImage)) return;

    try {
      // Refresh the conversation first so a stale closed/open state cannot block sending.
      const { data: fresh, error: freshError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', selected.id)
        .maybeSingle();

      if (freshError) throw freshError;
      if (!fresh) throw new Error('Chat conversation পাওয়া যায়নি।');

      if (fresh.status === 'closed') {
        const { error: reopenError } = await supabase
          .from('chat_conversations')
          .update({
            status: 'open',
            updated_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
          })
          .eq('id', selected.id);
        if (reopenError) throw reopenError;
        fresh.status = 'open';
      }

      let media_url = null;
      if (chatImage) media_url = await uploadImage(chatImage, 'chat/' + selected.id);
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: selected.id,
        sender_type: 'admin',
        sender_name: 'Admin',
        message: message.trim() || 'Image',
        is_read: true,
        message_type: chatImage ? 'image' : 'text',
        media_url,
      });
      if (error) throw error;

      await supabase.from('chat_conversations').update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'open',
      }).eq('id', selected.id);

      const nextSelected = { ...selected, status: 'open' as const, last_message_at: new Date().toISOString() };
      setSelected(nextSelected);
      setMessage('');
      setChatImage(null);
      await Promise.all([loadMessages(selected.id), loadConversations()]);
    } catch (err: any) {
      console.error(err);
      setChatError(err?.message || 'মেসেজ পাঠানো যায়নি।');
    }
  };

  const reopenChat = async () => {
    if (!selected) return;
    const { error } = await supabase.from('chat_conversations')
      .update({ status: 'open', updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() })
      .eq('id', selected.id);
    if (error) {
      setChatError(error.message || 'Chat reopen করা যায়নি।');
      return;
    }
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
    setSelected(item);
    setMessages([]);
    setMessage('');
    setChatError('');
    setShowSavedReplies(false);
  };

  if (loading) return <div className="min-h-[300px] flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Chat</h1>
          <p className="mt-1 text-sm text-gray-500">{unread} open conversation{unread === 1 ? '' : 's'}</p>
        </div>
        <button onClick={loadConversations} className="rounded-lg border bg-white px-4 py-2 text-sm">Refresh</button>
      </div>

      <div className="grid h-[min(600px,calc(100vh-280px))] min-h-[420px] overflow-hidden rounded-xl border bg-white lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col border-r bg-gray-50">
          <div className="border-b p-3"><div className="mb-2 text-sm font-semibold">Conversations</div><div className="flex items-center gap-2 rounded-lg border bg-white px-2"><Search className="h-4 w-4 text-gray-400" /><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search customer..." className="w-full py-2 text-sm outline-none" /></div></div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversations.filter(item => `${item.customer_name} ${item.customer_mobile || ''}`.toLowerCase().includes(search.toLowerCase())).map((item) => (
              <button key={item.id} onClick={() => selectConversation(item)} className={`w-full border-b p-4 text-left hover:bg-white ${selected?.id === item.id ? 'bg-white' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><User className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{item.customer_name}</div>
                    <div className="truncate text-xs text-gray-500">{item.customer_mobile || 'No phone'}</div>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${item.status === 'open' ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <div className="mt-2 text-[11px] text-gray-400">{new Date(item.last_message_at).toLocaleString()}</div>
              </button>
            ))}
            {!conversations.length && <div className="p-8 text-center text-sm text-gray-400">No conversations yet.</div>}
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b p-4">
                <div>
                  <div className="font-semibold">{selected.customer_name}</div>
                  <div className="text-xs text-gray-500">{selected.customer_mobile || 'No phone number'}</div>
                </div>
                {selected.status === 'open'
    ? <button onClick={closeChat} className="rounded-lg border px-3 py-2 text-xs hover:bg-gray-50">Close Chat</button>
    : <button onClick={reopenChat} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:opacity-90">Reopen Chat</button>}
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-cream/30 p-3">
                {messages.map((item) => (
                  <div key={item.id} className={`flex ${item.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${item.sender_type === 'admin' ? 'bg-primary text-white' : 'border bg-white text-gray-800'}`}>
                      {item.message_type === 'audio' && item.media_url ? <audio controls preload="metadata" src={item.media_url} className="max-w-full" /> : item.message}
                    </div>
                  </div>
                ))}
              </div>
              {selected.status === 'open' ? (
                <>
                <div className="shrink-0 border-t bg-white">
                  {chatError && <div className="border-b bg-red-50 px-3 py-2 text-xs text-red-600">{chatError}</div>}
                  {showSavedReplies && (
                    <div className="max-h-48 overflow-y-auto border-b bg-gray-50 p-2">
                      <div className="mb-1 flex items-center justify-between"><span className="text-[11px] font-semibold text-gray-500">Quick Responses</span><button type="button" onClick={()=>setQuickReplyOpen(true)} className="rounded border px-2 py-0.5 text-[10px]">+ Add</button></div>
                      {quickReplies.length ? quickReplies.map((item) => (
                        <button key={item.id} type="button" onClick={() => { setMessage(item.message || ''); setShowSavedReplies(false); }} className="mb-1 block w-full rounded-lg border bg-white px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100">
                          <span className="font-medium">{item.title || 'Quick response'}</span>{item.message && <span className="ml-1 text-gray-500">— {item.message}</span>}{item.media_url && <span className="ml-1">🖼️</span>}
                        </button>
                      )) : <div className="px-2 py-3 text-center text-xs text-gray-400">কোনো quick response নেই। + Add দিয়ে save করুন।</div>}
                    </div>
                  )}
                  <form onSubmit={send} className="flex shrink-0 items-end gap-2 p-3">
                    <button type="button" onClick={toggleRecording} title={recording ? "Stop & send voice message" : "Record voice message"} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${recording ? "bg-red-50 text-red-600" : "text-primary"}`}>
                      {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <textarea
                      rows={1}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement)?.requestSubmit(); } }}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Reply... (Enter = send, Shift+Enter = new line)"
                      className="min-w-0 flex-1 resize-none rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                    <div className="flex shrink-0 items-center gap-2">
                      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>setChatImage(e.target.files?.[0] || null)} />
                      <button type="button" onClick={()=>imageInputRef.current?.click()} title="Picture" className="flex h-10 w-10 items-center justify-center rounded-lg border"><ImagePlus className="h-4 w-4"/></button>
                      <button type="button" onClick={() => setShowSavedReplies((value) => !value)} title="Quick responses" className={`flex h-10 w-10 items-center justify-center rounded-lg border ${showSavedReplies ? "bg-primary/10 text-primary" : "text-gray-600"}`}>
                        <Bookmark className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={saveCurrentReply} disabled={!message.trim()} title="Save current reply" className="hidden h-10 w-10 items-center justify-center rounded-lg border text-primary disabled:opacity-40 sm:flex">
                        <Bookmark className="h-4 w-4" />
                      </button>
                      <button disabled={voiceUploading || !message.trim()} className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                        <Send className="h-4 w-4" />Send
                      </button>
                    </div>
                  </form>
                </div>
                </>
              ) : (
                <div className="border-t bg-white p-3 text-center text-sm text-gray-500">
                  Chat is closed. Select another conversation or start a new chat from the customer side.
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">Select a conversation to start chatting.</div>
          )}
        </div>
      </div>
      {quickReplyOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Quick Response</h3><button onClick={()=>setQuickReplyOpen(false)}><X className="h-5 w-5"/></button></div>
            <input value={quickReplyTitle} onChange={e=>setQuickReplyTitle(e.target.value)} placeholder="Name / title" className="mb-2 w-full rounded-lg border px-3 py-2 text-sm"/>
            <textarea value={quickReplyMessage} onChange={e=>setQuickReplyMessage(e.target.value)} placeholder="Message" rows={3} className="mb-2 w-full rounded-lg border px-3 py-2 text-sm"/>
            <input type="file" accept="image/*" onChange={e=>setQuickReplyImage(e.target.files?.[0] || null)} className="mb-3 w-full text-sm"/>
            <button onClick={async()=>{try{let url=null;if(quickReplyImage)url=await uploadImage(quickReplyImage,'quick-replies');const r=await supabase.from('chat_quick_replies').insert({title:quickReplyTitle||quickReplyMessage.slice(0,40)||'Quick response',message:quickReplyMessage||null,media_url:url});if(r.error)throw r.error;await loadQuickReplies();setQuickReplyTitle('');setQuickReplyMessage('');setQuickReplyImage(null);setQuickReplyOpen(false)}catch(err:any){setChatError(err.message)}}} className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white">Save Quick Response</button>
          </div>
        </div>
      )}
    </div>
  );
}
