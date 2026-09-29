"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { 
  Search, ShieldCheck, Sparkles, Loader2, X, Bot, ArrowRight, 
  CheckCircle2, Briefcase, FileText, Code, Scale, Star, MapPin,
  Building2, BarChart3, ChevronRight, ShoppingBag
} from "lucide-react";
 
interface SouqBotResponse {
  greeting: string;
  categories: string[];
  projectBrief: string;
}

type SouqBotMessage = {
  role: "user" | "ai";
  text: string;
};

// Dummy data for our marketplace
const categories = [
  { title: "Document Clearance", icon: <FileText className="w-6 h-6" />, desc: "CR setup, LMRA, and Gov services", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { title: "Legal & PRO", icon: <Scale className="w-6 h-6" />, desc: "Contracts, NDAs, and corporate law", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { title: "Tech & IT", icon: <Code className="w-6 h-6" />, desc: "Web dev, apps, and IT support", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { title: "Business Consulting", icon: <Briefcase className="w-6 h-6" />, desc: "Feasibility studies and strategy", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
];

const topFreelancers = [
  { name: "Ahmed Al-Farsi", role: "Elite Document Clearer", rating: 4.9, reviews: 124, price: "From 50 BHD", tag: "CR Expert" },
  { name: "Sarah Mansoor", role: "Corporate Lawyer", rating: 5.0, reviews: 89, price: "From 120 BHD", tag: "Verified" },
  { name: "TechBahrain Agency", role: "Full Stack Development", rating: 4.8, reviews: 210, price: "From 300 BHD", tag: "Agency" },
];

export default function Home() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    let authSubscription: any;
    const client = createClient();

    const checkSetup = async () => {
      try {
        const { data: { session } } = await client.auth.getSession();
        const user = session?.user;
        if (!user) return;
        setCurrentUser(user);

        const { data: profile, error: profileError } = await client
          .from('profiles')
          .select('setup_complete, role, interests')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const legacyOnboardingComplete = Boolean(
          profile?.role ||
          (Array.isArray(profile?.interests) && profile.interests.length > 0) ||
          user.user_metadata?.role ||
          (Array.isArray(user.user_metadata?.interests) && user.user_metadata.interests.length > 0)
        );

        if (!profile?.setup_complete && !legacyOnboardingComplete) {
          setShowOnboarding(true);
        } else {
          setShowOnboarding(false);
        }
      } catch (err) {
        console.error('Onboarding check failed', err);
      }
    };

    const attachAuthListener = () => {
      const { data: { subscription } } = client.auth.onAuthStateChange((_event: any, session: any) => {
        if (session?.user) {
          setCurrentUser(session.user);
          checkSetup();
        } else {
          setCurrentUser(null);
          setShowOnboarding(false);
        }
      });

      authSubscription = subscription;
    };

    attachAuthListener();

    return () => {
      authSubscription?.unsubscribe?.();
    };
  }, []);

  // remove lazy import — we'll inline the modal below to avoid import issues

  const [isAiMode, setIsAiMode] = useState(false);
  
  // 1. 🧠 THE MEMORY FIX (Check cache before starting)
  const [messages, setMessages] = useState<SouqBotMessage[]>(() => {
    // Only run this if we are on the client side (browser)
    if (typeof window !== "undefined") {
      const savedChat = localStorage.getItem("souqbot_history");
      if (savedChat) return JSON.parse(savedChat);
    }
    // Default start if no history exists
    return [{ role: "ai", text: "Hello! Welcome to SkillSouq. What do you need help with today? Do you need to hire an expert for a specific task?" }];
  });

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // 💾 Auto-save the chat to browser cache every time messages change
  useEffect(() => {
    localStorage.setItem("souqbot_history", JSON.stringify(messages));
  }, [messages]);

  // 2. 🛑 THE SCROLL GLITCH FIX
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Adding `block: 'nearest'` strictly tells the browser: 
    // "Scroll the chat box ONLY, do not move the main website!"
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userText = inputValue.trim();
    // Add user message to history
    setMessages((prev: SouqBotMessage[]) => [...prev, { role: "user", text: userText }]);
    setInputValue(""); // Clear input box
    setIsTyping(true); // Start the bouncing dots

    try {
      // Call your secure Groq backend
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      
      const data = await response.json();
      
      // Add AI reply to history
      setMessages((prev: SouqBotMessage[]) => [...prev, { role: "ai", text: data.reply }]);
    } catch (e) {
      setMessages((prev: SouqBotMessage[]) => [...prev, { role: "ai", text: "My servers are taking a quick break. Please try again!" }]);
    } finally {
      setIsTyping(false); // Stop typing animation
    }
  };

  return (
    <main className="w-full bg-white dark:bg-zinc-950 pt-12 md:pt-0">

      {/* 🌟 THE ONBOARDING OVERLAY */}
      {showOnboarding && currentUser && (
        <OnboardingModal 
          user={currentUser} 
          supabase={(window as any).globalSupabaseClient}
          onComplete={() => setShowOnboarding(false)} 
        />
      )}

      {/* ================= HERO SECTION ================= */}
      <section className="relative min-h-0 md:min-h-[calc(100vh-80px)] flex flex-col items-center justify-start md:justify-center pt-0 md:pt-6 p-6 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute inset-0 z-0 bg-white dark:bg-zinc-950 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,transparent_20%,black_100%)]"></div>

        <div className="relative z-10 max-w-5xl w-full text-center space-y-10 mt-4 md:mt-[-5vh] px-4 md:px-0">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/50 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Verified Bahraini CRs & Freelancers</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight leading-tight text-zinc-900 dark:text-white transition-all duration-500 px-2">
            {isAiMode ? (
              <>Let <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">SouqBot</span> guide you.</>
            ) : (
              <>Find the perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">expert</span><br className="hidden md:block" /> for your business.</>
            )}
          </h1>

          <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto font-medium transition-all duration-500">
            {isAiMode 
              ? "Describe your business challenge, and our AI will instantly match you with the right services and draft your project requirements."
              : "The ultimate marketplace for Document Clearance, Legal Counsel, Design, and IT solutions in the Kingdom of Bahrain."}
          </p>

          <div className="max-w-3xl mx-auto w-full transition-all duration-500">
            {!isAiMode ? (
              <div className="space-y-6">
                <div className="md:hidden relative w-full max-w-md mx-auto mt-6">
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <Input 
                    type="text" 
                    placeholder="Try 'CR Renewal' or 'App Dev'" 
                    className="w-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-full py-4 pl-12 pr-[90px] focus:outline-none focus:border-zinc-300 dark:focus:border-zinc-600 text-sm md:text-base shadow-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                  />
                  <button className="absolute right-1.5 top-1.5 bottom-1.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold rounded-full px-5 text-sm transition hover:bg-zinc-800 dark:hover:bg-zinc-100">
                    Search
                  </button>
                </div>

                <div className="hidden md:flex items-center bg-white dark:bg-zinc-900 p-2 rounded-full shadow-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="pl-4 pr-2 text-zinc-400"><Search className="w-6 h-6" /></div>
                  <Input type="text" placeholder="Try 'CR Renewal' or 'App Developer'..." className="border-0 shadow-none focus-visible:ring-0 text-lg h-12 bg-transparent w-full text-zinc-900 dark:text-white placeholder:text-zinc-400 pr-24" />
                  <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-8 h-12 text-lg shrink-0 dark:bg-white dark:text-zinc-900">Search</Button>
                </div>
                
                <div className="md:hidden mt-4 flex items-center justify-center">
                  <Button onClick={() => setIsAiMode(true)} variant="outline" className="rounded-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors">
                    <Sparkles className="w-4 h-4 mr-2" /> Not sure what you need? ✨ Ask SouqBot
                  </Button>
                </div>

                <div className="hidden md:flex items-center justify-center mt-4">
                  <Button onClick={() => setIsAiMode(true)} variant="outline" className="rounded-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 transition-colors">
                    <Sparkles className="w-4 h-4 mr-2" /> Not sure what you need? ✨ Ask SouqBot
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 text-left transform transition-all animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold"><Bot className="w-5 h-5" /><span>SouqBot AI Assistant</span></div>
                  <Button variant="ghost" size="icon" onClick={() => setIsAiMode(false)} className="rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><X className="w-5 h-5" /></Button>
                </div>

                {/* --- DYNAMIC CHAT HISTORY AREA --- */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col h-[320px] mb-6 shadow-inner overflow-hidden">
                  
                  {/* 1. Scrollable Message List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-zinc-50/50 dark:bg-zinc-900/50">
                    {messages.map((msg: SouqBotMessage, idx: number) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 text-sm font-medium leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl rounded-tr-sm shadow-sm' 
                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border border-blue-100 dark:border-blue-800/30 rounded-2xl rounded-tl-sm'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    
                    {/* 2. Typing Indicator (Bouncing Dots) */}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-4 rounded-2xl rounded-tl-sm flex gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    {/* Invisible div to anchor the auto-scroll */}
                    <div ref={chatEndRef} />
                  </div>

                  {/* 3. The Input Bar */}
                  <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 relative flex items-center">
                    <input 
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault(); // Stops the website jump!
                          handleSendMessage();
                        }
                      }}
                      placeholder="Ask SouqBot to find an expert..."
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none text-sm rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isTyping}
                      className="absolute right-4 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors"
                    >
                      {/* Simple Send Icon */}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>

                </div>
                {/* --- END DYNAMIC CHAT HISTORY AREA --- */}
              </div>
            )}
          </div>

          {!isAiMode && (
            <>
              <style>{`
                @keyframes scrollRight {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-100%); }
                }
                .scroll-carousel {
                  animation: scrollRight 25s linear infinite;
                }
              `}</style>
              <div className="md:hidden mt-4 w-full">
                <div className="text-center mb-3">
                  <span className="text-gray-500 dark:text-zinc-400 text-sm font-medium">Popular right now:</span>
                </div>
                <div className="relative overflow-hidden">
                  <div className="flex gap-3 scroll-carousel">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs px-4 py-2 rounded-lg shadow-sm whitespace-nowrap flex-shrink-0">CR Registration</div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs px-4 py-2 rounded-lg shadow-sm whitespace-nowrap flex-shrink-0">LMRA Visas</div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs px-4 py-2 rounded-lg shadow-sm whitespace-nowrap flex-shrink-0">Web Development</div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs px-4 py-2 rounded-lg shadow-sm whitespace-nowrap flex-shrink-0">Legal Contracts</div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs px-4 py-2 rounded-lg shadow-sm whitespace-nowrap flex-shrink-0">CR Registration</div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs px-4 py-2 rounded-lg shadow-sm whitespace-nowrap flex-shrink-0">LMRA Visas</div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs px-4 py-2 rounded-lg shadow-sm whitespace-nowrap flex-shrink-0">Web Development</div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs px-4 py-2 rounded-lg shadow-sm whitespace-nowrap flex-shrink-0">Legal Contracts</div>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex items-center justify-center gap-3 pt-4">
                <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mr-2">Popular right now:</span>
                <Badge variant="secondary" className="hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer rounded-full px-4 py-1 text-sm font-normal">CR Registration</Badge>
                <Badge variant="secondary" className="hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer rounded-full px-4 py-1 text-sm font-normal">LMRA Visas</Badge>
                <Badge variant="secondary" className="hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer rounded-full px-4 py-1 text-sm font-normal">Web Development</Badge>
                <Badge variant="secondary" className="hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer rounded-full px-4 py-1 text-sm font-normal">Legal Contracts</Badge>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ================= CATEGORIES SECTION ================= */}
      <section className="pt-2 pb-16 md:py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-12 px-6">
          <div className="max-w-md">
            <h2 className="text-3xl md:text-4xl font-bold mb-2 text-zinc-900 dark:text-white">Explore Business Services</h2>
            <p className="text-gray-400 text-sm md:text-base">Find experts to handle your specific needs.</p>
          </div>
          <a href="/categories" className="text-blue-600 font-medium text-sm hover:underline self-start md:self-auto">
            View All Categories →
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, i) => (
            <div key={i} className="group cursor-pointer bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900 transition-all duration-300">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${cat.color}`}>
                {cat.icon}
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{cat.title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{cat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= TOP FREELANCERS SECTION ================= */}
      <section className="py-24 px-6 mb-20 bg-zinc-50 dark:bg-zinc-900/40 rounded-t-[3rem]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Top Rated Locals</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">Work with the best talent in Bahrain.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {topFreelancers.map((freelancer, i) => (
              <div key={i} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center text-xl font-bold text-blue-700 dark:text-blue-400 border-2 border-white dark:border-zinc-950 shadow-sm">
                      {freelancer.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-white text-lg leading-tight">{freelancer.name}</h4>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">{freelancer.role}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-6 text-sm font-medium">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span className="text-zinc-900 dark:text-white">{freelancer.rating}</span>
                  <span className="text-zinc-400">({freelancer.reviews} reviews)</span>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
                  <div className="font-semibold text-zinc-900 dark:text-white">
                    {freelancer.price}
                  </div>
                  <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 rounded-full font-medium">
                    {freelancer.tag}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <Button variant="outline" className="rounded-full px-8 h-12 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950">
              Show more professionals
            </Button>
          </div>
        </div>
      </section>

    </main>
  );
}

// Inline Onboarding Modal (placed outside of LandingPage component)
function OnboardingModal({ user, onComplete, supabase }: { user: any, onComplete: () => void, supabase: any }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'client', title: 'I want to hire', desc: 'Find elite experts in Bahrain', icon: ShoppingBag },
    { id: 'freelancer', title: 'I want to work', desc: 'Offer my professional services', icon: Briefcase },
    { id: 'agency', title: 'We are an Agency', desc: 'Manage a team of professionals', icon: Building2 },
  ];

  const categories = [
    { id: 'Legal', icon: Scale },
    { id: 'IT & Tech', icon: Code },
    { id: 'Consulting', icon: BarChart3 },
    { id: 'Clearance', icon: FileText }
  ];

  const toggleInterest = (id: string) => {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleFinish = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const profilePayload = {
        id: user.id,
        role: role,
        interests: interests,
        setup_complete: true,
        updated_at: new Date().toISOString()
      };

      const { data: existingProfile, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (lookupError) throw lookupError;

      const mutation = existingProfile
        ? await supabase.from('profiles').update(profilePayload).eq('id', user.id)
        : await supabase.from('profiles').insert(profilePayload);

      if (mutation.error) throw mutation.error;
      onComplete();
    } catch (err) {
      console.error("Onboarding completion failed:", err);
      alert("Something went wrong during setup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xl animate-in fade-in duration-300">
      {/* 🌟 PREMIUM GLASS CONTAINER */}
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md w-full max-w-xl rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.1)] dark:shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/20 dark:border-zinc-800 p-8 md:p-12 relative overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Sleek Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 1 ? 'w-8 bg-blue-600' : 'w-2 bg-zinc-200 dark:bg-zinc-800'}`} />
          <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 2 ? 'w-8 bg-blue-600' : 'w-2 bg-zinc-200 dark:bg-zinc-800'}`} />
        </div>

        {/* STEP 1: ROLE */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">
                Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">SkillSouq</span>
              </h2>
              <p className="text-zinc-500 font-medium">How are you planning to use the platform?</p>
            </div>

            <div className="space-y-4">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`relative w-full group p-5 rounded-[1.5rem] border transition-all duration-300 overflow-hidden text-left flex items-center gap-5
                    ${role === r.id 
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-900/50 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-300
                    ${role === r.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-blue-500'}
                  `}>
                    <r.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-black text-lg transition-colors ${role === r.id ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-900 dark:text-white'}`}>
                      {r.title}
                    </p>
                    <p className="text-xs font-bold text-zinc-500 mt-0.5">{r.desc}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                    ${role === r.id ? 'border-blue-600 bg-blue-600' : 'border-zinc-300 dark:border-zinc-700'}
                  `}>
                    {role === r.id && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                </button>
              ))}
            </div>

            <button 
              disabled={!role}
              onClick={() => setStep(2)}
              className="w-full h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black mt-10 shadow-xl disabled:opacity-30 disabled:scale-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 2: INTERESTS */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">Tailor Your Feed</h2>
              <p className="text-zinc-500 font-medium">Select the professional categories you're interested in.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleInterest(cat.id)}
                  className={`relative p-6 rounded-[2rem] border transition-all duration-300 flex flex-col items-center justify-center gap-4 overflow-hidden group
                    ${interests.includes(cat.id) 
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-900/50 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                    }`}
                >
                  {/* Subtle active glow */}
                  {interests.includes(cat.id) && <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none" />}
                  
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                    ${interests.includes(cat.id) ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:scale-110'}
                  `}>
                    <cat.icon className="w-5 h-5" />
                  </div>
                  <span className={`font-black text-sm transition-colors ${interests.includes(cat.id) ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-900 dark:text-white'}`}>
                    {cat.id}
                  </span>
                  
                  {/* Absolute checkmark badge */}
                  {interests.includes(cat.id) && (
                    <div className="absolute top-4 right-4 text-blue-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-4 mt-10">
               <button onClick={() => setStep(1)} className="flex-1 h-14 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-2xl font-bold transition-all active:scale-95">
                 Back
               </button>
               <button 
                onClick={handleFinish}
                disabled={interests.length === 0 || loading}
                className="flex-[2] h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 disabled:opacity-30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Complete Setup"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}