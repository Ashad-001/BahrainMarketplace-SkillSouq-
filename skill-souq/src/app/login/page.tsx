"use client";

import { useState, useEffect } from "react";
import { createClient } from '@/utils/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShieldCheck, Mail, Lock, Loader2, AlertCircle, 
  User, Phone, Camera, Briefcase, ShoppingBag, Building2, 
  CheckCircle2, ChevronRight, Sparkles
} from "lucide-react";

/**
 * SKILL SOUQ - Elite Multi-Step Onboarding
 * Now equipped with Metadata Saving & Dynamic Dashboard Routing!
 * Updated to use npm Supabase package for reliability.
 */
export default function LoginPage() {
  const [step, setStep] = useState(0);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [supabase, setSupabase] = useState<any>(null);
  const [waitingForEmail, setWaitingForEmail] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        console.log("🔧 Login: Initializing Supabase with SSR cookie persistence...");
        const client = createClient();
        setSupabase(client);
        
        const { data: { session } } = await client.auth.getSession();
        if (session) {
          console.log("📋 Login: User already logged in");
          setEmail(session.user.email || "");
          // Check if they already have metadata
          if (session.user.user_metadata?.role) {
            // They are fully onboarded, send them to their dashboard
            console.log("✅ Login: User fully onboarded, redirecting to dashboard");
            redirectUser(session.user.user_metadata.role);
          } else {
            // They need to finish setup
            console.log("⚠️ Login: User needs to finish setup");
            setStep(1); 
          }
        }
      } catch (err) {
        console.error("❌ Login init error:", err);
      }
    };
    init();
  }, []);

  const redirectUser = (userRole: string) => {
    if (userRole === 'client') {
      window.location.href = "/marketplace"; // The browsing world
    } else {
      window.location.href = "/seller-dashboard"; // The seller world
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        
        // Check if fully onboarded
        if (data.user?.user_metadata?.role) {
           redirectUser(data.user.user_metadata.role);
        } else {
           setStep(1); // Force onboarding
        }
      } else {
        const { data, error: err } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: window.location.origin }
        });
        if (err) throw err;
        
        // 🌟 THE STRICT BOUNCER: 
        // If a user is created, but Supabase refuses to give them a session, 
        // it means Confirm Email is ON and working. Stop them here!
        if (data.user && !data.session) {
          setWaitingForEmail(true);
          return; // Stops the code from redirecting them to the home page
        }
        
        setSuccess("Check your email to verify your account!");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    setGoogleLoading(true);
    setError("");

    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });
      if (err) throw err;
    } catch (err: any) {
      setError("Google Auth Error: Check your Supabase configuration.");
      setGoogleLoading(false);
    }
  };

  // --- THE NEW METADATA SAVER ---
  const finalizeOnboarding = async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");

    try {
      // Save all answers to the user's secure token
      const { error: err } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          role: role,
          interests: interests
        }
      });

      if (err) throw err;
      
      // Move to Welcome Screen
      setStep(4);
    } catch (err: any) {
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);
  const toggleInterest = (id: string) => setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const renderProgress = () => {
    if (step === 0 || step === 4) return null;
    return (
      <div className="flex gap-2 mb-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-all duration-700 ${step >= s ? 'bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)]' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden font-sans">
      
      {/* 🌟 EMAIL VERIFICATION WAITING SCREEN */}
      {waitingForEmail && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 text-center fixed inset-0 z-50">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
            <span className="text-blue-600 text-3xl">📧</span>
          </div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-2">Check Your Email</h2>
          <p className="text-zinc-500 font-medium max-w-md mb-8">
            We just sent a confirmation link to your email. You must click it to activate your account and enter the marketplace.
          </p>
          <p className="text-xs text-blue-600 font-bold uppercase tracking-widest animate-pulse">
            Waiting for confirmation...
          </p>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(50px, -70px) scale(1.2); }
          66% { transform: translate(-30px, 40px) scale(0.8); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 10s infinite cubic-bezier(0.4, 0, 0.2, 1); }
        .delay-2000 { animation-delay: 2s; }
        .delay-4000 { animation-delay: 4s; }
      `}} />

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px] animate-blob" />
        <div className="absolute top-[10%] -right-[10%] w-[50%] h-[50%] bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-[120px] animate-blob delay-2000" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-emerald-400/20 dark:bg-emerald-600/10 rounded-full blur-[120px] animate-blob delay-4000" />
      </div>
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-3xl rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white/40 dark:border-zinc-800/50 p-8 md:p-12 relative overflow-hidden">
          
          {renderProgress()}

          {step === 0 && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl mb-6 shadow-2xl shadow-blue-500/30">
                  <span className="text-white font-black text-3xl">S</span>
                </div>
                <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white mb-3">
                  {isLogin ? "Welcome back" : "Join the Souq"}
                </h1>
                <p className="text-zinc-500 text-sm font-medium">Enter the Kingdom's elite professional network.</p>
              </div>

              <div className="space-y-4">
                <Button onClick={handleGoogleLogin} disabled={googleLoading} variant="outline" className="w-full h-14 rounded-2xl border-zinc-200 dark:border-zinc-800 font-bold flex gap-3 bg-white/50 dark:bg-zinc-800/50 hover:bg-white transition-all disabled:opacity-50">
                  {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">or email</span>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="pl-12 h-14 rounded-2xl bg-white/50 border-zinc-200 font-medium" />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                    <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-12 h-14 rounded-2xl bg-white/50 border-zinc-200 font-medium" />
                  </div>
                  {error && <p className="text-xs text-red-600 font-bold px-2">{error}</p>}
                  {success && <p className="text-xs text-emerald-600 font-bold px-2">{success}</p>}
                  <Button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black shadow-2xl mt-4">
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (isLogin ? "Sign In" : "Create Account")}
                  </Button>
                </form>

                <div className="text-center mt-6">
                  <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-bold text-zinc-500 hover:text-blue-600 transition-colors">
                    {isLogin ? "New to Skill Souq? " : "Already have an account? "} <span className="text-blue-600 underline underline-offset-4">{isLogin ? "Join now" : "Log in"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="animate-in slide-in-from-right-8 duration-500">
              <h2 className="text-3xl font-black tracking-tight mb-2">Profile Identity</h2>
              <p className="text-zinc-500 text-sm font-medium mb-10">Let's put a face and name to the skill.</p>
              
              <div className="flex justify-center mb-10">
                <button className="w-32 h-32 rounded-[2.5rem] bg-zinc-100 border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center hover:border-blue-600 transition-all">
                  <Camera className="w-8 h-8 text-zinc-400" />
                  <span className="text-[10px] font-black text-zinc-400 mt-2 uppercase">Add Photo</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <Input placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-14 rounded-2xl font-bold" />
                  <Input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-14 rounded-2xl font-bold" />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
                  <Input placeholder="Mobile Number (Optional)" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-12 h-14 rounded-2xl font-bold" />
                </div>
                <Button onClick={nextStep} disabled={!firstName || !lastName} className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black mt-6">
                  Next Step <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
             <div className="animate-in slide-in-from-right-8 duration-500">
               <h2 className="text-3xl font-black tracking-tight mb-2">Your Path</h2>
               <p className="text-zinc-500 text-sm font-medium mb-10">How will you empower the Kingdom?</p>
               <div className="grid gap-4 mb-10">
                 {[
                   { id: 'client', icon: ShoppingBag, label: 'I am Hiring', desc: 'Find elite Bahraini professionals.' },
                   { id: 'freelancer', icon: Briefcase, label: 'I am Selling', desc: 'Monetize your unique skills.' },
                   { id: 'business', icon: Building2, label: 'Business Hub', desc: 'Agencies and managed services.' }
                 ].map((item) => (
                   <button key={item.id} onClick={() => setRole(item.id)} className={`flex items-center gap-5 p-6 rounded-[2rem] border-2 text-left transition-all duration-500 ${role === item.id ? 'border-blue-600 bg-blue-50' : 'border-zinc-100'}`}>
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${role === item.id ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}><item.icon className="w-7 h-7" /></div>
                     <div className="flex-1">
                       <p className={`font-black text-base ${role === item.id ? 'text-blue-600' : 'text-zinc-900'}`}>{item.label}</p>
                       <p className="text-[11px] text-zinc-500 font-bold uppercase">{item.desc}</p>
                     </div>
                   </button>
                 ))}
               </div>
               <div className="flex gap-4">
                 <Button variant="outline" onClick={prevStep} className="h-14 flex-1 rounded-2xl font-bold">Back</Button>
                 <Button onClick={nextStep} disabled={!role} className="h-14 flex-[2] rounded-2xl bg-blue-600 text-white font-black">Continue</Button>
               </div>
             </div>
          )}

          {step === 3 && (
            <div className="animate-in slide-in-from-right-8 duration-500">
              <h2 className="text-3xl font-black tracking-tight mb-2">Elite Categories</h2>
              <p className="text-zinc-500 text-sm font-medium mb-10">Select your specialized domains.</p>
              <div className="grid grid-cols-2 gap-4 mb-10">
                {['Legal', 'IT & Tech', 'Marketing', 'Finance', 'Logistics', 'Consulting'].map((cat) => (
                  <button key={cat} onClick={() => toggleInterest(cat)} className={`px-6 py-5 rounded-[1.8rem] border-2 text-xs font-black transition-all ${interests.includes(cat) ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-100 text-zinc-500'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={prevStep} className="h-14 flex-1 rounded-2xl font-bold">Back</Button>
                {/* Changed this button to trigger the saving function! */}
                <Button onClick={finalizeOnboarding} disabled={loading} className="h-14 flex-[2] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save & Finalize"}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-4 animate-in zoom-in duration-1000">
              <div className="w-32 h-32 mx-auto bg-emerald-100 rounded-[3rem] flex items-center justify-center mb-10">
                <CheckCircle2 className="w-16 h-16 text-emerald-600" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter mb-4">Profile Secured.</h1>
              <p className="text-zinc-500 text-base font-medium mb-12">Welcome home, <span className="font-black text-zinc-900">{firstName}</span>. You are registered as a <span className="text-blue-600 font-bold uppercase">{role}</span>.</p>
              <Button onClick={() => redirectUser(role!)} className="w-full h-16 rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-lg font-black shadow-2xl">
                Enter Your Dashboard
              </Button>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}