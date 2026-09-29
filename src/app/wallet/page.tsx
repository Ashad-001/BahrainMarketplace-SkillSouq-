"use client";

import { useState, useEffect } from "react";
import { createClient } from '@/utils/supabase/client';
import { 
  Wallet, ArrowDownToLine, ArrowUpRight, 
  Clock, CheckCircle2, Loader2, Building2, 
  CreditCard, FileText, ShieldCheck, Plus, X, QrCode, Printer
} from "lucide-react";

export default function WalletDashboard() {
  const [supabase, setSupabase] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState("buyer");
  const [orders, setOrders] = useState<any[]>([]);

  // Action states
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isToppingUp, setIsToppingUp] = useState(false);
  
  // Modal states
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("100");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // REAL DATABASE WALLET BALANCE
  const [buyerBalance, setBuyerBalance] = useState(0);

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
        setUser(session?.user ?? null);
        setIsLoading(false);

        if (!session) {
          if (isMounted) setAuthResolved(true);
          if (isMounted) setLoading(false);
          return;
        }

        const currentRole = session.user.user_metadata?.active_role || "buyer";
        setActiveRole(currentRole);

        // Fetch Orders
        const roleColumn = currentRole === 'buyer' ? 'buyer_id' : 'seller_id';
        const { data: ordersData } = await client
          .from('orders')
          .select('*')
          .eq(roleColumn, session.user.id)
          .order('created_at', { ascending: false });

        if (ordersData && isMounted) setOrders(ordersData);

        // Fetch Real Wallet Balance
        const { data: walletData, error: walletError } = await client
          .from('wallets')
          .select('balance')
          .eq('user_id', session.user.id)
          .single();

        if (walletData && isMounted) {
          setBuyerBalance(Number(walletData.balance));
        } else if (walletError && walletError.code === 'PGRST116') {
          // Create default wallet if it's missing
          await client.from('wallets').insert([{ user_id: session.user.id, balance: 0 }]);
          if (isMounted) setBuyerBalance(0);
        }

        if (isMounted) setLoading(false);
        if (isMounted) setAuthResolved(true);
      } catch (err) {
        console.error("Wallet Error:", err);
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

  const handleWithdraw = () => {
    setIsWithdrawing(true);
    setTimeout(() => {
      alert("Withdrawal initiated! Funds will arrive in your bank account in 2-3 business days.");
      setIsWithdrawing(false);
    }, 1500);
  };

  // 👉 BULLETPROOF UPSERT: Demands a response from the database
  const handleTopUp = async () => {
    if (!supabase || !user) return;
    setIsToppingUp(true);
    
    try {
      const newBalance = Number(buyerBalance) + Number(topUpAmount);
      
      // We added .select() to force Supabase to return the row it just saved
      const { data, error: walletError } = await supabase
        .from('wallets')
        .upsert({ 
          user_id: user.id, 
          balance: newBalance,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select();

      if (walletError) {
        throw new Error(`DB Error: ${walletError.message}`);
      }
      
      if (!data || data.length === 0) {
        throw new Error("Supabase silently dropped the save! The schema cache is likely still stale.");
      }

      // Ensure Notification saves
      const { error: notifError } = await supabase.from('notifications').insert([{
        user_id: user.id,
        title: "💳 Funds Added",
        message: `Successfully topped up BHD ${topUpAmount} to your wallet.`,
        type: "payment",
        link: "/wallet"
      }]);

      if (notifError) console.error("Notification Error:", notifError);

      setBuyerBalance(newBalance);
      setShowTopUpModal(false);
      setTopUpAmount("100"); 

    } catch (err: any) {
      console.error("Top Up Failed:", err);
      alert(`Top Up Failed: ${err.message}`);
    } finally {
      setIsToppingUp(false);
    }
  };

  const openInvoice = (order: any) => {
    setSelectedInvoice(order);
    setShowInvoiceModal(true);
  };

  const printInvoice = () => {
    window.print();
  };

  if (isLoading) return <div className="text-center p-20">Loading secure wallet...</div>;

  if (!authResolved) return <div className="text-center p-20">Loading secure wallet...</div>;

  if (!user) {
    return <div>Login Required</div>;
  }

  if (loading) return <div className="min-h-screen flex justify-center pt-32"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>;

  // --- MATH CALCS ---
  const completedOrders = orders.filter(o => o.status === 'completed');
  const pendingOrders = orders.filter(o => o.status !== 'completed');

  const totalCompletedMoney = completedOrders.reduce((sum, o) => sum + Number(o.price), 0);
  const totalPendingMoney = pendingOrders.reduce((sum, o) => sum + Number(o.price), 0);

  const isSeller = activeRole === 'seller';
  const themeColor = isSeller ? 'emerald' : 'blue';

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-zinc-950 font-sans pb-20">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-invoice, #printable-invoice * { visibility: visible; }
          #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; }
          #no-print-btn { display: none; }
        }
      `}} />

      {/* TOP UP MODAL */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-blue-600" /> Add Funds
              </h2>
              <button onClick={() => setShowTopUpModal(false)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"><X className="w-5 h-5"/></button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Deposit Amount (BHD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-400">BHD</span>
                  <input type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="w-full h-14 pl-14 pr-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-black text-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Card Number</label>
                  <input type="text" placeholder="**** **** **** 4242" className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 pb-1 text-sm font-medium outline-none focus:border-blue-600 transition-colors" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Expiry</label>
                    <input type="text" placeholder="MM/YY" className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 pb-1 text-sm font-medium outline-none focus:border-blue-600 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">CVC</label>
                    <input type="text" placeholder="123" className="w-full bg-transparent border-b border-zinc-300 dark:border-zinc-700 pb-1 text-sm font-medium outline-none focus:border-blue-600 transition-colors" />
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleTopUp} 
              disabled={isToppingUp || Number(topUpAmount) <= 0}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
            >
              {isToppingUp ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              Pay Securely
            </button>
          </div>
        </div>
      )}

      {/* INVOICE MODAL */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl my-8">
            
            <div id="no-print-btn" className="flex justify-between items-center mb-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
              <button onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">Close</button>
              <button onClick={printInvoice} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                <Printer className="w-4 h-4" /> Save as PDF / Print
              </button>
            </div>

            <div id="printable-invoice" className="bg-white p-10 md:p-14 rounded-sm shadow-2xl text-zinc-900 min-h-[800px] border border-zinc-200">
              
              <div className="flex justify-between items-start border-b-2 border-zinc-100 pb-8 mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white font-black text-xl leading-none">S</span>
                    </div>
                    <span className="text-2xl font-black tracking-tight text-zinc-900">SkillSouq</span>
                  </div>
                  <p className="text-xs text-zinc-500">123 Tech Boulevard<br/>Manama, Kingdom of Bahrain<br/>VAT: BH-10998374</p>
                </div>
                <div className="text-right">
                  <h1 className="text-4xl font-black text-zinc-200 uppercase tracking-widest mb-2">Invoice</h1>
                  <p className="text-sm font-bold text-zinc-900">INV-{selectedInvoice.id.split('-')[0].toUpperCase()}</p>
                  <p className="text-xs text-zinc-500 font-medium">Date: {new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex justify-between gap-8 mb-12">
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Billed To</p>
                  <p className="font-bold text-zinc-900">{user?.user_metadata?.first_name || "Valued Client"} {user?.user_metadata?.last_name || ""}</p>
                  <p className="text-xs text-zinc-500 mt-1">{user?.email}</p>
                  <p className="text-xs text-zinc-500">Client ID: {user?.id.split('-')[0]}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Service Provider</p>
                  <p className="font-bold text-zinc-900">SkillSouq Professional</p>
                  <p className="text-xs text-zinc-500 mt-1">Ref ID: {selectedInvoice.seller_id.split('-')[0]}</p>
                  <p className="text-xs text-zinc-500">Platform Escrow Payment</p>
                </div>
              </div>

              <div className="mb-12">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-zinc-800 text-zinc-900">
                      <th className="py-3 text-xs font-black uppercase tracking-widest">Description</th>
                      <th className="py-3 text-xs font-black uppercase tracking-widest text-center">Qty</th>
                      <th className="py-3 text-xs font-black uppercase tracking-widest text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-100">
                      <td className="py-4">
                        <p className="font-bold text-sm text-zinc-900">{selectedInvoice.title}</p>
                        <p className="text-xs text-zinc-500 mt-1">Freelance service delivery via SkillSouq marketplace.</p>
                      </td>
                      <td className="py-4 text-center text-sm font-medium">1</td>
                      <td className="py-4 text-right text-sm font-bold">BHD {selectedInvoice.price}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-end mt-auto pt-8 border-t border-zinc-100">
                <div className="flex items-center gap-4 text-zinc-400">
                  <QrCode className="w-16 h-16" />
                  <p className="text-[10px] uppercase font-bold leading-tight">Scan to verify<br/>receipt on<br/>SkillSouq.com</p>
                </div>
                
                <div className="w-64">
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-zinc-500 font-medium">Subtotal</span>
                    <span className="font-bold">BHD {selectedInvoice.price}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm border-b border-zinc-200">
                    <span className="text-zinc-500 font-medium">Platform Fee (0%)</span>
                    <span className="font-bold">BHD 0.00</span>
                  </div>
                  <div className="flex justify-between py-3 text-lg">
                    <span className="font-black text-zinc-900">Total Paid</span>
                    <span className="font-black text-indigo-600">BHD {selectedInvoice.price}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-center text-[10px] text-zinc-400 font-medium mt-16 pt-8 border-t border-zinc-100">
                Thank you for your business. This is a computer-generated document. No signature is required.
              </p>

            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD UI */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
              <Wallet className={`w-8 h-8 text-${themeColor}-600`} />
              {isSeller ? "Earnings & Payouts" : "Billing & Expenses"}
            </h1>
            <p className="text-zinc-500 font-medium mt-2">
              {isSeller ? "Manage your income and withdraw funds to your bank." : "Manage your wallet balance and download invoices."}
            </p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${isSeller ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
            {isSeller ? "Seller Mode" : "Buyer Mode"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          
          <div className={`relative overflow-hidden rounded-[2.5rem] p-8 shadow-xl border border-white/10 ${isSeller ? 'bg-gradient-to-br from-emerald-500 to-teal-700' : 'bg-gradient-to-br from-blue-600 to-indigo-800'}`}>
            <div className="absolute top-0 right-0 p-8 opacity-20">
              {isSeller ? <Building2 className="w-32 h-32" /> : <CreditCard className="w-32 h-32" />}
            </div>
            <div className="relative z-10">
              <p className="text-white/80 font-bold uppercase tracking-widest text-xs mb-1">
                {isSeller ? "Available for Withdrawal" : "Current Wallet Balance"}
              </p>
              <h2 className="text-5xl font-black text-white mb-8">BHD {isSeller ? totalCompletedMoney : buyerBalance}</h2>
              
              {isSeller ? (
                <button onClick={handleWithdraw} disabled={isWithdrawing || totalCompletedMoney === 0} className="h-12 px-8 bg-white text-emerald-700 rounded-xl font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl">
                  {isWithdrawing ? <Loader2 className="w-5 h-5 animate-spin"/> : <ArrowUpRight className="w-5 h-5"/>}
                  Withdraw to Bank
                </button>
              ) : (
                <button onClick={() => setShowTopUpModal(true)} className="h-12 px-8 bg-white text-blue-700 rounded-xl font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl">
                  <Plus className="w-5 h-5"/> Top Up Wallet
                </button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col justify-center relative">
             {!isSeller && (
                <div className="absolute top-8 right-8 text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Lifetime Spent</p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white">BHD {totalCompletedMoney}</p>
                </div>
             )}
             
             <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-4">
               <Clock className="w-6 h-6 text-amber-500" />
             </div>
             <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-1">
               {isSeller ? "Pending Clearance" : "Active in Escrow"}
             </p>
             <h2 className="text-4xl font-black text-zinc-900 dark:text-white mb-2">BHD {totalPendingMoney}</h2>
             <p className="text-sm font-medium text-zinc-400 max-w-[250px]">
               {isSeller ? "Funds locked in active projects awaiting client approval." : "Funds securely held until you approve final deliveries."}
             </p>
          </div>
        </div>

        <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-6">Transaction History</h3>
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          {orders.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">No transactions yet.</div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {orders.map((order) => (
                <div key={order.id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${order.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {order.status === 'completed' ? <CheckCircle2 className="w-6 h-6"/> : <Clock className="w-6 h-6"/>}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-white">{order.title}</h4>
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        {new Date(order.created_at).toLocaleDateString()} • ID: {order.id.split('-')[0].toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto gap-8">
                    <div className="text-right">
                      <p className={`font-black text-lg ${isSeller ? (order.status==='completed' ? 'text-emerald-500' : 'text-zinc-400') : 'text-zinc-900 dark:text-white'}`}>
                        {isSeller ? '+' : '-'} BHD {order.price}
                      </p>
                      <p className="text-xs font-bold text-zinc-400 uppercase">
                        {order.status === 'completed' ? 'Cleared' : 'Pending'}
                      </p>
                    </div>

                    {/* 👉 THE NEW PDF INVOICE GENERATOR BUTTON */}
                    {!isSeller && order.status === 'completed' && (
                      <button 
                        onClick={() => openInvoice(order)} 
                        className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors" 
                        title="View PDF Invoice"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      
      </div>
    </div>
  );
}
