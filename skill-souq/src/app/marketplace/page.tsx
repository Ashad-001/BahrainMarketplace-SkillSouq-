"use client";

import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
import { 
  Search, Scale, Zap, FileText, BarChart3, 
  Loader2, Star, ShieldCheck, ArrowRight, X, 
  Clock, MapPin, MessageSquare, Sparkles, UserCheck, AlertCircle, Copy, Check
} from "lucide-react";

export default function MarketplacePage() {
  const [gigs, setGigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGigs, setLoadingGigs] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Services");
  
  const [selectedGig, setSelectedGig] = useState<any>(null);
  const [copiedSellerId, setCopiedSellerId] = useState<string | null>(null);

  // --- AI Feature States ---
  const [isMatching, setIsMatching] = useState(false);
  const [aiMatchResult, setAiMatchResult] = useState("");
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState("");
  const [questionLevel, setQuestionLevel] = useState<"simple" | "intermediate" | "high">("simple");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const categories = [
    { id: "All Services", label: "All Services", icon: null },
    { id: "Legal", label: "Legal Counsel", icon: Scale },
    { id: "IT & Tech", label: "IT & Tech", icon: Zap },
    { id: "Clearance", label: "Clearance", icon: FileText },
    { id: "Consulting", label: "Consulting", icon: BarChart3 },
  ];

  const handleCopySellerId = async (sellerId: string) => {
    try {
      await navigator.clipboard.writeText(sellerId);
      setCopiedSellerId(sellerId);
      window.setTimeout(() => {
        setCopiedSellerId((current) => (current === sellerId ? null : current));
      }, 1800);
    } catch (error) {
      console.error("Failed to copy seller id:", error);
    }
  };

  // 🚨 FIXED: Strict Singleton Database Loader
  useEffect(() => {
    let isMounted = true;
    const INITIAL_BATCH_SIZE = 24;
    
    const fetchGigs = async () => {
      const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const PROJECT_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      try {
        // STRICT SINGLETON: Always use the shared global client to prevent deadlocks
        let client = (window as any).globalSupabaseClient;
        
        // If Navbar hasn't created it yet, we create it and share it globally
        if (!client) {
          client = createClient(PROJECT_URL, PROJECT_ANON_KEY, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: false,
              storage: typeof window !== 'undefined' ? window.localStorage : undefined
            }
          });
          (window as any).globalSupabaseClient = client;
        }

        const { data, error } = await client
          .from('gigs')
          .select('id,title,price,category,description,seller_id,seller_name,seller_avatar,media_url,created_at')
          .order('created_at', { ascending: false })
          .range(0, INITIAL_BATCH_SIZE - 1);

        if (error) throw error;
        
        if (isMounted) {
          const initialGigs = data || [];
          setGigs(initialGigs);
          setLoadingGigs(false);
          setFetchError(false);
          setErrorMessage("");

          if (initialGigs.length === INITIAL_BATCH_SIZE) {
            client
              .from('gigs')
              .select('id,title,price,category,description,seller_id,seller_name,seller_avatar,media_url,created_at')
              .order('created_at', { ascending: false })
              .range(INITIAL_BATCH_SIZE, INITIAL_BATCH_SIZE + 199)
              .then(({ data: remainingData, error: remainingError }) => {
                if (!isMounted || remainingError || !remainingData?.length) return;
                setGigs(prev => [...prev, ...remainingData]);
              });
          }
        }
      } catch (error) {
        console.error("Error fetching gigs:", error);
        if (isMounted) {
          setFetchError(true);
          setErrorMessage(error instanceof Error ? error.message : "Unable to load gigs right now.");
          setGigs([]);
          setLoadingGigs(false);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGigs();

    return () => { 
      isMounted = false; 
    };
  }, []);

  // --- GROQ API HELPER ---
  const callGroqVetting = async (level: "simple" | "intermediate" | "high") => {
    let retries = 5;
    let delay = 1000;

    while (retries > 0) {
      try {
        const response = await fetch('/api/vetting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: selectedGig?.title,
            description: selectedGig?.description,
            level,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Groq API request failed.');
        }

        return data.result?.trim() || '';
      } catch (e) {
        retries--;
        if (retries === 0) return 'AI is currently resting. Please try again later.';
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }
    }

    return '';
  };

  // --- AI FEATURE 1: Smart Matchmaker ---
  const handleAIMatch = async () => {
    if (!searchQuery.trim()) return;
    setIsMatching(true);
    setAiMatchResult("");
    
    const prompt = `A user is searching for: "${searchQuery}". 
    Our platform offers: Legal, IT & Tech, Clearance (Gov/Customs), and Consulting. 
    Write a 2-sentence friendly recommendation advising them exactly which category of expert(s) they should hire to achieve this goal and why. Be direct and actionable.`;
    
    const result = await callGemini(prompt);
    setAiMatchResult(result);
    setIsMatching(false);
  };

  // --- AI FEATURE 2: Generate Interview Questions ---
  const handleGenerateQuestions = async () => {
    if (!selectedGig) return;
    setIsGeneratingQuestions(true);

    const result = await callGroqVetting(questionLevel);
    setInterviewQuestions(result);
    setIsGeneratingQuestions(false);
  };

  const handleSendQuestionsToSeller = async () => {
    if (!selectedGig || !interviewQuestions.trim()) return;

    const questionsOnly = interviewQuestions
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^\d+\./.test(line))
      .join('\n');

    const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const PROJECT_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    try {
      let client = (window as any).globalSupabaseClient;
      if (!client) {
        client = createClient(PROJECT_URL, PROJECT_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storage: typeof window !== 'undefined' ? window.localStorage : undefined
          }
        });
        (window as any).globalSupabaseClient = client;
      }

      const { data: { session } } = await client.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }

      const currentUser = session.user;
      const payload = {
        sender_id: currentUser.id,
        receiver_id: selectedGig.seller_id,
        content: questionsOnly || interviewQuestions,
        sender_name: currentUser.user_metadata?.first_name
          ? `${currentUser.user_metadata.first_name} ${currentUser.user_metadata.last_name || ''}`.trim()
          : "SkillSouq Member",
        sender_avatar: currentUser.user_metadata?.avatar_url || null,
        receiver_name: selectedGig.seller_name || null,
        receiver_avatar: selectedGig.seller_avatar || null,
        file_url: null,
        file_name: null,
        file_size: null,
        file_type: null
      };

      const { error } = await client.from('messages').insert([payload]);
      if (error) throw error;

      window.location.href = `/messages?to=${selectedGig.seller_id}&name=${encodeURIComponent(selectedGig.seller_name || 'Professional')}`;
    } catch (err: any) {
      alert("Failed to send questions: " + (err?.message || String(err)));
    }
  };

  const closeGigModal = () => {
    setSelectedGig(null);
    setInterviewQuestions("");
  };

  const handleCheckout = async () => {
    if (!selectedGig) return;

    const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const PROJECT_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    try {
      let client = (window as any).globalSupabaseClient;
      if (!client) {
        client = createClient(PROJECT_URL, PROJECT_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storage: typeof window !== 'undefined' ? window.localStorage : undefined
          }
        });
        (window as any).globalSupabaseClient = client;
      }

      const { data: { session } } = await client.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }

      const currentUser = session.user;
      if (selectedGig.seller_id === currentUser.id) {
        alert("You cannot hire yourself!");
        return;
      }

      setIsCheckingOut(true);
      try {
        const payload = {
          gig_id: selectedGig.id,
          buyer_id: currentUser.id,
          seller_id: selectedGig.seller_id,
          title: selectedGig.title,
          price: selectedGig.price,
          status: 'in_progress'
        };

        const { error } = await client.from('orders').insert([payload]);
        if (error) throw error;

        // 👉 Send Notification to the Seller
        await client.from('notifications').insert([{
          user_id: selectedGig.seller_id,
          title: "🎉 New Order Received!",
          message: `${currentUser.user_metadata?.first_name || 'A client'} just hired you for ${selectedGig.title}.`,
          type: "order",
          link: "/seller-dashboard"
        }]);

        window.location.href = "/buyer-dashboard";
      } catch (err: any) {
        alert("Checkout failed: " + (err?.message || String(err)));
      } finally {
        setIsCheckingOut(false);
      }
    } catch (err) {
      console.error('Checkout init error', err);
      setIsCheckingOut(false);
    }
  };

  const filteredGigs = gigs.filter((gig) => {
    const matchesFilter = activeCategory === "All Services" || gig.category === activeCategory;
    const matchesSearch = gig.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (gig.description && gig.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const renderDescription = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => {
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-black text-zinc-900 dark:text-white mt-6 mb-3">{line.replace('### ', '')}</h3>;
      }
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <p key={index} className="text-zinc-600 dark:text-zinc-300 font-medium mb-2 leading-relaxed text-sm">
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <span key={i} className="font-black text-zinc-900 dark:text-white">{part.replace(/\*\*/g, '')}</span>;
              }
              return part;
            })}
          </p>
        );
      }
      if (line.trim() === '') return <div key={index} className="h-2"></div>;
      return <p key={index} className="text-zinc-600 dark:text-zinc-300 font-medium mb-2 leading-relaxed text-sm">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 font-sans pb-32">
      
      {/* --- SELECTED GIG MODAL --- */}
      {selectedGig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm" 
            onClick={closeGigModal}
          ></div>
          
          <div className="relative bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto md:overflow-hidden flex flex-col md:flex-row z-10 animate-in zoom-in-95 duration-300">
            <button 
              onClick={closeGigModal} 
              className="absolute top-4 right-4 md:right-4 p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Side: Details */}
            <div className="order-1 flex-1 p-8 md:p-12 overflow-y-auto border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 no-scrollbar">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest">{selectedGig.category} Service</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-900 dark:text-white mb-6 leading-tight">
                {selectedGig.title}
              </h1>

              <div className="flex items-center gap-4 py-4 border-y border-zinc-100 dark:border-zinc-800 mb-8">
                <img 
                  src={selectedGig.seller_avatar || `https://api.dicebear.com/9.x/glass/svg?seed=${selectedGig.seller_id || selectedGig.id}&backgroundColor=1d4ed8`} 
                  alt="Seller Profile" 
                  className="w-12 h-12 rounded-full border-2 border-white dark:border-zinc-950 shadow-md bg-zinc-100 shrink-0" 
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-zinc-900 dark:text-white text-sm">
                      {selectedGig.seller_name || (selectedGig.category === 'Legal' ? 'Legal Advisor' : selectedGig.category === 'IT & Tech' ? 'Tech Specialist' : selectedGig.category === 'Clearance' ? 'Clearance Agency' : 'Verified Partner')}
                    </p>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium text-zinc-500 mt-0.5">
                    <span className="flex items-center gap-1 text-amber-500 font-bold"><Star className="w-3 h-3 fill-amber-500" /> 5.0</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Bahrain</span>
                  </div>
                  {selectedGig.seller_id && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        Seller ID: {selectedGig.seller_id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopySellerId(selectedGig.seller_id)}
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Copy seller ID"
                      >
                        {copiedSellerId === selectedGig.seller_id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedSellerId === selectedGig.seller_id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="prose prose-zinc dark:prose-invert max-w-none">
                {renderDescription(selectedGig.description)}
              </div>
            </div>

            {/* Right Side: Sticky Checkout / AI Actions */}
            <div className="order-2 w-full md:w-[400px] bg-zinc-50 dark:bg-zinc-900/50 p-8 md:p-10 flex flex-col shrink-0 overflow-y-auto no-scrollbar">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Starting Project Fee</p>
                <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-8">
                  BHD {selectedGig.price}
                </h2>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    <Clock className="w-4 h-4 text-blue-600" /> Standard Delivery
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Secure Payment Protection
                  </div>
                </div>
              </div>

              {/* AI Interview Questions Feature */}
              <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-3xl p-5 mb-8">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-black text-purple-900 dark:text-purple-100 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-purple-600" /> Expert Vetting
                  </h4>
                </div>
                <p className="text-xs font-medium text-purple-700/80 dark:text-purple-300/80 mb-4 leading-relaxed">
                  Not sure what to ask before hiring? Let AI generate 3 crucial interview questions based on this expert's profile.
                </p>

                <div className="flex items-center gap-2 mb-4">
                  {(["simple", "intermediate", "high"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setQuestionLevel(level)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${
                        questionLevel === level
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white dark:bg-zinc-950 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-900/50 hover:bg-purple-100 dark:hover:bg-purple-900/20'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                
                {interviewQuestions ? (
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed border border-purple-100 dark:border-purple-900/50">
                      {interviewQuestions.split('\n').map((q, i) => (
                        <p key={i} className="mb-2 last:mb-0">{q}</p>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleGenerateQuestions}
                        disabled={isGeneratingQuestions}
                        className="w-full flex items-center justify-center bg-white dark:bg-zinc-950 border border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-200 text-xs font-bold rounded-xl h-10 transition-all disabled:opacity-70"
                      >
                        {isGeneratingQuestions ? <Loader2 className="w-4 h-4 animate-spin" /> : "Regenerate"}
                      </button>
                      <button
                        onClick={handleSendQuestionsToSeller}
                        className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl h-10 shadow-lg shadow-purple-600/20 transition-all"
                      >
                        Send to Seller
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleGenerateQuestions} 
                    disabled={isGeneratingQuestions}
                    className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl h-10 shadow-lg shadow-purple-600/20 transition-all disabled:opacity-70"
                  >
                    {isGeneratingQuestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2" /> ✨ Generate Questions</>}
                  </button>
                )}
              </div>

              <div className="space-y-3 mt-auto">
                <button 
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-base shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center"
                >
                  {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  {isCheckingOut ? "Securing Funds..." : (
                    (selectedGig.category === 'Legal' || selectedGig.category === 'Consulting') 
                      ? "Book Consultation" 
                      : "Proceed to Hire"
                  )}
                </button>
                <button 
                  onClick={() => window.location.href = `/messages?to=${selectedGig.seller_id}&name=${encodeURIComponent(selectedGig.seller_name || 'Professional')}`}
                  className="w-full h-14 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 font-bold flex items-center justify-center gap-2 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> Message Seller
                </button>
                <p className="text-center text-[10px] text-zinc-400 font-bold mt-4 uppercase tracking-widest">
                  Funds held securely until approval
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- PAGE HEADER (Fixed Spacing) --- */}
      <div className="pt-20 md:pt-32 pb-16 px-6 relative z-10 text-center border-b border-zinc-100 dark:border-zinc-900">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white mb-6 leading-tight">
          Find Elite Talent in Bahrain.
        </h1>
        <p className="text-lg text-zinc-500 font-medium max-w-2xl mx-auto mb-12">
          Hire verified lawyers, developers, clearance agencies, and top-tier consultants instantly.
        </p>
        
        {/* Search Bar & AI Matchmaker */}
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-1.5 focus-within:ring-4 ring-blue-600/10 transition-all">
            <Search className="w-5 h-5 text-zinc-400 ml-4 shrink-0" />
            <input 
              type="text"
              placeholder="What do you need? (e.g., 'Need someone to build an app for my cafe')" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 md:h-14 bg-transparent border-none outline-none px-4 text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400"
            />
            <button 
              onClick={handleAIMatch}
              disabled={isMatching || !searchQuery.trim()}
              className="h-12 md:h-14 px-6 md:px-8 bg-blue-600 text-white font-black rounded-full hover:bg-blue-700 transition-all flex items-center gap-2 shrink-0 disabled:opacity-70"
            >
              {isMatching ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5" /> ✨ AI Match</>}
            </button>
          </div>

          {/* AI Match Result Display */}
          {aiMatchResult && (
            <div className="bg-blue-50/80 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-5 text-left animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-black text-blue-900 dark:text-blue-100 mb-1">AI Recommendation</h4>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 leading-relaxed">
                    {aiMatchResult}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-10">
        
        {/* --- FILTERS --- */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-6 mb-4">
          <span className="text-xs font-black uppercase tracking-widest text-zinc-400 mr-2 shrink-0">Filter</span>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full whitespace-nowrap font-black text-sm transition-all border ${
                activeCategory === cat.id 
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-md' 
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              {cat.icon && <cat.icon className="w-4 h-4" />}
              {cat.label}
            </button>
          ))}
        </div>

        {/* --- GRID & ERROR HANDLING --- */}
        {loadingGigs ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <p className="text-sm font-bold text-zinc-400 tracking-widest uppercase animate-pulse">Loading Elite Talent...</p>
          </div>
        ) : fetchError ? (
          <div className="text-center py-20 bg-red-50 dark:bg-red-900/10 rounded-[3rem] border border-red-100 dark:border-red-900/30">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-red-900 dark:text-red-400 mb-2">Database Connection Error</h3>
            <p className="text-red-700/80 dark:text-red-400/80 font-medium text-sm max-w-md mx-auto">
              {errorMessage || "We couldn't load gigs right now. Please try again shortly."}
            </p>
          </div>
        ) : filteredGigs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {filteredGigs.map((gig) => (
              
              <div 
                key={gig.id} 
                onClick={() => setSelectedGig(gig)}
                className="group cursor-pointer bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:border-blue-200 transition-all duration-300 flex flex-col"
              >
                {/* 🌟 BEAUTIFUL IMAGE HEADER */}
                <div
                  className="h-40 md:h-48 bg-zinc-100 dark:bg-zinc-800 relative bg-cover bg-center shrink-0 border-b border-zinc-100 dark:border-zinc-800"
                  style={{ backgroundImage: `url(${gig.media_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800'})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  
                  <div className="absolute top-4 left-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-black text-zinc-900 dark:text-white shadow-sm">
                     <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> 5.0
                  </div>
                  <div className="absolute top-4 right-4 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 px-3 py-1.5 rounded-full flex items-center gap-1 text-[10px] font-black uppercase tracking-widest shadow-sm">
                     <ShieldCheck className="w-3.5 h-3.5" /> Verified
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  {/* SELLER PROFILE HEADER - NOW CLICKABLE! */}
                  <div 
                    className="flex items-center gap-2.5 mb-4 group/profile cursor-pointer inline-flex w-max"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents opening the gig modal
                      window.location.href = `/profile/${gig.seller_id}`;
                    }}
                  >
                    <img 
                      src={gig.seller_avatar || `https://api.dicebear.com/9.x/glass/svg?seed=${gig.seller_id || gig.id}&backgroundColor=1d4ed8`} 
                      alt="Seller" 
                      className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 shrink-0 group-hover/profile:ring-2 ring-blue-500 transition-all"
                    />
                    <p className="text-sm font-black text-zinc-700 dark:text-zinc-300 line-clamp-1 group-hover/profile:text-blue-600 transition-colors">
                      {gig.seller_name || (gig.category === 'Legal' ? 'Legal Advisor' : gig.category === 'IT & Tech' ? 'Tech Specialist' : gig.category === 'Clearance' ? 'Clearance Agency' : 'Verified Partner')}
                    </p>
                  </div>

                  <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-3 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                    {gig.title}
                  </h3>
                  
                  <p className="text-sm font-medium text-zinc-500 mb-8 line-clamp-2 flex-1">
                    {gig?.description?.replace(/[*#]/g, '') || "Premium Service"}
                  </p>

                  <div className="flex items-end justify-between mt-auto pt-5 border-t border-zinc-100 dark:border-zinc-800">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Starting at</p>
                      <p className="text-xl font-black text-zinc-900 dark:text-white">BHD {gig.price}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all transform group-hover:-rotate-45">
                       <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 border-dashed">
            <Search className="w-10 h-10 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">No services found</h3>
            <p className="text-zinc-500 font-medium text-sm">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>
    </div>
  );
}