"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from '@/utils/supabase/client';
import { 
  Send, Loader2, Search, ArrowLeft, MoreVertical, 
  MessageSquare, ShieldCheck, Clock, CheckCircle2, User,
  Sparkles, Wand2, FileText, X, Paperclip, File, Download, Image as ImageIcon
} from "lucide-react";

export default function MessagesPage() {
  const [supabase, setSupabase] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  
  // Chat States
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [activeChatName, setActiveChatName] = useState<string>("Unknown User");
  const [activeChatAvatar, setActiveChatAvatar] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- AI Feature States ---
  const [isPolishing, setIsPolishing] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [summary, setSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);

  // --- FILE UPLOAD STATES ---
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    let channel: any;

    const init = async () => {
      try {
        let client = (window as any).globalSupabaseClient;

        if (!client) {
          client = createClient();
          (window as any).globalSupabaseClient = client;
        }

        setSupabase(client);

        try {
          const { data: { session } } = await client.auth.getSession();
          if (!session) {
            if (isMounted) {
              setNeedsLogin(true);
              setAuthResolved(true);
              setLoading(false);
            }
            return;
          }

          const currentUser = session.user;
          setUser(currentUser);

          const { data: msgs, error } = await client
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: true });

          if (!error && msgs) {
            setMessages(msgs);
          }

          const urlParams = new URLSearchParams(window.location.search);
          const targetUserId = urlParams.get('to');
          const targetName = urlParams.get('name');
          const targetAvatar = urlParams.get('avatar');
          
          if (targetUserId) {
            setActiveChatUserId(targetUserId);
            setActiveChatName(targetName || "Professional");
            if (targetAvatar) setActiveChatAvatar(targetAvatar);
          }

          channel = client
            .channel('realtime_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
              const newMsg = payload.new;
              if (newMsg.sender_id === currentUser.id || newMsg.receiver_id === currentUser.id) {
                setMessages(prev => {
                  if (prev.find(m => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
                setTimeout(scrollToBottom, 100);
              }
            })
            .subscribe();

          setLoading(false);
          setAuthResolved(true);
          setTimeout(scrollToBottom, 300);
        } catch (err) {
          console.error("Messages Error:", err);
          setLoading(false);
          setAuthResolved(true);
        }
      } catch (err) {
        console.error("Messages init error:", err);
        setLoading(false);
        setAuthResolved(true);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (channel) supabase?.removeChannel(channel);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Restrict to 100MB roughly
      if (file.size > 100 * 1024 * 1024) {
        alert("File is too large. Maximum size is 100MB.");
        return;
      }
      setAttachment(file);
    }
  };

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !activeChatUserId || !user || !supabase) return;

    setSending(true);
    const msgText = newMessage.trim();
    const currentAttachment = attachment;
    
    setNewMessage(""); 
    setAttachment(null);

    try {
      let fileUrl = null;
      let fileName = null;
      let fileSize = null;
      let fileType = null;

      // --- UPLOAD FILE IF EXISTS ---
      if (currentAttachment) {
        const fileExt = currentAttachment.name.split('.').pop();
        const safeName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(safeName, currentAttachment);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(safeName);

        fileUrl = publicUrl;
        fileName = currentAttachment.name;
        fileSize = currentAttachment.size;
        fileType = currentAttachment.type;
      }

      const payload = {
        sender_id: user.id,
        receiver_id: activeChatUserId,
        content: msgText || (currentAttachment ? "Shared a file" : ""),
        sender_name: user.user_metadata?.first_name 
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim() 
          : "SkillSouq Member",
        sender_avatar: user.user_metadata?.avatar_url || null,
        receiver_name: activeChatName !== "Unknown User" ? activeChatName : null,
        receiver_avatar: activeChatAvatar,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType
      };

      const { data, error } = await supabase.from('messages').insert([payload]).select().single();
      if (error) throw error;
      
      if (data) {
        setMessages(prev => {
          if (prev.find(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
      
    } catch (err) {
      console.error("Failed to send:", err);
      alert("Failed to send message or file. Please try again.");
      setNewMessage(msgText); 
      setAttachment(currentAttachment);
    } finally {
      setSending(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const callGemini = async (prompt: string) => {
    let retries = 5;
    let delay = 1000;

    while (retries > 0) {
      try {
        const response = await fetch('/api/messages-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'API Error');
        }

        return data.result?.trim() || "";
      } catch (e) {
        retries--;
        if (retries === 0) return "";
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }
    }

    return "";
  };

  const handlePolishMessage = async () => {
    if (!newMessage.trim()) return;
    setIsPolishing(true);
    const prompt = `Rewrite the following message to be highly professional, polite, and clear. It is being sent on a freelance marketplace in Bahrain. Return ONLY the polished message.\n\nOriginal: "${newMessage}"`;
    const result = await callGemini(prompt);
    if (result) setNewMessage(result);
    setIsPolishing(false);
  };

  const handleSummarize = async () => {
    const chatMsgs = messages.filter(
      m => (m.sender_id === user?.id && m.receiver_id === activeChatUserId) || 
           (m.sender_id === activeChatUserId && m.receiver_id === user?.id)
    );
    if (chatMsgs.length === 0) return;
    setIsSummarizing(true);
    const chatHistory = chatMsgs.map(m => `${m.sender_name || 'User'}: ${m.content}`).join('\n');
    const prompt = `Summarize the following marketplace conversation. Extract key points such as agreed price, timeline, and requirements. Keep it very brief and use bullet points.\n\nChat:\n${chatHistory}`;
    const result = await callGemini(prompt);
    if (result) setSummary(result);
    setIsSummarizing(false);
  };

  const handleSuggestReplies = async () => {
    const chatMsgs = messages.filter(
      m => (m.sender_id === user?.id && m.receiver_id === activeChatUserId) || 
           (m.sender_id === activeChatUserId && m.receiver_id === user?.id)
    );
    if (chatMsgs.length === 0) return;
    setIsGeneratingReplies(true);
    const chatHistory = chatMsgs.slice(-5).map(m => `${m.sender_id === user?.id ? 'Me' : 'Client'}: ${m.content}`).join('\n');
    const prompt = `Based on this recent chat history, suggest 3 short, professional, and distinct reply options I can send. Separate them with a pipe character (|) and nothing else.\n\nChat:\n${chatHistory}`;
    const result = await callGemini(prompt);
    if (result) {
      setSuggestedReplies(result.split('|').map((s: string) => s.trim()).filter(Boolean));
    }
    setIsGeneratingReplies(false);
  };

  const getConversations = () => {
    const convos = new Map();
    const sortedMessages = [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    sortedMessages.reverse().forEach(msg => {
      const isMe = msg.sender_id === user?.id;
      const otherId = isMe ? msg.receiver_id : msg.sender_id;

      if (!convos.has(otherId)) {
        let otherName = isMe ? (msg.receiver_name || "Unknown") : msg.sender_name;
        let otherAvatar = isMe ? msg.receiver_avatar : msg.sender_avatar;

        if (!otherName || otherName === "Unknown") {
           const replyFromThem = messages.find(m => m.sender_id === otherId);
           if (replyFromThem && replyFromThem.sender_name) {
             otherName = replyFromThem.sender_name;
             otherAvatar = replyFromThem.sender_avatar;
           } else if (otherId === activeChatUserId) {
             otherName = activeChatName;
             otherAvatar = activeChatAvatar;
           } else {
             otherName = "SkillSouq Member";
           }
        }

        convos.set(otherId, {
          userId: otherId,
          name: otherName,
          avatar: otherAvatar,
          lastMessage: msg.file_name ? `📎 ${msg.file_name}` : msg.content,
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    });

    if (activeChatUserId && !convos.has(activeChatUserId)) {
      convos.set(activeChatUserId, {
        userId: activeChatUserId,
        name: activeChatName !== "Unknown User" ? activeChatName : "SkillSouq Member",
        avatar: activeChatAvatar,
        lastMessage: "Start a new conversation...",
        time: ""
      });
    }

    return Array.from(convos.values());
  };

  const currentChatMessages = messages.filter(
    m => (m.sender_id === user?.id && m.receiver_id === activeChatUserId) || 
         (m.sender_id === activeChatUserId && m.receiver_id === user?.id)
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!authResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-sans">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl"><span className="text-white font-black text-2xl">S</span></div>
        <h2 className="text-2xl font-black mb-2">Login Required</h2>
        <a href="/login" className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold">Return to Login</a>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
    </div>
  );

  const conversations = getConversations();

  return (
    <div className="h-screen bg-white dark:bg-zinc-950 flex font-sans overflow-hidden">
      
      {/* --- LEFT SIDEBAR --- */}
      <div className={`w-full md:w-80 lg:w-96 shrink-0 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 ${activeChatUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-3">
             <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
               <ArrowLeft className="w-5 h-5" />
             </button>
             <h1 className="text-xl font-black text-zinc-900 dark:text-white">Messages</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">
            {conversations.length}
          </div>
        </div>

        <div className="p-4 shrink-0">
          <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm focus-within:ring-2 ring-blue-600/20 transition-all">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4" />
            <input type="text" placeholder="Search chats..." className="w-full h-12 pl-11 pr-4 bg-transparent outline-none text-sm font-bold placeholder:text-zinc-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
          {conversations.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white mb-1">No Messages Yet</p>
              <p className="text-xs text-zinc-500 font-medium">Head to the marketplace to contact sellers.</p>
            </div>
          ) : (
            conversations.map((chat) => (
              <button 
                key={chat.userId} 
                onClick={() => { 
                  setActiveChatUserId(chat.userId); 
                  setActiveChatName(chat.name); 
                  setActiveChatAvatar(chat.avatar);
                  setTimeout(scrollToBottom, 100); 
                }}
                className={`w-full p-4 flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800/50 transition-all ${activeChatUserId === chat.userId ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-white dark:hover:bg-zinc-900'}`}
              >
                <img 
                  src={chat.avatar || `https://api.dicebear.com/9.x/glass/svg?seed=${chat.userId}&backgroundColor=1d4ed8`} 
                  alt="Avatar" 
                  className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 object-cover shrink-0" 
                />
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-black text-sm text-zinc-900 dark:text-white truncate pr-2">{chat.name}</h3>
                    <span className="text-[10px] font-bold text-zinc-400 shrink-0">{chat.time}</span>
                  </div>
                  <p className="text-xs text-zinc-500 font-medium truncate">{chat.lastMessage}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* --- RIGHT MAIN --- */}
      <div className={`flex-1 flex-col bg-white dark:bg-zinc-950 relative ${!activeChatUserId ? 'hidden md:flex' : 'flex'}`}>
        
        {activeChatUserId ? (
          <>
            {/* Header */}
            <div className="h-20 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChatUserId(null)} className="md:hidden p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <img src={activeChatAvatar || `https://api.dicebear.com/9.x/glass/svg?seed=${activeChatUserId}&backgroundColor=1d4ed8`} className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 object-cover" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-950 rounded-full"></div>
                </div>
                <div>
                  <h2 className="font-black text-zinc-900 dark:text-white leading-none">{activeChatName}</h2>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">
                    <ShieldCheck className="w-3 h-3" /> Secure Chat
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSummarize} 
                  disabled={isSummarizing || currentChatMessages.length === 0}
                  className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span className="hidden sm:inline">Summarize Chat</span>
                </button>
                <button className="p-2 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 pt-28 pb-48 bg-zinc-50/30 dark:bg-zinc-900/10">
              
              {summary && (
                <div className="mb-6 p-5 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-2xl relative shadow-sm animate-in slide-in-from-top-4">
                  <button onClick={() => setSummary("")} className="absolute top-4 right-4 p-1 rounded-full text-purple-400 hover:text-purple-600 hover:bg-purple-100/50 transition-colors"><X className="w-4 h-4" /></button>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="text-sm font-black text-purple-900 dark:text-purple-100 uppercase tracking-widest">AI Chat Summary</h3>
                  </div>
                  <div className="text-sm font-medium text-purple-800 dark:text-purple-200 leading-relaxed whitespace-pre-wrap">
                    {summary}
                  </div>
                </div>
              )}

              {currentChatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white mb-2">Start the conversation</p>
                  <p className="text-xs font-medium max-w-xs text-center leading-relaxed">
                    Messages are end-to-end encrypted. Never share passwords or payment details outside the platform.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {currentChatMessages.map((msg, index) => {
                    const isMe = msg.sender_id === user.id;
                    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isImage = msg.file_type?.startsWith('image/');

                    return (
                      <div key={msg.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
                          
                          <div className={`px-5 py-3.5 rounded-[1.5rem] shadow-sm text-sm font-medium leading-relaxed ${
                            isMe 
                              ? 'bg-blue-600 text-white rounded-br-sm' 
                              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-sm'
                          }`}>
                            
                            {/* --- FILE RENDERER --- */}
                            {msg.file_url && (
                              <div className="mb-2">
                                {isImage ? (
                                  <a href={msg.file_url} target="_blank" rel="noreferrer">
                                    <img src={msg.file_url} alt="Attachment" className="max-w-full h-auto max-h-60 rounded-xl mb-2 hover:opacity-90 transition-opacity" />
                                  </a>
                                ) : (
                                  <a href={msg.file_url} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-3 rounded-xl mb-2 transition-colors ${isMe ? 'bg-blue-700/50 hover:bg-blue-800/50' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isMe ? 'bg-blue-600' : 'bg-white dark:bg-zinc-900 shadow-sm'}`}>
                                      <File className={`w-5 h-5 ${isMe ? 'text-white' : 'text-zinc-500'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-4">
                                      <p className="font-bold text-xs truncate mb-0.5">{msg.file_name}</p>
                                      <p className={`text-[10px] uppercase font-bold tracking-widest ${isMe ? 'text-blue-200' : 'text-zinc-400'}`}>
                                        {formatFileSize(msg.file_size)} • {msg.file_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                                      </p>
                                    </div>
                                    <Download className={`w-4 h-4 shrink-0 ${isMe ? 'text-blue-200' : 'text-zinc-400'}`} />
                                  </a>
                                )}
                              </div>
                            )}

                            {msg.content}
                          </div>
                          
                          <div className="flex items-center gap-1 mt-1.5 px-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{time}</span>
                            {isMe && <CheckCircle2 className="w-3 h-3 text-blue-500" />}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 p-4">
              
              <div className="max-w-4xl mx-auto mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button 
                  onClick={handleSuggestReplies}
                  disabled={isGeneratingReplies || currentChatMessages.length === 0}
                  className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {isGeneratingReplies ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Suggest Replies
                </button>
                {suggestedReplies.map((reply, i) => (
                  <button 
                    key={i} 
                    onClick={() => { setNewMessage(reply); setSuggestedReplies([]); }}
                    className="px-4 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium whitespace-nowrap shrink-0 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* --- ATTACHMENT PREVIEW WIDGET --- */}
              {attachment && (
                <div className="max-w-4xl mx-auto mb-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl flex items-center justify-between animate-in slide-in-from-bottom-2 shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-xl shadow-sm flex items-center justify-center shrink-0">
                      {attachment.type.startsWith('image/') ? <ImageIcon className="w-5 h-5 text-blue-500" /> : <File className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{attachment.name}</p>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{formatFileSize(attachment.size)}</p>
                    </div>
                  </div>
                  <button onClick={() => setAttachment(null)} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 bg-white dark:bg-zinc-800 rounded-full shadow-sm hover:shadow-md transition-all shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center gap-2">
                
                {/* --- ATTACH BUTTON --- */}
                <label className="w-14 h-14 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700">
                  <Paperclip className="w-5 h-5" />
                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                </label>

                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Write a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full h-14 pl-6 pr-14 rounded-full bg-zinc-100 dark:bg-zinc-900 border-none outline-none font-medium text-sm focus:ring-2 ring-blue-600/20 transition-all placeholder:text-zinc-400"
                  />
                  {newMessage.trim() && (
                    <button 
                      type="button"
                      onClick={handlePolishMessage}
                      disabled={isPolishing}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 flex items-center justify-center transition-colors disabled:opacity-50"
                      title="Polish Message"
                    >
                      {isPolishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <button 
                  type="submit" 
                  disabled={(!newMessage.trim() && !attachment) || sending}
                  className="w-14 h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 shrink-0"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -ml-1" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/10">
            <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">Your Workspace Inbox</h2>
            <p className="text-zinc-500 font-medium text-sm max-w-sm text-center">
              Select a conversation from the sidebar or contact a professional directly from their marketplace listing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}