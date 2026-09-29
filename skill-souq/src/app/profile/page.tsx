"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  User, Camera, Mail, Phone, ShieldCheck, 
  Briefcase, ShoppingBag, Building2, CheckCircle2, 
  Loader2, AlertCircle, Save, Scale, 
  FileText, Landmark, BarChart3, Globe, ExternalLink,
  ChevronRight, ArrowLeft, X, Link as LinkIcon, Languages, Award
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState(1);

  // Private Info State
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [cprNumber, setCprNumber] = useState("");
  const [role, setRole] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Public Profile State
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [langInput, setLangInput] = useState("");
  const [website, setWebsite] = useState("");

  const categories = ['Legal', 'IT & Tech', 'Consulting', 'Clearance', 'Marketing', 'Finance'];

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        setUser(session.user);
        const meta = session.user.user_metadata || {};
        setEmail(session.user.email || "");
        setFirstName(meta.first_name || "");
        setLastName(meta.last_name || "");
        setPhone(meta.phone || "");
        setCprNumber(meta.cpr_number || "");
        setRole(meta.role || "client");
        setInterests(meta.interests || []);

        if (meta.avatar_url && !meta.avatar_url.startsWith('blob:')) {
          setAvatarUrl(meta.avatar_url);
        } else {
          setAvatarUrl(null);
        }

        // Fetch Public Profile Data from Database
        const { data: profileData } = await supabase
          .from('profiles')
          .select('professional_title, bio, skills, languages, website, role, interests')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setProfessionalTitle(profileData.professional_title || "");
          setBio(profileData.bio || "");
          setSkills(profileData.skills || []);
          setLanguages(profileData.languages || []);
          setWebsite(profileData.website || "");
          // 🌟 SYNC ONBOARDING DATA:
          if (profileData.role) setRole(profileData.role);
          if (profileData.interests && profileData.interests.length > 0) setInterests(profileData.interests);
        }
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, [router, supabase]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRoleSelect = (selectedRole: string) => {
    setRole(selectedRole);
    if (selectedRole === 'freelancer' || selectedRole === 'client') {
      setInterests([]);
    } else if (selectedRole === 'law_firm') setInterests(['Legal']);
    else if (selectedRole === 'clearance_agency') setInterests(['Clearance']);
    else if (selectedRole === 'consulting_firm') setInterests(['Consulting']);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>, type: 'skill' | 'lang') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'skill' && skillInput.trim()) {
        if (!skills.includes(skillInput.trim())) setSkills([...skills, skillInput.trim()]);
        setSkillInput("");
      } else if (type === 'lang' && langInput.trim()) {
        if (!languages.includes(langInput.trim())) setLanguages([...languages, langInput.trim()]);
        setLangInput("");
      }
    }
  };

  const removeTag = (tagToRemove: string, type: 'skill' | 'lang') => {
    if (type === 'skill') setSkills(skills.filter(t => t !== tagToRemove));
    else setLanguages(languages.filter(t => t !== tagToRemove));
  };

  const handleSaveProfile = async () => {
    if (!supabase || !user) return;
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      // 1. Update Private Auth Metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          cpr_number: cprNumber,
          role: role,
          interests: interests,
          avatar_url: avatarUrl
        }
      });
      if (authError) throw authError;

      // 2. Upsert Public Profile Data
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          email: email, // <--- JUST ADDED THIS LINE
          professional_title: professionalTitle,
          bio: bio,
          skills: skills,
          languages: languages,
          website: website,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (profileError) throw profileError;
      
      setMessage({ type: "success", text: "All settings saved successfully!" });
      
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 2000);
      
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Update failed." });
      setSaving(false);
    }
  };

  const nextStep = () => { if (currentStep < 3) setCurrentStep(currentStep + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const prevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB] dark:bg-zinc-950">
      <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
    </div>
  );

  // --- DYNAMIC PERSONA DICTIONARY ---
  const isLegal = interests.includes('Legal') || role === 'law_firm';
  const isTech = interests.includes('IT & Tech') || role === 'freelancer';
  const isClearance = interests.includes('Clearance') || role === 'clearance_agency';
  const isConsulting = interests.includes('Consulting') || role === 'consulting_firm';

  const dict = {
    skillsLabel: isLegal ? "Practice Areas" : isClearance ? "Ministry Processing" : isConsulting ? "Industry Focus" : isTech ? "Tech Stack & Skills" : "Expertise & Skills",
    skillsPlaceholder: isLegal ? "e.g. 'Corporate Law', 'Arbitration' (Hit Enter)" : isClearance ? "e.g. 'LMRA', 'GOSI' (Hit Enter)" : isConsulting ? "e.g. 'FinTech', 'SME Scaling' (Hit Enter)" : isTech ? "e.g. 'React.js', 'Figma' (Hit Enter)" : "Type a skill and hit Enter",
    skillsEmpty: isLegal ? "No practice areas added." : isClearance ? "No ministries added." : isConsulting ? "No industries added." : "No skills added yet.",
    linkLabel: isLegal ? "Law Firm Website" : isClearance ? "Agency Portal" : isConsulting ? "Consulting Firm Website" : isTech ? "Github / Portfolio URL" : "Professional Website",
    linkDesc: isLegal ? "Link to your official law firm website." : isClearance ? "Link to your agency's online portal." : isConsulting ? "Link to your consulting firm." : isTech ? "Link out to your Github, Dribbble, or portfolio." : "Link out to your external website."
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-zinc-950 font-sans pb-32">
      
      {/* --- CLEAN HEADER (No Overlapping) --- */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 mb-6">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Account Configuration</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mb-3">Profile Settings</h1>
          <p className="text-zinc-500 font-medium max-w-2xl text-lg">Set up your private identity, platform role, and public storefront seamlessly.</p>
        </div>
      </div>

      {/* --- MAIN LAYOUT (Clean spacing, static sidebar) --- */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-10 items-start">
        
        {/* --- 🌟 LEFT SIDEBAR (STATIC, NOT STICKY) --- */}
          <div className="w-full md:w-80 shrink-0 space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 shadow-sm border border-zinc-200 dark:border-zinc-800">
            
            {/* Quick Avatar Overview */}
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-zinc-100 dark:border-zinc-800">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-2xl overflow-hidden border border-blue-100 dark:border-blue-800/50 shadow-sm shrink-0">
                 {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                    firstName ? firstName.charAt(0).toUpperCase() : "U"
                 )}
              </div>
              <div className="overflow-hidden">
                <p className="font-black text-zinc-900 dark:text-white truncate">{firstName || "User"} {lastName}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">{role ? role.replace('_', ' ') : "SkillSouq Member"}</p>
              </div>
            </div>

            {/* Step Progress Tracker */}
            <div className="space-y-6 mb-8">
              {[
    { num: 1, title: 'Identity & Contact', icon: User, desc: 'Private Data' },
    { num: 2, title: 'Platform Role', icon: ShieldCheck, desc: 'Usage & Specialization' },
    { num: 3, title: 'Public Storefront', icon: Globe, desc: 'Client-Facing Profile' }
              ].map((step) => (
                <button 
                  key={step.num}
                  onClick={() => setCurrentStep(step.num)}
                  className={`flex items-start gap-4 w-full text-left transition-all ${currentStep === step.num ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-sm transition-colors duration-300 ${currentStep === step.num ? 'bg-blue-600 text-white shadow-md' : currentStep > step.num ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700'}`}>
                    {currentStep > step.num ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                  </div>
                  <div>
                    <h4 className={`font-black text-sm mb-0.5 ${currentStep === step.num ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>{step.title}</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{step.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <a 
              href={`/profile/${user?.id}`} 
              target="_blank" 
              className="w-full flex items-center justify-center gap-2 h-12 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold transition-all"
            >
              View Public Profile <ExternalLink className="w-4 h-4 ml-1" />
            </a>
          </div>
        </div>

        {/* --- 🌟 RIGHT MAIN CONTENT AREA --- */}
        <div className="flex-1 w-full space-y-6">
          
          {/* STEP 1: IDENTITY */}
          {currentStep === 1 && (
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Identity & Contact</h2>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Your Private Account Data</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-10">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-4 border-white dark:border-zinc-900 shadow-xl flex items-center justify-center relative text-4xl md:text-5xl">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-zinc-400" />
                      )}
                      <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                        <Camera className="w-6 h-6 text-white mb-1" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Update</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                      </label>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-4">Profile Photo</p>
                </div>
                
                {/* Text Inputs */}
                <div className="flex-1 space-y-4 md:space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">First Name</label>
                      <Input placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-12 md:h-14 py-3 text-sm md:text-base font-bold rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Last Name</label>
                      <Input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-12 md:h-14 py-3 text-sm md:text-base font-bold rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Account Email (Unchangeable)</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <Input value={email} disabled className="h-12 md:h-14 py-3 pl-12 text-sm md:text-base font-bold rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 cursor-not-allowed border-zinc-200 dark:border-zinc-800" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <Input placeholder="+973..." value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 md:h-14 py-3 pl-12 text-sm md:text-base font-bold rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">CPR / Official ID</label>
                      <Input placeholder="CPR Number" value={cprNumber} onChange={(e) => setCprNumber(e.target.value)} className="h-12 md:h-14 py-3 text-sm md:text-base font-bold rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PLATFORM ROLE */}
          {currentStep === 2 && (
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                   <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Platform Role</h2>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">How you use SkillSouq</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'client', icon: ShoppingBag, label: 'Buyer', desc: 'Hiring Services' },
                  { id: 'freelancer', icon: Briefcase, label: 'Freelancer', desc: 'Independent Seller' },
                  { id: 'law_firm', icon: Landmark, label: 'Law Firm', desc: 'Legal Entity' },
                  { id: 'clearance_agency', icon: FileText, label: 'Clearance Agency', desc: 'Mandoob Services' },
                  { id: 'consulting_firm', icon: BarChart3, label: 'Consulting Firm', desc: 'Strategy & Finance' },
                  { id: 'business', icon: Building2, label: 'General Agency', desc: 'Multi-service Team' }
                ].map((item) => (
                    <button key={item.id} onClick={() => handleRoleSelect(item.id)} className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${role === item.id ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 shadow-sm scale-[1.02]' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-950'}`}>
                    <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 transition-colors ${role === item.id ? 'bg-emerald-600 text-white shadow-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}><item.icon className="w-5 h-5" /></div>
                    <div>
                      <p className={`font-black text-sm leading-none mb-1 ${role === item.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>{item.label}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* SPECIALIZATION (Only shows for specific roles) */}
              {role !== '' && role !== 'client' && role !== 'freelancer' && (
                <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-4">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Select Primary Specialization</h3>
                  <div className="flex flex-wrap gap-3">
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => setInterests([cat])} className={`px-6 py-3 rounded-xl text-sm font-black transition-all border-2 ${interests.includes(cat) ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-sm' : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PUBLIC STOREFRONT */}
          {currentStep === 3 && (
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex items-center gap-4 mb-8 border-b border-zinc-100 dark:border-zinc-800 pb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Public Storefront</h2>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">What clients see when browsing</p>
                </div>
              </div>

              <div className="space-y-8 md:space-y-10">
                
                <div className="space-y-4 md:space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Professional Headline / Title</label>
                    <Input 
                      placeholder="e.g. Senior Corporate Lawyer & Arbitrator" 
                      value={professionalTitle} 
                      onChange={(e) => setProfessionalTitle(e.target.value)} 
                      className="h-12 md:h-14 py-3 px-4 md:px-5 font-bold rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm md:text-base" 
                    />
                    <p className="text-[10px] text-zinc-400 mt-1 ml-1 font-medium">This appears prominently below your name on your public profile and on all marketplace gig cards.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 block mb-2">
                      Biography & Approach
                    </label>
                    <textarea 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={5}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 md:p-5 text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none placeholder:text-zinc-400"
                      placeholder="Detail your expertise, years of experience, and the unique value you bring to your clients..."
                    ></textarea>
                  </div>
                </div>

                {/* 🌟 EXPERTISE & SKILLS */}
                <div className="pt-6 md:pt-8 border-t border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" /> {dict.skillsLabel}
                  </h3>
                  <div className="space-y-3">
                    <Input 
                      placeholder={dict.skillsPlaceholder} 
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => handleAddTag(e, 'skill')}
                      className="h-12 md:h-14 py-3 px-4 md:px-5 text-sm md:text-base font-bold rounded-2xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" 
                    />
                    <div className="flex flex-wrap gap-2">
                      {skills.map(skill => (
                        <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold shadow-sm">
                          {skill}
                          <button onClick={() => removeTag(skill, 'skill')} className="text-zinc-400 hover:text-white dark:hover:text-zinc-900 transition-colors"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                      {skills.length === 0 && <p className="text-xs font-medium text-zinc-400 p-2">{dict.skillsEmpty}</p>}
                    </div>
                  </div>
                </div>

                {/* 🌟 EXTRA LINKS & LANGUAGES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-6 md:pt-8 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                      <Languages className="w-4 h-4 text-emerald-500" /> Languages Spoken
                    </h3>
                    <Input 
                      placeholder="e.g. Arabic, English (Hit Enter)" 
                      value={langInput}
                      onChange={(e) => setLangInput(e.target.value)}
                      onKeyDown={(e) => handleAddTag(e, 'lang')}
                      className="h-12 py-3 text-sm md:text-base font-bold rounded-xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" 
                    />
                    <div className="flex flex-wrap gap-2">
                      {languages.map(lang => (
                        <span key={lang} className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-100 dark:border-emerald-800/50">
                          {lang}
                          <button onClick={() => removeTag(lang, 'lang')} className="hover:text-emerald-900 transition-colors ml-1"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-blue-500" /> {dict.linkLabel}
                    </h3>
                    <Input 
                      placeholder="https://" 
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="h-12 py-3 text-sm md:text-base font-bold rounded-xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" 
                    />
                    <p className="text-[10px] text-zinc-400 font-medium">{dict.linkDesc}</p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 🌟 DYNAMIC WIZARD NAVIGATION BAR */}
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-4 shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-8">
            
            <div className="flex-1 w-full sm:w-auto">
              {currentStep > 1 ? (
                <button 
                  onClick={prevStep} 
                  className="flex items-center justify-center gap-2 h-14 px-8 rounded-xl font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-white dark:hover:bg-zinc-800 transition-all w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : <div></div>}
            </div>

            <div className="flex-1 w-full sm:w-auto flex justify-center">
               {message.text && (
                 <div className={`flex items-center gap-2 text-sm font-black ${message.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                   {message.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                   <span>{message.text}</span>
                 </div>
               )}
            </div>
            
            <div className="flex-1 w-full sm:w-auto flex justify-end">
              {currentStep < 3 ? (
                <Button 
                  onClick={nextStep} 
                  className="w-full sm:w-auto h-14 px-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                >
                  Next Step <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={saving} 
                  className="w-full sm:w-auto h-14 px-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                  {saving ? "Saving..." : "Save & Complete"}
                </Button>
              )}
            </div>
            
          </div>

        </div>
      </div>
    </div>
  );
}