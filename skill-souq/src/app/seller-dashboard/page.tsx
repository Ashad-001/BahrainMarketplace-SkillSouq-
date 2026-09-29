"use client";

import { useState, useEffect } from "react";
import confetti from 'canvas-confetti';
import { createClient } from '@/utils/supabase/client';
import { supabase } from '@/lib/supabase';
import DocumentUploadModal from '@/components/DocumentUploadModal';
import { 
  Briefcase, Plus, Star, Loader2, Clock, Zap, ArrowRight, Scale, 
  FileText, File, CheckCircle2, AlertCircle, ShieldAlert, Activity, BarChart3, 
  TrendingUp, ShieldCheck, Edit3, Trash2, X, Search, Share2, Eye, Copy, 
  Sparkles, Upload, ImagePlus, MessageSquare, Bell, Video
} from "lucide-react";

export default function SellerDashboard() {
  const [supabase, setSupabase] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);
  const [realUserId, setRealUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [myGigs, setMyGigs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [userCategory, setUserCategory] = useState<string>("General");
  const [verificationStatus, setVerificationStatus] = useState<string>("loading");

  // --- NEW: NOTIFICATION & INBOX STATES ---
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [toastMsg, setToastMsg] = useState<any>(null);

  // NEW FEATURES STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // EDIT & DELETE STATES
  const [actionLoading, setActionLoading] = useState(false);
  const [editingGig, setEditingGig] = useState<any>(null);
  
  // Dynamic Edit States
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAccreditation, setEditAccreditation] = useState("");
  const [editTechStack, setEditTechStack] = useState("");
  const [editPortfolio, setEditPortfolio] = useState("");
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editSellerName, setEditSellerName] = useState("");

  // AI AUDIT STATES
  const [auditingGig, setAuditingGig] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState("");

  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [activeOrderIdForMeeting, setActiveOrderIdForMeeting] = useState<string | null>(null);
  const [meetingLinkInput, setMeetingLinkInput] = useState("");
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [activeOrderIdForDelivery, setActiveOrderIdForDelivery] = useState<string | null>(null);
  const [deliveryFiles, setDeliveryFiles] = useState<File[]>([]);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let channel: any;
    let authSubscription: any;

    const init = async () => {
      try {
        let client = (window as any).globalSupabaseClient;

        if (!client) {
          client = createClient();
          (window as any).globalSupabaseClient = client;
        }

        if (isMounted) setSupabase(client);

        const { data: { subscription } } = client.auth.onAuthStateChange((_event: any, session: any) => {
          if (!isMounted) return;
          setUser(session?.user ?? null);
          if (session?.user) {
            setRealUserId(session.user.id);
            setIsLoading(false);
            setLoading(false);
          }
        });
        authSubscription = subscription;

        try {
          const { data: { session }, error: sessionError } = await client.auth.getSession();
          if (sessionError) throw sessionError;

          if (!session) {
            setNeedsLogin(true);
            if (isMounted) setIsLoading(false);
            if (isMounted) setAuthResolved(true);
            if (isMounted) setLoading(false);
            return;
          }

          setUser(session.user);
          setRealUserId(session.user.id);

          const meta = session.user.user_metadata || {};
          const interests = meta.interests || [];
          if (interests.includes("Legal")) setUserCategory("Legal");
          else if (interests.includes("IT & Tech")) setUserCategory("IT & Tech");
          else if (interests.includes("Clearance")) setUserCategory("Clearance");
          else if (interests.includes("Consulting")) setUserCategory("Consulting");

          // Fetch Gigs
          const { data: gigsData, error: gigsError } = await client
            .from('gigs')
            .select('*')
            .eq('seller_id', session.user.id)
            .order('created_at', { ascending: false });

          if (gigsError) throw gigsError;
          if (gigsData) setMyGigs(gigsData);

          // Fetch seller orders
          const { data: ordersData } = await client
            .from('orders')
            .select('*')
            .eq('seller_id', session.user.id)
            .order('created_at', { ascending: false });

          if (ordersData) setOrders(ordersData);

          // 🚨 NEW: Fetch Recent Messages for the Widget
          const { data: msgsData } = await client
            .from('messages')
            .select('*')
            .eq('receiver_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(4);
          
          if (msgsData) {
            const uniqueMsgs = msgsData.filter((v: any, i: number, a: any) => a.findIndex((t: any) => (t.sender_id === v.sender_id)) === i);
            setRecentMessages(uniqueMsgs);
          }

          // 🚨 NEW: Real-Time Notification Subscription
          channel = client
            .channel('dashboard_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
              const newMsg = payload.new;
              if (newMsg.receiver_id === session.user.id) {
                setToastMsg(newMsg);
                setTimeout(() => setToastMsg(null), 6000);
                setRecentMessages(prev => {
                  const filtered = prev.filter(m => m.sender_id !== newMsg.sender_id);
                  return [newMsg, ...filtered].slice(0, 4);
                });
              }
            })
            .subscribe();

          if (isMounted) setLoading(false);
          if (isMounted) setIsLoading(false);
          if (isMounted) setAuthResolved(true);
        } catch (err) {
          console.error("Seller Dashboard Error:", err);
          if (isMounted) setIsLoading(false);
          if (isMounted) setLoading(false);
          if (isMounted) setAuthResolved(true);
        }
      } catch (err) {
        console.error("Seller Dashboard init error:", err);
        if (isMounted) setIsLoading(false);
        if (isMounted) setLoading(false);
        if (isMounted) setAuthResolved(true);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (channel) supabase?.removeChannel(channel);
      authSubscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const fetchStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('verifications')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch verification status:', error);
        return;
      }

      if (data) {
        setVerificationStatus(data.status);

        if (data.status === 'verified') {
          const hasSeenConfetti = localStorage.getItem('celebrated_verification');
          if (!hasSeenConfetti) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            localStorage.setItem('celebrated_verification', 'true');
          }
        }
      } else {
        setVerificationStatus('none');
      }
    };

    fetchStatus();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!authResolved) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (verificationStatus === 'loading') {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-500">Loading your dashboard...</p>
      </div>
    );
  }

  // --- FEATURE: SHARE LINK ---
  const handleShare = (id: string) => {
    const url = `${window.location.origin}/service/${id}`;
    const el = document.createElement('textarea');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- DELETE GIG ---
  const handleDelete = async (id: string) => {
    if (!supabase) return;
    if (!window.confirm("Are you sure you want to permanently delete this listing?")) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('gigs').delete().eq('id', id);
      if (error) throw error;
      setMyGigs(myGigs.filter(gig => gig.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete gig.");
    } finally {
      setActionLoading(false);
    }
  };

  // 👉 UPGRADED FOR MULTIPLE FILES
  const handleDeliverOrder = async (orderId: string, skipPopups = false, meetingLink: string | null = null, files: File[] = []) => {
    if (!supabase) return;
    if (!skipPopups && !window.confirm("Are you sure you are ready to submit the final delivery to the buyer?")) return;
    
    setActionLoading(true);
    try {
      const uploadedFilesArray: { name: string; url: string; size: string }[] = [];

      // Loop through and upload all files
      if (files && files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const safeName = `deliveries/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(safeName, file);
          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(safeName);

          // Save the name, url, and size
          uploadedFilesArray.push({
            name: file.name,
            url: publicUrl,
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
          });
        }
      }

      const updateData: any = { status: 'delivered' };
      if (meetingLink) updateData.meeting_link = meetingLink;
      if (uploadedFilesArray.length > 0) {
        updateData.delivery_files = uploadedFilesArray;
      }

      const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(o => o.id === orderId ? { ...o, ...updateData } : o));

      const currentOrder = orders.find(o => o.id === orderId);
      if (currentOrder) {
        await supabase.from('notifications').insert([{
          user_id: currentOrder.buyer_id,
          title: meetingLink ? "📅 Meeting Scheduled" : "📦 Delivery Ready for Review",
          message: `Your professional has submitted the final delivery for ${currentOrder.title}.`,
          type: "order",
          link: "/buyer-dashboard"
        }]);
      }

      if (!skipPopups) alert("Delivery submitted successfully!");
    } catch (err) {
      alert("Failed to update order or upload files.");
    } finally {
      setActionLoading(false);
    }
  };

  const processImage = async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800; 
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.6)); 
        };
      };
      reader.onerror = () => resolve(null);
    });
  };

  const openEditModal = (gig: any) => {
    setEditingGig(gig);
    setEditTitle(gig.title);
    setEditPrice(gig.price.toString());
    setEditCategory(gig.category);
    setEditSellerName(gig.seller_name || ""); 
    setEditImagePreview(gig.media_url);
    setEditImageFile(null);

    const extractField = (text: string, fieldName: string) => {
      const regex = new RegExp(`\\*\\*${fieldName}:\\*\\*\\s*(.*)`);
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };

    const desc = gig.description || "";
    setEditTechStack(extractField(desc, "Stack"));
    setEditPortfolio(extractField(desc, "Portfolio"));
    setEditAccreditation(extractField(desc, "Accreditation"));
    setEditLocation(extractField(desc, "Address"));

    const summaryOnly = desc
      .replace(/### Summary\n/g, '')
      .replace(/\*\*Stack:\*\*.*\n?/g, '')
      .replace(/\*\*Portfolio:\*\*.*\n?/g, '')
      .replace(/\*\*Accreditation:\*\*.*\n?/g, '')
      .replace(/\*\*Address:\*\*.*\n?/g, '')
      .trim();
      
    setEditSummary(summaryOnly);
  };

  const handleUpdateGig = async () => {
    if (!supabase) return;
    setActionLoading(true);
    try {
      let finalMediaUrl = editImagePreview;
      if (editImageFile && editImageFile.type.startsWith("image/")) {
         finalMediaUrl = await processImage(editImageFile);
      }

      let newDescription = `### Summary\n${editSummary}\n\n`;
      if (editCategory === "IT & Tech") {
        if (editTechStack) newDescription += `**Stack:** ${editTechStack}\n`;
        if (editPortfolio) newDescription += `**Portfolio:** ${editPortfolio}\n`;
      } else if (editCategory === "Legal") {
        if (editAccreditation) newDescription += `**Accreditation:** ${editAccreditation}\n`;
        if (editLocation) newDescription += `**Address:** ${editLocation}\n`;
      } else if (editCategory === "Clearance" || editCategory === "Consulting") {
        if (editLocation) newDescription += `**Address:** ${editLocation}\n`;
      }

      const { error } = await supabase
        .from('gigs')
        .update({
          title: editTitle,
          price: parseFloat(editPrice),
          description: newDescription.trim(),
          media_url: finalMediaUrl,
          seller_name: editSellerName
        })
        .eq('id', editingGig.id);

      if (error) throw error;

      setMyGigs(myGigs.map(g => g.id === editingGig.id ? { 
        ...g, 
        title: editTitle, 
        price: parseFloat(editPrice), 
        description: newDescription.trim(),
        media_url: finalMediaUrl,
        seller_name: editSellerName
      } : g));
      setEditingGig(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update gig.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAIAudit = async (gig: any) => {
    setAuditingGig(gig);
    setAuditLoading(true);
    setAuditResult("");
    
    const apiKey = ""; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    const prompt = `You are an elite marketplace conversion expert. Review this service listing on Skill Souq.
    Title: "${gig.title}"
    Price: BHD ${gig.price}
    Description: "${gig.description}"
    
    Provide a brief, highly actionable critique. Format strictly as:
    🌟 Strengths: (1 sentence)
    📈 Room for Improvement: (1 sentence)
    ✨ Suggested Better Title: (1 punchy line)
    
    Keep it professional, encouraging, and under 80 words total. Do not use markdown headers (#).`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      setAuditResult(data.candidates?.[0]?.content?.parts?.[0]?.text || "Analysis failed. Please try again.");
    } catch (e) {
      setAuditResult("Network error while reaching AI.");
    } finally {
      setAuditLoading(false);
    }
  };

  if (needsLogin) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-sans">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl"><span className="text-white font-black text-2xl">S</span></div>
        <h2 className="text-2xl font-black mb-2">Login Required</h2>
        <a href="/login" className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold">Return to Login</a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const firstName = user?.user_metadata?.first_name || "Professional";
  const isLegal = userCategory === "Legal";
  const isTech = userCategory === "IT & Tech";
  const isClearance = userCategory === "Clearance";
  const isConsulting = userCategory === "Consulting";

  const dict = {
    title: isLegal ? "Legal Practice Center" : isTech ? "Developer Workspace" : isClearance ? "Clearance Agency Hub" : isConsulting ? "Strategy & Advisory Suite" : "Seller Workspace",
    subtitle: isLegal ? "Manage consultations and legal files." : isClearance ? "Track ministry filings and document processing." : isConsulting ? "Track advisory projects and strategy sessions." : "Manage your projects and gigs.",
    btnPost: isLegal ? "List Practice Area" : isClearance ? "Add Clearance Service" : isConsulting ? "Define Advisory Scope" : "Post New Gig",
    tabGigs: isLegal ? "Practice Areas" : isClearance ? "Service Catalog" : "Active Gigs",
    tabOrders: isLegal ? "Consultations" : isClearance ? "Active Filings" : isConsulting ? "Active Projects" : "Orders",
    metric1: isClearance ? "Success Rate" : isConsulting ? "Advisory Hours" : isLegal ? "Retainers" : "Available Funds",
    metric2: isClearance ? "Pending Files" : isTech ? "Code Reviews" : "Active Orders",
    iconGigs: isLegal ? Scale : isClearance ? FileText : isConsulting ? BarChart3 : Briefcase,
    iconOrders: isClearance ? Activity : isConsulting ? TrendingUp : Clock,
    colorFrom: isLegal ? "from-slate-700" : isClearance ? "from-amber-600" : isConsulting ? "from-purple-600" : "from-blue-600",
    colorTo: isLegal ? "to-slate-900" : isClearance ? "to-orange-700" : isConsulting ? "to-indigo-800" : "to-indigo-700",
    themeBg: isLegal ? "bg-slate-600 hover:bg-slate-700" : isClearance ? "bg-amber-600 hover:bg-amber-700" : isConsulting ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700",
    themeColor: isLegal ? "text-slate-600" : isClearance ? "text-amber-600" : isConsulting ? "text-purple-600" : "text-blue-600",
  };

  const filteredGigs = myGigs.filter(gig => 
    gig.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    gig.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 👉 Live metrics
  const activeOrdersCount = orders.filter(o => o.status === 'in_progress' || o.status === 'delivered').length;
  const totalEarnings = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + Number(o.price), 0);

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-zinc-950 font-sans pb-20 relative">
      
      {/* 🚨 NEW: REAL-TIME TOAST NOTIFICATION POPUP */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[200] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl p-5 w-80 animate-in slide-in-from-bottom-5 fade-in duration-300 group cursor-pointer" onClick={() => window.location.href = `/messages?to=${toastMsg.sender_id}&name=${encodeURIComponent(toastMsg.sender_name)}`}>
          <button onClick={(e) => { e.stopPropagation(); setToastMsg(null); }} className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 rounded-full p-1 transition-colors"><X className="w-4 h-4"/></button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-sm text-zinc-900 dark:text-white leading-tight">New Message</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Action Required</p>
            </div>
          </div>
          <p className="text-xs font-black text-zinc-900 dark:text-white truncate">{toastMsg.sender_name}</p>
          <p className="text-sm font-medium text-zinc-500 truncate mt-0.5">{toastMsg.content}</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 py-2.5 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
            Reply Now <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* --- AI AUDIT MODAL POPUP --- */}
      {auditingGig && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-amber-500" /> AI Gig Audit
                </h2>
                <p className="text-sm font-bold text-zinc-500 mt-1 line-clamp-1">{auditingGig.title}</p>
              </div>
              <button onClick={() => setAuditingGig(null)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-6 min-h-[160px] flex flex-col justify-center border border-zinc-200 dark:border-zinc-800">
              {auditLoading ? (
                <div className="flex flex-col items-center text-zinc-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-amber-500" />
                  <p className="text-xs font-black uppercase tracking-widest animate-pulse">Gemini AI is analyzing your listing...</p>
                </div>
              ) : (
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {auditResult}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setAuditingGig(null)} className="h-12 px-6 font-bold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 transition-colors">Close</button>
              <button onClick={() => { setEditingGig(auditingGig); openEditModal(auditingGig); setAuditingGig(null); }} className="h-12 px-6 font-black rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xl hover:scale-105 transition-all">
                Edit Listing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MEETING LINK MODAL POPUP --- */}
      {meetingModalOpen && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-2 text-zinc-900 dark:text-white">
                  <Video className="w-6 h-6 text-blue-600" /> Set Meeting Link
                </h2>
                <p className="text-sm font-medium text-zinc-500 mt-1">Paste your Zoom, Teams, or Meet link below.</p>
              </div>
              <button onClick={() => setMeetingModalOpen(false)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-8">
              <input
                type="url"
                placeholder="https://meet.google.com/..."
                value={meetingLinkInput}
                onChange={(e) => setMeetingLinkInput(e.target.value)}
                className="w-full h-14 px-5 font-bold text-sm rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setMeetingModalOpen(false)} className="h-12 px-6 font-bold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
              <button
                onClick={() => {
                  if (meetingLinkInput.trim() && activeOrderIdForMeeting) {
                    // Pass "true" to skip the ugly native browser popups and include the meeting link
                    handleDeliverOrder(activeOrderIdForMeeting, true, meetingLinkInput);
                    setMeetingModalOpen(false);
                    setMeetingLinkInput("");
                    setActiveOrderIdForMeeting(null);
                  }
                }}
                disabled={!meetingLinkInput.trim() || actionLoading}
                className="h-12 px-6 font-black rounded-xl bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm & Notify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👉 UPGRADED: MULTI-FILE DELIVERY MODAL */}
      {deliveryModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black flex items-center gap-2 text-zinc-900 dark:text-white">
                  <Upload className="w-6 h-6 text-blue-500" /> Submit Delivery
                </h2>
                <p className="text-sm font-medium text-zinc-500 mt-1">Upload the final project files for the client.</p>
              </div>
              <button onClick={() => { setDeliveryModalOpen(false); setDeliveryFiles([]); }} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><X className="w-5 h-5"/></button>
            </div>

            <div className="mb-6">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 dark:border-blue-800 border-dashed rounded-2xl cursor-pointer bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-blue-500 mb-2" />
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Click to add files</p>
                  <p className="text-xs font-medium text-blue-400/80">Select multiple ZIPs, PDFs, or images</p>
                </div>
                <input type="file" multiple className="hidden" onChange={(e) => {
                  if (e.target.files) {
                    setDeliveryFiles(prev => [...prev, ...Array.from(e.target.files)]);
                  }
                }} />
              </label>
            </div>

            {deliveryFiles.length > 0 && (
              <div className="mb-8 max-h-40 overflow-y-auto pr-2 space-y-2">
                {deliveryFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <File className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 truncate">{file.name}</span>
                    </div>
                    <button onClick={() => setDeliveryFiles(deliveryFiles.filter((_, i) => i !== idx))} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => { setDeliveryModalOpen(false); setDeliveryFiles([]); }} className="h-12 px-6 font-bold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
              <button
                onClick={() => {
                  if(activeOrderIdForDelivery && deliveryFiles.length > 0) {
                    handleDeliverOrder(activeOrderIdForDelivery, true, null, deliveryFiles);
                    setDeliveryModalOpen(false);
                    setDeliveryFiles([]);
                  }
                }}
                disabled={deliveryFiles.length === 0 || actionLoading}
                className="h-12 px-6 font-black rounded-xl bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Upload & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ENHANCED EDIT MODAL POPUP --- */}
      {editingGig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 w-full max-w-3xl shadow-2xl animate-in zoom-in-95 border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h2 className="text-2xl font-black">Edit {editCategory} Listing</h2>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Update your professional details</p>
              </div>
              <button onClick={() => setEditingGig(null)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="space-y-6 overflow-y-auto no-scrollbar pr-2 pb-4">
              
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 tracking-widest block mb-2">Cover Media</label>
                <label className="block w-full h-40 bg-zinc-100 dark:bg-zinc-800 rounded-2xl relative overflow-hidden group cursor-pointer border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-blue-500 transition-all">
                  {editImagePreview ? (
                    <img src={editImagePreview} alt="Cover Preview" className="w-full h-full object-cover opacity-90 group-hover:opacity-50 transition-opacity" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400">
                      <ImagePlus className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-xs font-bold uppercase tracking-widest">Upload Cover</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 hidden group-hover:flex flex-col items-center justify-center text-white backdrop-blur-sm transition-all">
                    <Upload className="w-6 h-6 mb-2" />
                    <span className="text-xs font-black uppercase tracking-widest">Replace Image</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setEditImageFile(e.target.files[0]);
                      setEditImagePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }} />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase text-zinc-400 tracking-widest block mb-2">Headline / Title</label>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full h-14 px-4 font-bold rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-blue-600/20 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-zinc-400 tracking-widest block mb-2">Professional Name</label>
                  <input value={editSellerName} onChange={(e) => setEditSellerName(e.target.value)} placeholder="e.g. Al-Khalifa Law Firm" className="w-full h-14 px-4 font-bold rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-blue-600/20 transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-black uppercase text-zinc-400 tracking-widest block mb-2">Starting Price (BHD)</label>
                  <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full h-14 px-4 font-bold rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-blue-600/20 transition-all" />
                </div>
              </div>

              {editCategory === 'Legal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                  <div>
                    <label className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest block mb-2">MoJ Accreditation</label>
                    <input value={editAccreditation} onChange={(e) => setEditAccreditation(e.target.value)} placeholder="e.g. License #..." className="w-full h-12 px-4 text-sm font-bold rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest block mb-2">Office Location</label>
                    <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="e.g. Diplomatic Area..." className="w-full h-12 px-4 text-sm font-bold rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none" />
                  </div>
                </div>
              )}

              {editCategory === 'IT & Tech' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                  <div>
                    <label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block mb-2">Core Tech Stack</label>
                    <input value={editTechStack} onChange={(e) => setEditTechStack(e.target.value)} placeholder="e.g. React, Node.js..." className="w-full h-12 px-4 text-sm font-bold rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block mb-2">Portfolio Link</label>
                    <input value={editPortfolio} onChange={(e) => setEditPortfolio(e.target.value)} placeholder="e.g. github.com/..." className="w-full h-12 px-4 text-sm font-bold rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none" />
                  </div>
                </div>
              )}

              {(editCategory === 'Clearance' || editCategory === 'Consulting') && (
                <div className="p-5 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                  <label className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest block mb-2">Operating Location / Address</label>
                  <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="e.g. Seef District..." className="w-full h-12 px-4 text-sm font-bold rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none" />
                </div>
              )}

              <div>
                <label className="text-xs font-black uppercase text-zinc-400 tracking-widest block mb-2">Main Summary / Bio</label>
                <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} placeholder="Describe your service..." className="w-full h-40 p-4 font-medium text-sm rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 outline-none focus:ring-2 focus:ring-blue-600/20 transition-all resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 shrink-0 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={() => setEditingGig(null)} className="h-12 px-6 font-bold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 transition-colors">Cancel</button>
              <button onClick={handleUpdateGig} disabled={actionLoading} className="h-12 px-8 font-black rounded-xl bg-blue-600 text-white flex items-center shadow-lg hover:bg-blue-700 transition-all active:scale-95">
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 dark:text-white flex items-center gap-3">
              <dict.iconGigs className={`w-8 h-8 ${dict.themeColor}`} />
              {dict.title}
            </h1>
            <p className="text-zinc-500 font-medium mt-2">{dict.subtitle}</p>
          </div>
          <a href="/post-service" className={`inline-flex h-14 items-center px-8 font-black text-white rounded-[2rem] shadow-xl shadow-[${dict.themeColor}]/20 transition-all hover:scale-105 active:scale-95 ${dict.themeBg}`}>
            <Plus className="w-5 h-5 mr-2" /> {dict.btnPost}
          </a>
        </div>

        {/* --- DYNAMIC VERIFICATION WIDGETS --- */}
        {(isClearance || isLegal) && (
          <div className={`mb-8 p-6 bg-white dark:bg-zinc-900 border rounded-[2.5rem] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm transition-all ${
            verificationStatus === 'verified' ? 'border-emerald-200 dark:border-emerald-900/30' : 
            verificationStatus === 'pending' ? 'border-amber-200 dark:border-amber-900/30' : 
            'border-red-200 dark:border-red-900/30'
          }`}>
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                verificationStatus === 'verified' ? 'bg-emerald-50 text-emerald-600' : 
                verificationStatus === 'pending' ? 'bg-amber-50 text-amber-600' : 
                'bg-red-50 text-red-600'
              }`}>
                {verificationStatus === 'verified' ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
              </div>
              <div>
                <p className="font-black text-zinc-900 dark:text-white text-lg">
                  {isLegal ? "Bar License Verification" : "Commercial Registration (CR)"}
                </p>
                <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${
                  verificationStatus === 'verified' ? 'text-emerald-500' : 
                  verificationStatus === 'pending' ? 'text-amber-500' : 
                  'text-red-500'
                }`}>
                  {verificationStatus === 'none' && "STATUS: ACTION REQUIRED - PLEASE UPLOAD DOCUMENTS"}
                  {verificationStatus === 'pending' && "STATUS: UNDER REVIEW BY TRUST & SAFETY TEAM"}
                  {verificationStatus === 'verified' && "STATUS: VERIFIED & APPROVED"}
                </p>
              </div>
            </div>
            {verificationStatus === 'none' && (
              <button
                type="button"
                onClick={() => setIsDocumentModalOpen(true)}
                className="text-sm font-black text-white bg-red-500 px-6 py-3 rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Upload Documents Now
              </button>
            )}
            {verificationStatus === 'pending' && (
              <div className="text-sm font-black text-amber-600 bg-amber-50 px-6 py-3 rounded-xl">
                Reviewing...
              </div>
            )}
          </div>
        )}

        {/* HERO BANNER */}
        <div className={`relative bg-gradient-to-br ${dict.colorFrom} ${dict.colorTo} rounded-[2.5rem] p-10 overflow-hidden shadow-2xl mb-10 border border-white/10`}>
          <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="text-white">
              <h2 className="text-4xl font-black mb-2 tracking-tight">Marhaba, {firstName}</h2>
              <p className="opacity-80 font-medium max-w-md">
                {isLegal ? "Your practice is currently ranked among the top legal advisors in Bahrain." : 
                 isClearance ? "Your agency's processing speed for LMRA is 15% faster than the average." :
                 isConsulting ? "Your advisory impact score has increased by 12 points this week." :
                 "Your projects are on track. Continue delivering excellence to maintain your elite status."}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2rem] min-w-[200px]">
               <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Response Rate</p>
               <p className="text-3xl font-black text-white">100%</p>
            </div>
          </div>
        </div>

        {/* TABS & SEARCH */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div className="flex gap-2 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] w-full md:w-fit shadow-sm overflow-x-auto whitespace-nowrap pb-2 no-scrollbar">
            {['overview', 'gigs', 'orders'].map((t) => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-8 py-3 rounded-full text-sm font-black transition-all shrink-0 ${activeTab === t ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>
                {t === 'overview' ? 'Overview' : t === 'gigs' ? dict.tabGigs : dict.tabOrders}
              </button>
            ))}
          </div>

          {activeTab === 'gigs' && myGigs.length > 0 && (
            <div className="relative w-full md:w-72 animate-in fade-in">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Find a listing..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-11 pr-4 rounded-[1.5rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600/20 transition-all shadow-sm"
              />
            </div>
          )}
        </div>

        {/* CONTENT: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
                 <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">{dict.metric1}</p>
                 <h3 className="text-4xl font-black text-zinc-900 dark:text-white">{isClearance ? "99.2%" : isConsulting ? "124 hrs" : `BHD ${totalEarnings}`}</h3>
               </div>
               <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
                 <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">{dict.metric2}</p>
                 <h3 className="text-4xl font-black text-zinc-900 dark:text-white">{activeOrdersCount}</h3>
               </div>
               <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
                 <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">Elite Status</p>
                 <h3 className={`text-4xl font-black flex items-center gap-2 ${dict.themeColor}`}>
                   <CheckCircle2 className="w-8 h-8" /> Active
                 </h3>
               </div>
            </div>

            {/* INBOX WIDGET */}
            <div className="mb-8 bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center"><MessageSquare className="w-5 h-5" /></div>
                  Priority Inbox
                </h3>
                <a href="/messages" className="text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full transition-colors">View All</a>
              </div>
              
              {recentMessages.length === 0 ? (
                <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-950 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                  <Bell className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                  <p className="font-bold text-zinc-900 dark:text-white mb-1">No unread messages</p>
                  <p className="text-xs font-medium text-zinc-500">When clients contact you, they will appear here instantly.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentMessages.map((msg) => (
                    <a key={msg.id} href={`/messages?to=${msg.sender_id}&name=${encodeURIComponent(msg.sender_name)}`} className="flex items-start gap-4 p-5 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all group">
                      <img src={msg.sender_avatar || `https://api.dicebear.com/9.x/glass/svg?seed=${msg.sender_id}&backgroundColor=1d4ed8`} className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-700" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-black text-sm text-zinc-900 dark:text-white truncate">{msg.sender_name}</p>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full shrink-0">New</span>
                        </div>
                        <p className="text-xs font-medium text-zinc-500 truncate">{msg.content}</p>
                      </div>

                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Smart Empty State Call-to-action */}
            {activeOrdersCount === 0 ? (
              <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 p-12 text-center shadow-sm">
                <div className={`w-20 h-20 mx-auto rounded-[1.5rem] flex items-center justify-center mb-6 bg-zinc-50 dark:bg-zinc-800 ${dict.themeColor}`}>
                  <dict.iconOrders className="w-10 h-10" />
                </div>
                <h4 className="text-3xl font-black text-zinc-900 dark:text-white mb-2">No active {dict.tabOrders.toLowerCase()}</h4>
                <p className="text-zinc-500 font-medium mb-8 max-w-sm mx-auto">Your queue is currently clear. Ensure your {dict.tabGigs.toLowerCase()} are optimized to attract new clients.</p>
                <a href="/post-service" className={`inline-flex h-14 items-center px-8 font-black text-white rounded-full transition-all hover:scale-105 shadow-lg shadow-[${dict.themeColor}]/20 ${dict.themeBg}`}>
                  {dict.btnPost}
                </a>
              </div>
            ) : (
               <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="text-2xl font-black text-zinc-900 dark:text-white mb-1">You have {activeOrdersCount} project(s) in queue</h4>
                    <p className="text-zinc-500 font-medium text-sm">Head over to your {dict.tabOrders} tab to manage deliveries.</p>
                  </div>
                  <button onClick={() => setActiveTab('orders')} className={`h-12 px-6 rounded-xl text-white font-bold transition-all shadow-md active:scale-95 ${dict.themeBg}`}>
                    View Pipeline
                  </button>
               </div>
            )}
          </div>
        )}

        {/* CONTENT: GIGS */}
        {activeTab === 'gigs' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredGigs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGigs.map((gig) => {
                  
                  const descText = gig.description || "";
                  const extractField = (t: string, f: string) => {
                    const regex = new RegExp(`\\*\\*${f}:\\*\\*\\s*(.*)`);
                    const match = t.match(regex);
                    return match ? match[1].trim() : "";
                  };

                  const cardSummary = descText
                    .replace(/### Summary\n/g, '')
                    .replace(/\*\*Stack:\*\*.*\n?/g, '')
                    .replace(/\*\*Portfolio:\*\*.*\n?/g, '')
                    .replace(/\*\*Accreditation:\*\*.*\n?/g, '')
                    .replace(/\*\*Address:\*\*.*\n?/g, '')
                    .trim();

                  const cardAccreditation = extractField(descText, "Accreditation");
                  const cardAddress = extractField(descText, "Address");
                  const cardStack = extractField(descText, "Stack");

                  return (
                    <div key={gig.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
                      
                      <div className="h-44 bg-zinc-100 dark:bg-zinc-800 relative bg-cover bg-center shrink-0" style={{ backgroundImage: gig.media_url ? `url(${gig.media_url})` : `url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=600')` }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                        <div className={`absolute top-4 left-4 inline-flex px-3 py-1 bg-white/90 backdrop-blur-md dark:bg-zinc-950/90 rounded-full text-[10px] font-black uppercase shadow-sm ${dict.themeColor}`}>
                          {gig.category}
                        </div>
                        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white font-bold text-xs drop-shadow-md">
                          <span className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full"><Eye className="w-3.5 h-3.5"/> {Math.floor(Math.random() * 50) + 10} Views</span>
                          <span className="flex items-center gap-1 bg-emerald-500/80 backdrop-blur-md px-2 py-1 rounded-full"><CheckCircle2 className="w-3.5 h-3.5"/> Active</span>
                        </div>
                      </div>
                      
                      <div className="p-6 flex flex-col flex-1">
                        
                        <h4 className="text-xl font-black text-zinc-900 dark:text-white mb-4 leading-snug line-clamp-2">
                          {gig.title}
                        </h4>
                        
                        {(cardAccreditation || cardAddress || cardStack) && (
                          <div className="flex flex-col gap-1.5 mb-4">
                            {cardAccreditation && (
                              <span className="text-xs font-bold text-zinc-500">
                                MoJ License: <span className="text-zinc-900 dark:text-white">{cardAccreditation}</span>
                              </span>
                            )}
                            {cardStack && (
                              <span className="text-xs font-bold text-zinc-500">
                                Stack: <span className="text-zinc-900 dark:text-white">{cardStack}</span>
                              </span>
                            )}
                            {cardAddress && (
                              <span className="text-xs font-bold text-zinc-500">
                                Location: <span className="text-zinc-900 dark:text-white line-clamp-1">{cardAddress}</span>
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-zinc-500 text-sm mb-6 line-clamp-2 flex-1">
                          {cardSummary || "Premium Service"}
                        </p>
                        
                        <div className="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800">
                          <span className="text-zinc-400 text-[10px] uppercase font-black tracking-widest">{isLegal ? "Retainer" : isConsulting ? "Consultation" : "Project Rate"}</span>
                          <span className="text-xl font-black text-zinc-900 dark:text-white">BHD {gig.price}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                           <button onClick={() => handleAIAudit(gig)} className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 border border-amber-100 dark:border-amber-900/30 hover:bg-amber-100 flex items-center justify-center shrink-0 transition-all relative" title="✨ AI Gig Audit">
                             <Sparkles className="w-4 h-4" />
                           </button>

                           <button onClick={() => openEditModal(gig)} className="flex-1 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center gap-2 transition-all text-sm text-zinc-600 dark:text-zinc-300">
                             <Edit3 className="w-4 h-4" /> Edit
                           </button>

                           <button onClick={() => handleShare(gig.id)} className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 flex items-center justify-center shrink-0 transition-all relative">
                             {copiedId === gig.id ? <Copy className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                           </button>

                           <button onClick={() => handleDelete(gig.id)} disabled={actionLoading} className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-900/30 hover:bg-red-100 flex items-center justify-center shrink-0 transition-all">
                             {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                           </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 p-12 text-center shadow-sm">
                 <div className={`w-20 h-20 mx-auto rounded-[1.5rem] flex items-center justify-center mb-6 bg-zinc-50 dark:bg-zinc-800 ${dict.themeColor}`}>
                  {searchQuery ? <Search className="w-10 h-10" /> : <dict.iconGigs className="w-10 h-10" />}
                 </div>
                <h4 className="text-3xl font-black text-zinc-900 dark:text-white mb-2">
                  {searchQuery ? "No matches found" : "Build your portfolio"}
                </h4>
                <p className="text-zinc-500 font-medium mb-8">
                  {searchQuery ? `We couldn't find any listings matching "${searchQuery}".` : `You haven't listed any ${dict.tabGigs.toLowerCase()} yet.`}
                </p>
                {!searchQuery && (
                  <a href="/post-service" className={`inline-flex h-14 items-center px-8 font-black text-white rounded-full transition-all hover:scale-105 shadow-lg shadow-[${dict.themeColor}]/20 ${dict.themeBg}`}>
                    Get Started
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* CONTENT: ORDERS */}
        {activeTab === 'orders' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {orders.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 p-12 text-center shadow-sm">
                <div className={`w-20 h-20 mx-auto rounded-[1.5rem] flex items-center justify-center mb-6 bg-zinc-50 dark:bg-zinc-800 ${dict.themeColor}`}>
                  <dict.iconOrders className="w-10 h-10" />
                </div>
                <h4 className="text-3xl font-black text-zinc-900 dark:text-white mb-2">No active {dict.tabOrders.toLowerCase()}</h4>
                <p className="text-zinc-500 font-medium mb-8 max-w-sm mx-auto">Your queue is currently clear. Ensure your {dict.tabGigs.toLowerCase()} are optimized to attract new clients.</p>
                <a href="/post-service" className={`inline-flex h-14 items-center px-8 font-black text-white rounded-full transition-all hover:scale-105 shadow-lg shadow-[${dict.themeColor}]/20 ${dict.themeBg}`}>
                  {dict.btnPost}
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-shadow">
                    
                    <div className="flex-1 flex gap-5 items-center w-full">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 border-2 ${
                        order.status === 'in_progress' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                        order.status === 'delivered' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                        'bg-emerald-50 border-emerald-100 text-emerald-600'
                      }`}>
                        {order.status === 'in_progress' ? <Activity className="w-7 h-7" /> : 
                         order.status === 'delivered' ? <Clock className="w-7 h-7" /> : 
                         <CheckCircle2 className="w-7 h-7" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md ${
                            order.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'delivered' ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {order.status === 'in_progress' ? (
                              (userCategory === 'Legal' || userCategory === 'Consulting') ? 'Pending Call' : 'Working'
                            ) : order.status === 'delivered' ? 'Awaiting Client Approval' : 'Completed & Paid'}
                          </span>
                          <span className="text-xs font-bold text-zinc-400">Order #{order.id.split('-')[0].toUpperCase()}</span>
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 dark:text-white truncate">{order.title}</h3>
                        <p className="text-sm font-medium text-zinc-500 flex items-center gap-1 mt-1">
                          Price: <span className="font-bold text-zinc-900 dark:text-white">BHD {order.price}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                      <a href={`/messages?to=${order.buyer_id}`} className="flex-1 md:flex-none h-12 px-6 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                        <MessageSquare className="w-4 h-4" /> Chat
                      </a>
                      
                      {order.status === 'in_progress' && (
                        (userCategory === 'Legal' || userCategory === 'Consulting') ? (
                          <button 
                            onClick={() => {
                              setActiveOrderIdForMeeting(order.id);
                              setMeetingLinkInput("");
                              setMeetingModalOpen(true);
                            }}
                            disabled={actionLoading}
                            className={`flex-1 md:flex-none h-12 px-6 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all ${dict.themeBg}`}
                          >
                            Set Meeting Link
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              // 👉 FIXED: This triggers the file upload modal!
                              setActiveOrderIdForDelivery(order.id);
                              setDeliveryFiles([]);
                              setDeliveryModalOpen(true);
                            }}
                            disabled={actionLoading}
                            className={`flex-1 md:flex-none h-12 px-6 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all ${dict.themeBg}`}
                          >
                            Submit Delivery
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <DocumentUploadModal
        isOpen={isDocumentModalOpen}
        onClose={(wasSuccessful) => {
          setIsDocumentModalOpen(false);
          if (wasSuccessful) setVerificationStatus('pending');
        }}
        profession={userCategory === 'Clearance' ? 'clearance_agency' : userCategory === 'Legal' ? 'lawyer' : 'other'}
        userId={realUserId || user?.id || ''}
      />
    </div>
  );
}