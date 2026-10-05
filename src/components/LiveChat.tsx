import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MessageCircle, X, Send, Loader2, User, Mic, Square, Bookmark, Search, MoreVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'admin';
  sender_name: string | null;
  message: string;
  is_read: boolean;
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
      setStarted(true);
      await loadMessages(id);
    }
  };

  useEffect(() => {
    if (open) loadConversation();
  }, [open]);

  useEffect(() => {
    if (!open || !conversation?.id) return;
    const timer = window.setInterval(() => loadMessages(conversation.id), 2000);
    return () => window.clearInterval(timer);
  }, [open, conversation?.id]);

  const startChat = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('create_guest_chat', {
        p_customer_name: name.trim(),
        p_customer_mobile: mobile.trim() || null,
        p_visitor_token: token(),
        p_message: message.trim(),
      });
      if (error) throw error;
      localStorage.setItem(CONVERSATION_KEY, data.id);
      setConversation(data as Conversation);
      setStarted(true);
      setMessage('');
      await loadMessages(data.id);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const toggleRecording = () => setRecording((v) => !v);

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
    try {
      const { error } = await supabase.rpc('send_guest_chat', {
        p_visitor_token: token(),
        p_conversation_id: conversation.id,
        p_message: message.trim(),
      });
      if (error) throw error;
      setMessage('');
      await loadMessages(conversation.id);
    } catch (err) {
      console.error(err);
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
              <p className="text-sm text-gray-600">আপনার তথ্য দিন, আমরা এখানেই উত্তর দেব।</p>
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
                      {item.message}
                    </div>
                  </div>
                ))}
                {!messages.length && <p className="text-center text-xs text-gray-400 pt-8">মেসেজ লোড হচ্ছে...</p>}
              </div>
              <form onSubmit={sendMessage} className="flex items-center gap-2 border-t bg-white p-3">
                <button type="button" onClick={toggleRecording} title={recording ? "Stop voice" : "Voice message"} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${recording ? "bg-red-50 text-red-600" : "text-primary"}`}>{recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="মেসেজ লিখুন..." className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary" />
                <button type="button" onClick={saveReply} title="Save reply" disabled={!message.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-primary disabled:opacity-40"><Bookmark className="h-4 w-4" /></button><button disabled={sending || !message.trim()} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50">
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
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages((data || []) as ChatMessage[]);
    await supabase.from('chat_messages').update({ is_read: true }).eq('conversation_id', conversationId).eq('sender_type', 'customer');
  };

  useEffect(() => {
    loadConversations().finally(() => setLoading(false));
    const channel = supabase
      .channel('admin-live-chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        loadConversations();
        if (selected?.id) loadMessages(selected.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => loadConversations())
      .subscribe();
    const timer = window.setInterval(loadConversations, 5000);
    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [selected?.id]);

  useEffect(() => {
    if (selected) loadMessages(selected.id);
  }, [selected?.id]);

  const toggleRecording = () => setRecording((v) => !v);
  const saveCurrentReply = () => { const text = message.trim(); if (!text) return; const next=[text,...savedReplies.filter(x=>x!==text)].slice(0,30); setSavedReplies(next); localStorage.setItem('hbc-saved-replies', JSON.stringify(next)); };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !message.trim()) return;
    const { error } = await supabase.from('chat_messages').insert({
      conversation_id: selected.id,
      sender_type: 'admin',
      sender_name: 'Admin',
      message: message.trim(),
      is_read: true,
    });
    if (!error) {
      await supabase.from('chat_conversations').update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', selected.id);
      setMessage('');
      await loadMessages(selected.id);
    }
  };

  const closeChat = async () => {
    if (!selected) return;
    await supabase.from('chat_conversations').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', selected.id);
    setSelected({ ...selected, status: 'closed' });
    await loadConversations();
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

      <div className="grid min-h-[600px] overflow-hidden rounded-xl border bg-white lg:grid-cols-[300px_1fr]">
        <div className="border-r bg-gray-50">
          <div className="border-b p-3"><div className="mb-2 text-sm font-semibold">Conversations</div><div className="flex items-center gap-2 rounded-lg border bg-white px-2"><Search className="h-4 w-4 text-gray-400" /><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search customer..." className="w-full py-2 text-sm outline-none" /></div></div>
          <div className="max-h-[550px] overflow-y-auto">
            {conversations.filter(item => `${item.customer_name} ${item.customer_mobile || ''}`.toLowerCase().includes(search.toLowerCase())).map((item) => (
              <button key={item.id} onClick={() => setSelected(item)} className={`w-full border-b p-4 text-left hover:bg-white ${selected?.id === item.id ? 'bg-white' : ''}`}>
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

        <div className="flex min-h-[600px] flex-col">
          {selected ? (
            <>
              <div className="flex items-center justify-between border-b p-4">
                <div>
                  <div className="font-semibold">{selected.customer_name}</div>
                  <div className="text-xs text-gray-500">{selected.customer_mobile || 'No phone number'}</div>
                </div>
                {selected.status === 'open' && <button onClick={closeChat} className="rounded-lg border px-3 py-2 text-xs hover:bg-gray-50">Close Chat</button>}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-cream/30 p-5">
                {messages.map((item) => (
                  <div key={item.id} className={`flex ${item.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${item.sender_type === 'admin' ? 'bg-primary text-white' : 'border bg-white text-gray-800'}`}>
                      {item.message}
                    </div>
                  </div>
                ))}
              </div>
              {selected.status === 'open' && (
                <form onSubmit={send} className="flex items-center gap-2 border-t p-3"><button type="button" onClick={toggleRecording} title={recording ? "Stop voice" : "Voice message"} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${recording ? "bg-red-50 text-red-600" : "text-primary"}`}>{recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Reply to customer..." className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-primary" /><button type="button" onClick={saveCurrentReply} disabled={!message.trim()} title="Save reply" className="flex h-10 w-10 items-center justify-center rounded-lg border text-primary disabled:opacity-40"><Bookmark className="h-4 w-4" /></button>
                  <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white"><Send className="h-4 w-4" />Send</button>
                </form>
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">Select a conversation to start chatting.</div>
          )}
        </div>
      </div>
    </div>
  );
}
