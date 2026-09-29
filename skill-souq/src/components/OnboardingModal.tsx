"use client";

import { useState, useEffect } from "react";
import { 
  User, Briefcase, Building2, CheckCircle2, 
  ChevronRight, Sparkles, Scale, Laptop, 
  BarChart3, FileText, Loader2, X 
} from "lucide-react";

export default function OnboardingModal({ user, onComplete }: { user: any, onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'client', title: 'Buyer', desc: 'I want to hire experts', icon: User },
    { id: 'freelancer', title: 'Freelancer', desc: 'I want to offer services', icon: Briefcase },
    { id: 'agency', title: 'Agency / Firm', desc: 'We are a registered business', icon: Building2 },
  ];

  const categories = [
    { id: 'Legal', icon: Scale },
    { id: 'IT & Tech', icon: Laptop },
    { id: 'Consulting', icon: BarChart3 },
    { id: 'Clearance', icon: FileText }
  ];

  const toggleInterest = (id: string) => {
    setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const PROJECT_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      let client = (window as any).globalSupabaseClient;
      if (!client && (window as any).supabase) {
        client = (window as any).supabase.createClient(PROJECT_URL, PROJECT_ANON_KEY);
      }

      if (!client) throw new Error("Supabase client not initialized");

      const { error } = await client
        .from('profiles')
        .update({
          role: role,
          interests: interests,
          setup_complete: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      onComplete(); // Close the modal
    } catch (err) {
      console.error(err);
      alert("Something went wrong during setup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[3rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 p-8 md:p-12 relative overflow-hidden">
        
        {/* Step Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-100 dark:bg-zinc-800">
           <div 
             className="h-full bg-blue-600 transition-all duration-500 ease-out" 
             style={{ width: `${(step / 2) * 100}%` }}
           ></div>
        </div>

        {/* STEP 1: WELCOME & ROLE */}
        {step === 1 && (
          <div className="animate-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Welcome to SkillSouq</h2>
              <p className="text-zinc-500 font-medium mt-2">Let's personalize your experience. Who are you?</p>
            </div>

            <div className="space-y-3">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${role === r.id ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-300'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${role === r.id ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                    <r.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-zinc-900 dark:text-white">{r.title}</p>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{r.desc}</p>
                  </div>
                  {role === r.id && <CheckCircle2 className="w-6 h-6 text-blue-600" />}
                </button>
              ))}
            </div>

            <button 
              disabled={!role}
              onClick={() => setStep(2)}
              className="w-full h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black mt-10 shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              Continue <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 2: INTERESTS */}
        {step === 2 && (
          <div className="animate-in slide-in-from-right-8 duration-500">
             <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Your Interests</h2>
              <p className="text-zinc-500 font-medium mt-2">Select the categories you're interested in.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleInterest(cat.id)}
                  className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all gap-3 ${interests.includes(cat.id) ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-zinc-100 dark:border-zinc-800'}`}
                >
                  <cat.icon className={`w-8 h-8 ${interests.includes(cat.id) ? 'text-blue-600' : 'text-zinc-400'}`} />
                  <span className="font-black text-sm text-zinc-900 dark:text-white">{cat.id}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-4 mt-10">
               <button onClick={() => setStep(1)} className="flex-1 h-14 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-2xl font-bold transition-all active:scale-95">Back</button>
               <button 
                onClick={handleFinish}
                disabled={interests.length === 0 || loading}
                className="flex-[2] h-14 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                Complete Setup
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}