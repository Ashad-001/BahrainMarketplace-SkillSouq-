"use client";

import { useState, useEffect } from "react";
import { createClient } from '@/utils/supabase/client';
import { 
  ShoppingBag, Loader2, Clock, CheckCircle2, 
  Activity, Search, ShieldCheck, 
  MessageSquare, FileText, Download, Video, X, PackageOpen, File, Star
} from "lucide-react";

export default function BuyerDashboard() {
  const [supabase, setSupabase] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("active");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 🌟 MODAL STATES
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [activeOrderIdForApproval, setActiveOrderIdForApproval] = useState<string | null>(null);

  // 🌟 NEW: TRUST ENGINE (Review States)
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🌟 Delivery Viewer States
  const [deliveryViewerOpen, setDeliveryViewerOpen] = useState(false);
  const [activeDeliveryFiles, setActiveDeliveryFiles] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    let authSubscription: any;

    const init = async () => {
      let client = (window as any).globalSupabaseClient;
      if (!client) {
        client = createClient();
        (window as any).globalSupabaseClient = client;
      }

      setSupabase(client);

      const { data: { subscription } } = client.auth.onAuthStateChange((_event: any, session: any) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);
        setIsLoading(false);
      });
      authSubscription = subscription;

      try {
        const { data: { session } } = await client.auth.getSession();
        if (!isMounted) return;

        setIsLoading(false);
        if (!session) {
          if (isMounted) {
            setNeedsLogin(true);
            setAuthResolved(true);
            setLoading(false);
          }
          return;
        }

        if (isMounted) setUser(session.user);
        if (isMounted) setNeedsLogin(false);
        if (isMounted) setAuthResolved(true);

        const { data: ordersData, error } = await client
          .from('orders')
          .select('*')
          .eq('buyer_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (ordersData && isMounted) setOrders(ordersData);

        if (isMounted) setLoading(false);
      } catch (err) {
        console.error("Dashboard Error:", err);
        if (isMounted) setIsLoading(false);
        if (isMounted) setLoading(false);
        if (isMounted) setAuthResolved(true);
      }
    };

    init();

    return () => { 
      isMounted = false; 
      authSubscription?.unsubscribe?.();
    };
  }, []);

  if (isLoading) {
    return <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  if (!authResolved) {
    return <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  // 🌟 UPGRADED: APPROVE + REVIEW WORK
  const handleApproveWork = async (orderId: string) => {
    if (!supabase) return;
    
    if (rating === 0) {
      alert("Please select a star rating to complete the approval!");
      return;
    }
    
    setIsSubmitting(true);
    setActionLoading(orderId);

    try {
      const currentOrder = orders.find(o => o.id === orderId);

      // 1. Save the Review to the database
      const { error: reviewError } = await supabase.from('reviews').insert([{
        order_id: orderId,
        gig_id: currentOrder?.gig_id || "unknown_gig",
        buyer_id: user.id,
        seller_id: currentOrder?.seller_id,
        rating: rating,
        comment: comment
      }]);

      if (reviewError) throw reviewError;

      // 2. Mark the Order as Completed (This conceptually releases the funds)
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (error) throw error;
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
      
      // 3. Notify the Seller that they got paid and reviewed!
      if (currentOrder) {
        await supabase.from('notifications').insert([{
          user_id: currentOrder.seller_id,
          title: "⭐ Payment & Review Received!",
          message: `The buyer approved your delivery for ${currentOrder.title} and left a ${rating}-star review. Funds have been added to your wallet.`,
          type: "payment",
          link: "/seller-dashboard"
        }]);
      }

      // Close modal & reset forms
      setApprovalModalOpen(false);
      setRating(0);
      setComment("");

    } catch (err: any) {
      console.error(err);
      alert("Failed to approve order: " + err.message);
    } finally {
      setIsSubmitting(false);
      setActionLoading(null);
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

  const activeOrders = orders.filter(o => o.status === 'in_progress' || o.status === 'delivered');
  const completedOrders = orders.filter(o => o.status === 'completed');
  
  const displayOrders = activeTab === 'active' ? activeOrders : completedOrders;
  const firstName = user?.user_metadata?.first_name || "Client";

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-zinc-950 font-sans pb-20">
      
      {/* 🌟 UPGRADED SLEEK APPROVAL & REVIEW MODAL */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-start mb-6">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-800/50">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <button 
                onClick={() => { setApprovalModalOpen(false); setRating(0); setComment(""); }} 
                className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="mb-8">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">Approve & Review</h2>
              <p className="text-sm font-medium text-zinc-500 leading-relaxed">
                You are releasing the escrowed funds to the professional's account. How was your experience?
              </p>
            </div>

            {/* Star Rating System */}
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 active:scale-90"
                >
                  <Star 
                    className={`w-10 h-10 transition-colors duration-200 ${
                      (hoverRating || rating) >= star 
                        ? "fill-amber-400 text-amber-400" 
                        : "fill-zinc-100 text-zinc-200 dark:fill-zinc-800 dark:text-zinc-700"
                    }`} 
                  />
                </button>
              ))}
            </div>

            <div className="mb-8">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block ml-1">Public Feedback</label>
              <textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe your experience working with this professional..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-600 outline-none resize-none h-32"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setApprovalModalOpen(false); setRating(0); setComment(""); }} 
                className="h-12 px-6 font-bold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Wait, Cancel
              </button>
              <button
                onClick={() => {
                  if(activeOrderIdForApproval) {
                    handleApproveWork(activeOrderIdForApproval);
                  }
                }}
                disabled={isSubmitting || rating === 0}
                className="h-12 px-6 font-black rounded-xl bg-emerald-500 text-white shadow-xl hover:bg-emerald-600 transition-all active:scale-95 flex items-center disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {isSubmitting ? "Processing..." : "Approve & Pay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 DELIVERY PACKAGE VIEWER MODAL */}
      {deliveryViewerOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center">
                  <PackageOpen className="w-7 h-7 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white">Delivery Package</h2>
                  <p className="text-sm font-medium text-zinc-500">Review the files submitted by your professional.</p>
                </div>
              </div>
              <button onClick={() => setDeliveryViewerOpen(false)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><X className="w-5 h-5"/></button>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4 mb-8 border border-zinc-100 dark:border-zinc-800 max-h-60 overflow-y-auto space-y-3">
              {activeDeliveryFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                   <div className="flex items-center gap-3 overflow-hidden pr-4">
                     <File className="w-8 h-8 text-indigo-400 shrink-0" />
                     <div className="min-w-0">
                       <p className="text-sm font-bold text-zinc-900 dark:text-white truncate mb-0.5">{file.name}</p>
                       <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{file.size}</p>
                     </div>
                   </div>
                   <a href={file.url} target="_blank" rel="noreferrer" download className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors shrink-0">
                     <Download className="w-5 h-5" />
                   </a>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-bold text-zinc-500">Satisfied with the delivery?</p>
              <button
                onClick={() => {
                  setDeliveryViewerOpen(false); // Close viewer
                  setApprovalModalOpen(true);   // Instantly open the approval modal!
                }}
                className="h-12 px-6 font-black rounded-xl bg-emerald-500 text-white shadow-xl hover:bg-emerald-600 transition-all active:scale-95 flex items-center"
              >
                Proceed to Approve
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 dark:text-white flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-blue-600" />
              Buyer Dashboard
            </h1>
            <p className="text-zinc-500 font-medium mt-2">Track your active projects and manage your hires.</p>
          </div>
          <a href="/marketplace" className="inline-flex h-14 items-center px-8 font-black text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 rounded-[2rem] shadow-xl hover:scale-105 active:scale-95 transition-all">
            <Search className="w-5 h-5 mr-2" /> Find Talent
          </a>
        </div>

        {/* HERO BANNER */}
        <div className="relative bg-gradient-to-br from-indigo-600 to-blue-800 rounded-[2.5rem] p-10 overflow-hidden shadow-2xl mb-10 border border-white/10">
          <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="text-white">
              <h2 className="text-4xl font-black mb-2 tracking-tight">Welcome, {firstName}</h2>
              <p className="opacity-80 font-medium max-w-md">
                You currently have {activeOrders.length} active project{activeOrders.length !== 1 ? 's' : ''} in development. Remember, funds are held securely until you approve the final delivery.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2rem] min-w-[200px]">
               <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Total Spent</p>
               <p className="text-3xl font-black text-white">BHD {completedOrders.reduce((sum, o) => sum + Number(o.price), 0)}</p>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] w-fit shadow-sm mb-8">
          <button onClick={() => setActiveTab('active')} className={`px-8 py-3 rounded-full text-sm font-black transition-all ${activeTab === 'active' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>
            Active Projects ({activeOrders.length})
          </button>
          <button onClick={() => setActiveTab('completed')} className={`px-8 py-3 rounded-full text-sm font-black transition-all ${activeTab === 'completed' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>
            Completed ({completedOrders.length})
          </button>
        </div>

        {/* ORDERS LIST */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          {displayOrders.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 p-16 text-center shadow-sm">
              <div className="w-20 h-20 mx-auto bg-blue-50 dark:bg-blue-900/20 rounded-[1.5rem] flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <h4 className="text-3xl font-black text-zinc-900 dark:text-white mb-2">No {activeTab} projects</h4>
              <p className="text-zinc-500 font-medium mb-8">When you hire a professional from the marketplace, the project will appear here.</p>
              <a href="/marketplace" className="inline-flex h-14 items-center px-8 font-black text-white bg-blue-600 rounded-full transition-all hover:bg-blue-700 shadow-lg shadow-blue-600/20">
                Explore Services
              </a>
            </div>
          ) : (
            displayOrders.map((order) => (
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
                        order.status === 'delivered' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {order.status === 'in_progress' ? 'In Progress' : order.status === 'delivered' ? 'Awaiting Your Approval' : 'Completed'}
                      </span>
                      <span className="text-xs font-bold text-zinc-400">ID: {order.id.split('-')[0].toUpperCase()}</span>
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white truncate">{order.title}</h3>
                    <p className="text-sm font-medium text-zinc-500 flex items-center gap-1 mt-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> Funds Secured: <span className="font-bold text-zinc-900 dark:text-white">BHD {order.price}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto shrink-0 flex-wrap justify-end">
                  
                  {order.status !== 'completed' && (
                    <a href={`/messages?to=${order.seller_id}`} className="h-12 px-6 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                      <MessageSquare className="w-4 h-4" /> Message
                    </a>
                  )}
                  
                  {order.status === 'delivered' && (
                    <>
                      {order.meeting_link && (
                        <a href={order.meeting_link} target="_blank" rel="noreferrer" className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                          <Video className="w-5 h-5" /> Join Call
                        </a>
                      )}

                      {/* If the new multiple files array exists */}
                      {order.delivery_files && order.delivery_files.length > 0 && (
                        <button 
                          onClick={() => {
                            setActiveDeliveryFiles(order.delivery_files);
                            setActiveOrderIdForApproval(order.id);
                            setDeliveryViewerOpen(true);
                          }}
                          className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                        >
                          <PackageOpen className="w-5 h-5" /> View Delivery
                        </button>
                      )}

                      <button 
                        onClick={() => {
                          setActiveOrderIdForApproval(order.id);
                          setApprovalModalOpen(true);
                        }}
                        disabled={actionLoading === order.id}
                        className="h-12 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                      >
                        {actionLoading === order.id ? <Loader2 className="w-5 h-5 animate-spin" /> : "Approve & Pay"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}