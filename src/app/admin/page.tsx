"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import toast from 'react-hot-toast';
import VerificationQueue from '@/components/admin/VerificationQueue';
import { 
  LayoutDashboard, Users, Wallet, AlertOctagon, 
  TrendingUp, Activity, Search, ArrowRightLeft, 
  ShieldAlert, CheckCircle2, Clock, X, Loader2, 
  ArrowUpRight, Sparkles, Bot, Shield, FileText, Ban, UserX
} from "lucide-react";

export default function AdminDashboard() {
  const [supabase, setSupabase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Dashboard State
  const [orders, setOrders] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profilesCount, setProfilesCount] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  // Metrics
  const [metrics, setMetrics] = useState({
    totalVolume: 0,
    platformRevenue: 0,
    activeEscrow: 0,
    completedOrders: 0,
    disputedOrders: 0
  });

  const PLATFORM_FEE_PERCENTAGE = 0.10; // SkillSouq takes 10%

  // --- AI FEATURE STATES ---
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState("");
  
  // --- MODAL STATES ---
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [selectedDisputedOrder, setSelectedDisputedOrder] = useState<any>(null);
  const [isAnalyzingDispute, setIsAnalyzingDispute] = useState(false);
  const [aiDisputeAdvice, setAiDisputeAdvice] = useState("");

  const [viewTransaction, setViewTransaction] = useState<any>(null);
  const [manageUser, setManageUser] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    const client = createClient();
    setSupabase(client);

    const load = async () => {
      setLoading(true);
      try {
        const { data: fetchedOrders } = await client.from('orders').select('*').order('created_at', { ascending: false });
        const { data: fetchedProfiles, count: usersCount } = await client.from('profiles').select('*', { count: 'exact' });

        if (!isMounted) return;

        const activeOrders = fetchedOrders || [];
        setOrders(activeOrders);
        setProfiles(fetchedProfiles || []);
        setProfilesCount(usersCount || 0);

        let volume = 0;
        let revenue = 0;
        let escrow = 0;
        let completed = 0;
        let disputed = 0;

        activeOrders.forEach((order: any) => {
          const price = Number(order.price) || 0;
          if (order.status === 'completed') {
            volume += price;
            revenue += (price * PLATFORM_FEE_PERCENTAGE);
            completed += 1;
          } else if (order.status === 'in_progress' || order.status === 'delivered') {
            escrow += price;
          } else if (order.status === 'disputed') {
            disputed += 1;
          }
        });

        setMetrics({
          totalVolume: volume,
          platformRevenue: revenue,
          activeEscrow: escrow,
          completedOrders: completed,
          disputedOrders: disputed
        });

        setLoading(false);
      } catch (err) {
        console.error("Admin Dashboard Error:", err);
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => { isMounted = false; };
  }, []);

  // --- GROQ API INTEGRATION ---
  const callGroq = async (prompt: string, systemPrompt: string) => {
    let retries = 5;
    let delay = 1000;

    while (retries > 0) {
      try {
        const response = await fetch('/api/messages-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            systemPrompt,
            model: 'llama-3.1-8b-instant',
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'API Error');
        return data.result?.trim() || '';
      } catch (e) {
        retries--;
        if (retries === 0) return 'AI is currently resting. Please try again later.';
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2;
      }
    }

    return '';
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    const prompt = `Generate a 2-paragraph executive summary for the CEO of SkillSouq based on these live metrics: 
    Total Market Volume: BHD ${metrics.totalVolume.toFixed(2)}
    Platform Revenue: BHD ${metrics.platformRevenue.toFixed(2)}
    Active Escrow: BHD ${metrics.activeEscrow.toFixed(2)}
    Completed Orders: ${metrics.completedOrders}
    Disputed Orders: ${metrics.disputedOrders}
    Registered Users: ${profilesCount}`;
    const system = "You are an expert Chief Operating Officer AI for a freelance marketplace in Bahrain. Analyze the metrics and provide an encouraging but realistic executive summary. Point out any concerns if disputes are high, or praise the volume. Keep it professional, concise, and do not use markdown bolding.";
    const result = await callGroq(prompt, system);
    setAiReport(result);
    setIsGeneratingReport(false);
  };

  const handleAnalyzeDispute = async (order: any) => {
    setSelectedDisputedOrder(order);
    setDisputeModalOpen(true);
    setIsAnalyzingDispute(true);
    setAiDisputeAdvice("");
    const prompt = `Analyze this disputed order:\nOrder ID: ${order.id}\nService: ${order.title}\nAmount: BHD ${order.price}\nStatus: ${order.status}\nGive me a 3-step action plan on how to resolve this dispute fairly between the buyer and the seller. Suggest what evidence I should ask for.`;
    const system = "You are a fair, objective dispute resolution AI for a freelance marketplace. Provide 3 highly actionable, numbered steps for the human admin to mediate the dispute. Be concise and professional.";
    const result = await callGroq(prompt, system);
    setAiDisputeAdvice(result);
    setIsAnalyzingDispute(false);
  };

    const forceResolveDispute = async (orderId: string) => {
     if(!supabase) return;
     try {
         const { error } = await supabase.from('orders').update({ status: 'refunded' }).eq('id', orderId);
         if (error) throw error;
       // notify via toast
       // @ts-ignore
       toast?.success?.(`Funds for Order ${orderId.split('-')[0].toUpperCase()} have been forcefully refunded to the Buyer.`);
         setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'refunded' } : o));
         setDisputeModalOpen(false);
     } catch (err: any) {
         console.error(err);
       // @ts-ignore
       toast?.error?.("Failed to refund order: " + err.message);
     }
  };

  const handleBanUser = async (userId: string) => {
    if (!supabase) return;
    const toastId = toast.loading('Banning user and sending email...');
    try {
      const userToban = profiles.find(p => p.id === userId);
      if (!userToban?.email) throw new Error('User email not found');

      const emailResponse = await fetch('/api/admin-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userToban.email,
          actionType: 'ban',
          message: 'Your account has been terminated due to violation of our community guidelines. If you believe this is a mistake, please contact our support team.'
        })
      });

      const emailResult = await emailResponse.json();
      if (!emailResponse.ok) throw new Error(emailResult.error);

      const { error } = await supabase
        .from('profiles')
        .update({ account_status: 'banned' })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User banned and notification email sent!', { id: toastId });
      setProfiles(prev => prev.filter(u => u.id !== userId));
      setManageUser(null);
    } catch (err: any) {
      console.error(err);
      toast.error('Error: ' + err.message, { id: toastId });
    }
  };

  const handleSendWarning = async (userEmail: string) => {
    const toastId = toast.loading('Sending official warning...');
    try {
      const response = await fetch('/api/admin-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          actionType: 'warning',
          message: 'This is an official warning regarding your recent activity. Please ensure you are following SkillSouq guidelines. Repeated violations may result in account suspension.'
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      toast.success('Warning email successfully delivered!', { id: toastId });
    } catch (error: any) {
      toast.error('Failed to send email: ' + error.message, { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FAFAFA] dark:bg-zinc-950">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // Helper to render the transaction table
  const renderTransactionTable = (orderList: any[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-zinc-50 dark:bg-zinc-950/50 text-[10px] uppercase tracking-widest text-zinc-500 font-black">
            <th className="p-4 pl-8 border-b border-zinc-200 dark:border-zinc-800">Order ID & Service</th>
            <th className="p-4 border-b border-zinc-200 dark:border-zinc-800">Amount</th>
            <th className="p-4 border-b border-zinc-200 dark:border-zinc-800">Platform Fee</th>
            <th className="p-4 border-b border-zinc-200 dark:border-zinc-800">Status</th>
            <th className="p-4 pr-8 border-b border-zinc-200 dark:border-zinc-800">Action</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {orderList.map((order, i) => {
            const price = Number(order.price) || 0;
            const fee = price * PLATFORM_FEE_PERCENTAGE;
            return (
              <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                <td className="p-4 pl-8">
                  <p className="font-black text-zinc-900 dark:text-white mb-0.5">{order.title}</p>
                  <p className="text-[10px] text-zinc-400 font-bold">{order.id.split('-')[0].toUpperCase()}</p>
                </td>
                <td className="p-4 font-black text-zinc-900 dark:text-white">BHD {price.toFixed(2)}</td>
                <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">+ BHD {fee.toFixed(2)}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                    order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    order.status === 'disputed' ? 'bg-red-50 text-red-700 border-red-200' :
                    order.status === 'refunded' ? 'bg-zinc-100 text-zinc-500 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {order.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                    {order.status === 'disputed' && <ShieldAlert className="w-3 h-3" />}
                    {(order.status === 'in_progress' || order.status === 'delivered') && <Clock className="w-3 h-3" />}
                    {order.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4 pr-8">
                  {order.status === 'disputed' ? (
                    <button onClick={() => handleAnalyzeDispute(order)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Resolve
                    </button>
                  ) : (
                    <button onClick={() => setViewTransaction(order)} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg transition-colors">
                      View Details
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {orderList.length === 0 && <div className="p-12 text-center text-zinc-500 font-medium">No transactions found.</div>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#F8F9FB] dark:bg-zinc-950 font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* --- 🌟 TRANSACTION DETAILS MODAL --- */}
      {viewTransaction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 border border-zinc-200 dark:border-zinc-800">
            <button onClick={() => setViewTransaction(null)} className="absolute top-6 right-6 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-6">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white">Order Details</h2>
                <p className="text-xs font-bold text-zinc-500">{viewTransaction.id}</p>
              </div>
            </div>
            <div className="space-y-4 mb-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Service Name</p>
                <p className="font-bold text-zinc-900 dark:text-white">{viewTransaction.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Buyer ID</p>
                  <p className="font-bold text-xs text-zinc-600 dark:text-zinc-400 truncate" title={viewTransaction.buyer_id}>{viewTransaction.buyer_id.split('-')[0]}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Seller ID</p>
                  <p className="font-bold text-xs text-zinc-600 dark:text-zinc-400 truncate" title={viewTransaction.seller_id}>{viewTransaction.seller_id.split('-')[0]}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Price</p>
                  <p className="font-black text-zinc-900 dark:text-white text-lg">BHD {viewTransaction.price}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Platform Cut (10%)</p>
                  <p className="font-black text-emerald-600 text-lg">+ BHD {(viewTransaction.price * PLATFORM_FEE_PERCENTAGE).toFixed(2)}</p>
                </div>
              </div>
            </div>
            <button onClick={() => setViewTransaction(null)} className="w-full h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black transition-all shadow-xl active:scale-95">
              Close
            </button>
          </div>
        </div>
      )}

      {/* --- 🌟 MANAGE USER MODAL --- */}
      {manageUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 border border-zinc-200 dark:border-zinc-800">
            <button onClick={() => setManageUser(null)} className="absolute top-6 right-6 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center mb-3 font-black text-2xl text-zinc-500">
                {manageUser.first_name ? manageUser.first_name.charAt(0) : "U"}
              </div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">{manageUser.first_name || "Unknown"} {manageUser.last_name || "User"}</h2>
              <p className="text-xs font-bold text-zinc-500">{manageUser.email || "No email on public profile"}</p>
              <div className="mt-2 inline-flex px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-500">
                ID: {manageUser.id.split('-')[0]}
              </div>
            </div>
            
            <div className="space-y-3">
               <button onClick={() => handleSendWarning(manageUser.email)} className="w-full flex items-center justify-center gap-2 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 border border-amber-100 dark:border-amber-800 rounded-xl font-bold transition-all">
                 <ShieldAlert className="w-4 h-4" /> Send Official Warning
               </button>
               <button onClick={() => handleBanUser(manageUser.id)} className="w-full flex items-center justify-center gap-2 h-12 bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 border border-red-100 dark:border-red-800 rounded-xl font-bold transition-all">
                 <Ban className="w-4 h-4" /> Suspend Account
               </button>
               <button onClick={() => toast("Permanent deletion requires Database Access.")} className="w-full flex items-center justify-center gap-2 h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black shadow-xl active:scale-95 transition-all mt-4">
                 <UserX className="w-4 h-4" /> Delete Account
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 🌟 DISPUTE RESOLUTION MODAL --- */}
      {disputeModalOpen && selectedDisputedOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 md:p-10 w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 duration-200 border border-zinc-200 dark:border-zinc-800">
            <button onClick={() => setDisputeModalOpen(false)} className="absolute top-6 right-6 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center border border-red-100 dark:border-red-800/50">
                <ShieldAlert className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Dispute Resolution</h2>
                <p className="text-sm font-bold text-zinc-500">Order ID: {selectedDisputedOrder.id.split('-')[0].toUpperCase()}</p>
              </div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-6 flex justify-between items-center">
               <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Service Disputed</p>
                 <p className="text-sm font-bold text-zinc-900 dark:text-white">{selectedDisputedOrder.title}</p>
               </div>
               <div className="text-right">
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Escrow Amount</p>
                 <p className="text-lg font-black text-red-600 dark:text-red-400">BHD {selectedDisputedOrder.price}</p>
               </div>
            </div>
            {/* AI Analysis Box */}
            <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/50 rounded-2xl p-5 mb-8">
              <h3 className="text-sm font-black text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                <Bot className="w-4 h-4" /> AI Mediation Assistant
              </h3>
              {isAnalyzingDispute ? (
                <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400 text-sm font-bold">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing dispute protocol...
                </div>
              ) : (
                <div className="text-sm font-medium text-purple-800 dark:text-purple-300 space-y-2 whitespace-pre-wrap leading-relaxed">
                  {aiDisputeAdvice}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDisputeModalOpen(false)} className="flex-1 h-12 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl font-bold transition-all">
                Contact Parties
              </button>
              <button onClick={() => forceResolveDispute(selectedDisputedOrder.id)} className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black shadow-lg shadow-red-600/20 active:scale-95 transition-all">
                Force Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 🌟 ADMIN SIDEBAR --- */}
      <div className="w-full md:w-64 bg-zinc-900 dark:bg-zinc-950 h-auto md:h-screen p-6 flex flex-col border-r border-zinc-800 shrink-0 overflow-y-auto">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">S</div>
          <div>
            <h1 className="text-white font-black text-lg leading-tight">SkillSouq</h1>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Admin Control</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
            <LayoutDashboard className="w-4 h-4" /> System Overview
          </button>
          <button onClick={() => setActiveTab('transactions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'transactions' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
            <ArrowRightLeft className="w-4 h-4" /> Transactions
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
            <Users className="w-4 h-4" /> Manage Users
          </button>
          <button onClick={() => setActiveTab('disputes')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'disputes' ? 'bg-red-600 text-white shadow-md' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
            <div className="flex items-center gap-3"><AlertOctagon className="w-4 h-4" /> Disputes</div>
            {metrics.disputedOrders > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{metrics.disputedOrders}</span>}
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-800">
          <a href="/" className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors text-sm font-bold">
            <ArrowUpRight className="w-4 h-4" /> Exit to Platform
          </a>
        </div>
      </div>

      {/* --- 🌟 MAIN DASHBOARD CONTENT (Independent scroll) --- */}
      <div className="flex-1 p-6 md:p-10 h-screen overflow-y-auto">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              {activeTab === 'overview' ? 'Financial Command Center' : 
               activeTab === 'transactions' ? 'All Transactions' : 
               activeTab === 'users' ? 'User Management' : 'Active Disputes'}
            </h2>
            <p className="text-sm text-zinc-500 font-medium">Real-time overview of marketplace activity.</p>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === 'overview' && (
              <button 
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="h-10 px-5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isGeneratingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                ✨ Generate AI Report
              </button>
            )}
            <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Live Data</span>
            </div>
          </div>
        </div>

        {/* --- TAB: OVERVIEW --- */}
        {activeTab === 'overview' && (
          <div className="animate-in fade-in">
            {/* AI Report */}
            {aiReport && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 p-6 rounded-[2rem] border border-purple-100 dark:border-purple-800/30 mb-10 shadow-sm animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-purple-700 dark:text-purple-300" />
                  </div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">AI Executive Summary</h3>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 font-medium text-sm leading-relaxed whitespace-pre-wrap">
                  {aiReport}
                </p>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-full blur-2xl"></div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-800">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Platform Revenue (10%)</p>
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white">BHD {metrics.platformRevenue.toLocaleString()}</h3>
                <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">Auto-Calculated Cut</p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-2xl"></div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-800">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Funds in Escrow</p>
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white">BHD {metrics.activeEscrow.toLocaleString()}</h3>
                <p className="text-xs text-blue-600 font-bold mt-2 flex items-center gap-1">Secured pending approval</p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-4 border border-purple-100 dark:border-purple-800">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Total Market Volume</p>
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white">BHD {metrics.totalVolume.toLocaleString()}</h3>
                <p className="text-xs text-purple-600 font-bold mt-2 flex items-center gap-1">{metrics.completedOrders} orders completed</p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-700">
                  <Users className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Registered Users</p>
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white">{profilesCount}</h3>
                <p className="text-xs text-zinc-500 font-bold mt-2 flex items-center gap-1">Buyers & Sellers</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-xl font-black text-zinc-900 dark:text-white">Recent Activity</h3>
              </div>
              {renderTransactionTable(orders.slice(0, 5))} {/* Show only top 5 in overview */}
            </div>

            <div className="mt-10">
              <VerificationQueue />
            </div>
          </div>
        )}

        {/* --- TAB: TRANSACTIONS --- */}
        {activeTab === 'transactions' && (
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in">
             {renderTransactionTable(orders)}
          </div>
        )}

        {/* --- TAB: DISPUTES --- */}
        {activeTab === 'disputes' && (
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in">
             {renderTransactionTable(orders.filter(o => o.status === 'disputed'))}
          </div>
        )}

        {/* --- TAB: USERS --- */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950/50 text-[10px] uppercase tracking-widest text-zinc-500 font-black">
                    <th className="p-4 pl-8 border-b border-zinc-200 dark:border-zinc-800">User ID & Name</th>
                    <th className="p-4 border-b border-zinc-200 dark:border-zinc-800">Professional Title</th>
                    <th className="p-4 border-b border-zinc-200 dark:border-zinc-800">Joined</th>
                    <th className="p-4 pr-8 border-b border-zinc-200 dark:border-zinc-800">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {profiles.map((profile, i) => (
                    <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="p-4 pl-8">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-xs">
                             {profile.first_name ? profile.first_name.charAt(0) : "U"}
                          </div>
                          <div>
                            <p className="font-black text-zinc-900 dark:text-white mb-0.5">{profile.first_name} {profile.last_name}</p>
                            <p className="text-[10px] text-zinc-400 font-bold">{profile.id.split('-')[0].toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-zinc-600 dark:text-zinc-300">
                        {profile.professional_title || "Standard Member"}
                      </td>
                      <td className="p-4 text-xs font-bold text-zinc-500">
                        {/* 🚨 FIXED: Now uses the correct date fallback so it doesn't always show "today" */}
                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : (profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : "Recent")}
                      </td>
                      <td className="p-4 pr-8">
                        <button onClick={() => setManageUser(profile)} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg transition-colors">
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {profiles.length === 0 && <div className="p-12 text-center text-zinc-500 font-medium">No users found.</div>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}