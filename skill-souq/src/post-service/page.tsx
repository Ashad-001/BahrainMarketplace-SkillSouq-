"use client";

import { useState, useEffect } from "react";
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';
import { scanForBannedContent } from '@/utils/trust-safety';
import { 
  ArrowLeft, CheckCircle2, ChevronRight, Briefcase, 
  Tag, Image as ImageIcon, Sparkles, Loader2, AlertCircle,
  Scale, Building, Landmark, FileText, MapPin, Zap, Upload, LocateFixed,
  Code2, Globe, Award, Mail, CreditCard, ImagePlus, 
  PieChart, BarChart3, GraduationCap, Building2, ShieldAlert, Activity, 
  ShieldCheck, ArrowRight, User
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ============================================================================
// SHARED UI COMPONENTS (NEW PREMIUM STYLES)
// ============================================================================

const FormCard = ({ children, title, icon: Icon, description }: any) => (
  <div className="bg-white dark:bg-zinc-900/40 rounded-[2.5rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-200 dark:border-zinc-800/80 mb-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
    {(title || Icon) && (
      <div className="flex items-start gap-4 mb-8">
        {Icon && <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-100 dark:border-zinc-700"><Icon className="w-6 h-6 text-zinc-700 dark:text-zinc-300" /></div>}
        <div>
          {title && <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{title}</h3>}
          {description && <p className="text-sm font-medium text-zinc-500 mt-1">{description}</p>}
        </div>
      </div>
    )}
    {children}
  </div>
);

const PremiumInput = ({ label, actionButton, ...props }: any) => (
  <div className="space-y-2.5 w-full">
    <div className="flex justify-between items-end px-1">
      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{label}</label>
      {actionButton}
    </div>
    <input 
      {...props} 
      className={`w-full h-14 px-5 font-bold rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600 ${props.className || ''}`}
    />
  </div>
);

const PremiumTextArea = ({ label, actionButton, ...props }: any) => (
  <div className="space-y-2.5 w-full">
    <div className="flex justify-between items-end px-1">
      <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">{label}</label>
      {actionButton}
    </div>
    <textarea 
      {...props} 
      className={`w-full h-44 p-6 font-medium text-sm rounded-[2rem] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all resize-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 ${props.className || ''}`}
    />
  </div>
);

const AITriggerButton = ({ onClick, disabled, loading, text }: any) => (
  <button 
    type="button" 
    onClick={onClick} 
    disabled={disabled || loading} 
    className="group relative inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-md hover:shadow-lg disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
  >
    <div className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-blue-200" />} 
    <span className="relative z-10">{text || "AI Polish"}</span>
  </button>
);

const LocationSection = ({ location, setLocation }: any) => {
  const [isLocating, setIsLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const handleGetLocation = (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsLocating(true);
    setTimeout(() => {
      setLocation("Diplomatic Area, Block 317, Manama, Bahrain");
      setShowMap(true);
      setIsLocating(false);
    }, 1500);
  };

  return (
    <FormCard title="Practice Location" icon={MapPin} description="Where can clients find your office?">
       <div className="relative w-full h-64 bg-zinc-100 dark:bg-zinc-900/50 rounded-[2rem] overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center transition-all duration-500 mb-6 group">
          {showMap ? (
             <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center opacity-80 mix-blend-luminosity transition-transform duration-700 group-hover:scale-105"></div>
          ) : (
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          )}
          <div className="relative z-10 text-center">
             {isLocating ? (
               <div className="flex flex-col items-center">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                  <span className="text-xs font-black uppercase text-blue-600 tracking-widest bg-blue-50 px-4 py-2 rounded-full shadow-sm">Detecting...</span>
               </div>
             ) : showMap ? (
               <div className="flex flex-col items-center animate-in zoom-in">
                 <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.5)] mb-3 relative">
                    <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-30"></div>
                    <MapPin className="w-7 h-7 text-white" />
                 </div>
                 <span className="bg-white dark:bg-zinc-900 px-5 py-2.5 rounded-2xl font-black text-xs shadow-xl border border-zinc-100 dark:border-zinc-800">
                    Location Pinned
                 </span>
               </div>
             ) : (
               <Button type="button" onClick={handleGetLocation} className="h-14 px-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black shadow-xl transition-all hover:scale-105 active:scale-95">
                 <LocateFixed className="w-5 h-5 mr-2" /> Detect Office GPS
               </Button>
             )}
          </div>
       </div>
       <PremiumInput label="Building / Street Address" placeholder="e.g. Office 412, Building 55, Road 1701" value={location} onChange={(e: any) => setLocation(e.target.value)} />
    </FormCard>
  );
};

// 🚨 ADDED UNIVERSAL MEDIA UPLOAD SECTION
const MediaUploadSection = (props: any) => (
  <FormCard title="Gig Cover Media" icon={ImagePlus} description="Upload a high-quality image or professional portrait to attract buyers.">
    <div className="text-center py-6">
      <label className="cursor-pointer block p-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-900/50 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/10 dark:hover:border-blue-900/50 transition-all group overflow-hidden relative">
        {props.gigMediaFile ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 z-10 animate-in zoom-in backdrop-blur-md">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3"><CheckCircle2 className="w-8 h-8 text-emerald-600" /></div>
              <p className="font-black text-zinc-900 dark:text-white truncate max-w-xs">{props.gigMediaFile.name}</p>
              <span className="text-[10px] font-bold text-zinc-400 uppercase mt-2 hover:text-zinc-600 transition-colors">Click to replace image</span>
           </div>
        ) : null}
        <div className="w-20 h-20 bg-white dark:bg-zinc-800 shadow-sm rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
          <Upload className="w-8 h-8 text-blue-500" />
        </div>
        <p className="text-xl font-black text-zinc-900 dark:text-white mb-2">Drag & Drop Media</p>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Supported: High-res PNG, JPG</p>
        <input type="file" className="hidden" accept="image/*" onChange={(e: any) => e.target.files && props.setGigMediaFile(e.target.files[0])} />
      </label>
    </div>
  </FormCard>
);

const ProgressBar = ({ currentStep, totalSteps, title }: { currentStep: number, totalSteps: number, title: string }) => (
  <div className="mb-12 animate-in fade-in duration-500">
    <div className="flex justify-between items-end mb-4">
      <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">{title}</h2>
      <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Step {currentStep} of {totalSteps}</span>
    </div>
    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
      <div className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
    </div>
  </div>
);

// ============================================================================
// SUB-FORM ENGINES
// ============================================================================

const LegalForm = (props: any) => {
  const [subStep, setSubStep] = useState(1);
  const handleNext = (e: any) => { if (e && e.preventDefault) e.preventDefault(); subStep < 4 ? setSubStep(subStep + 1) : props.onNext(e); };
  const handleBack = (e: any) => { if (e && e.preventDefault) e.preventDefault(); subStep > 1 ? setSubStep(subStep - 1) : props.onBack(e); };

  // 🚨 ADDED 4TH STEP FOR MEDIA
  const titles = ["Official Identity", "Practice Details", "Location Setup", "Gig Cover Media"];

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
      <ProgressBar currentStep={subStep} totalSteps={4} title={titles[subStep - 1]} />
      
      <div>
        {subStep === 1 && (
           <FormCard title="Official Credentials" icon={Landmark} description="Verify your legal standing in the Kingdom of Bahrain.">
              <div className="space-y-6">
                <PremiumInput label="Professional / Firm Name" placeholder="e.g. Al-Khalifa Legal Consultants" value={props.firmName} onChange={(e: any) => props.setFirmName(e.target.value)} />
                <PremiumInput label="MoJ License Number" placeholder="e.g. MoJ-LAW-2024-881" value={props.accreditation} onChange={(e: any) => props.setAccreditation(e.target.value)} />
              </div>
           </FormCard>
        )}
        
        {subStep === 2 && (
          <div className="space-y-8">
             <FormCard title="Service Definition" icon={Briefcase}>
               <div className="space-y-6">
                  <PremiumInput 
                    label="Practice Headline" 
                    placeholder="e.g. Senior Corporate Law Specialist & Arbitrator" 
                    value={props.title} 
                    onChange={(e: any) => props.setTitle(e.target.value)} 
                    actionButton={<AITriggerButton onClick={props.handleAIPolish} disabled={!props.title} loading={props.isPolishingTitle} />}
                  />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PremiumInput type="number" label="Years Experience" placeholder="e.g. 10" value={props.experience} onChange={(e: any) => props.setExperience(e.target.value)} />
                    <PremiumInput type="number" label="Consultation Rate (BHD/Hr)" placeholder="50.00" value={props.price} onChange={(e: any) => props.setPrice(e.target.value)} />
                 </div>
               </div>
             </FormCard>

             <FormCard title="Professional Bio" icon={FileText}>
               <PremiumTextArea 
                  label="Biography & Methodology" 
                  placeholder="Outline your practice areas, notable cases, and client methodology..." 
                  value={props.aboutMe} 
                  onChange={(e: any) => props.setAboutMe(e.target.value)} 
                  actionButton={<AITriggerButton onClick={props.handleGenerateSummary} disabled={!props.title} loading={props.isGeneratingSummary} text="AI Write Bio" />}
               />
             </FormCard>
          </div>
        )}

        {subStep === 3 && <LocationSection {...props} />}
        
        {/* 🚨 ADDED MEDIA UPLOAD */}
        {subStep === 4 && <MediaUploadSection {...props} />}
      </div>

      <div className="flex justify-between mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
        <Button type="button" variant="ghost" onClick={handleBack} className="h-14 px-8 rounded-2xl font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white">Back</Button>
        <Button type="button" onClick={handleNext} disabled={subStep === 1 && !props.firmName} className="h-14 px-12 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black shadow-xl hover:scale-105 active:scale-95 transition-all">
           {subStep === 4 ? "Verify & Publish" : "Continue to Details"} <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const ITTechForm = (props: any) => {
  const [subStep, setSubStep] = useState(1);
  const handleNext = (e: any) => { if (e && e.preventDefault) e.preventDefault(); subStep < 4 ? setSubStep(subStep + 1) : props.onNext(e); };
  const handleBack = (e: any) => { if (e && e.preventDefault) e.preventDefault(); subStep > 1 ? setSubStep(subStep - 1) : props.onBack(e); };

  const titles = ["Developer Identity", "Tech Stack", "Gig Definition", "Visual Assets"];

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
      <ProgressBar currentStep={subStep} totalSteps={4} title={titles[subStep - 1]} />

      <div className="space-y-8">
        {subStep === 1 && (
          <FormCard title="Basic Information" icon={User} description="How should clients contact you?">
            <div className="space-y-6">
              <PremiumInput label="Developer or Studio Name" placeholder="e.g. Nexus Software Solutions" value={props.firmName} onChange={(e: any) => props.setFirmName(e.target.value)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PremiumInput label="CPR / National ID Number" placeholder="Required for verification" value={props.idNumber} onChange={(e: any) => props.setIdNumber(e.target.value)} />
                <PremiumInput type="email" label="Contact Email" placeholder="hello@example.com" value={props.contactEmail} onChange={(e: any) => props.setContactEmail(e.target.value)} />
              </div>
            </div>
          </FormCard>
        )}

        {subStep === 2 && (
          <FormCard title="Technical Arsenal" icon={Code2} description="Showcase your tools and past work.">
             <div className="space-y-6">
                <PremiumInput label="Portfolio URL" placeholder="e.g. github.com/yourusername" value={props.portfolioUrl} onChange={(e: any) => props.setPortfolioUrl(e.target.value)} />
                <PremiumInput label="Core Tech Stack" placeholder="e.g. React, Node.js, PostgreSQL, AWS" value={props.techStack} onChange={(e: any) => props.setTechStack(e.target.value)} />
                <PremiumInput type="number" label="Years of Professional Experience" placeholder="e.g. 5" value={props.experience} onChange={(e: any) => props.setExperience(e.target.value)} />
             </div>
          </FormCard>
        )}

        {subStep === 3 && (
          <div className="space-y-8">
             <FormCard title="The Offer" icon={Briefcase}>
               <div className="space-y-6">
                  <PremiumInput 
                    label="Gig Title (The 'What')" 
                    placeholder="e.g. I will build a Custom SaaS Dashboard" 
                    value={props.title} 
                    onChange={(e: any) => props.setTitle(e.target.value)} 
                    actionButton={<AITriggerButton onClick={props.handleAIPolish} disabled={!props.title} loading={props.isPolishingTitle} />}
                  />
                 <PremiumInput type="number" label="Fixed Project Price (BHD)" placeholder="e.g. 250" value={props.price} onChange={(e: any) => props.setPrice(e.target.value)} />
               </div>
             </FormCard>

             <FormCard title="Project Details" icon={FileText}>
               <PremiumTextArea 
                  label="Project Summary (The 'How')" 
                  placeholder="Describe your workflow, technologies used, and what exactly the buyer will receive..." 
                  value={props.aboutMe} 
                  onChange={(e: any) => props.setAboutMe(e.target.value)} 
                  actionButton={<AITriggerButton onClick={props.handleGenerateSummary} disabled={!props.title} loading={props.isGeneratingSummary} text="AI Write Summary" />}
               />
             </FormCard>
          </div>
        )}

        {subStep === 4 && <MediaUploadSection {...props} />}
      </div>

      <div className="flex justify-between mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
        <Button type="button" variant="ghost" onClick={handleBack} className="h-14 px-8 rounded-2xl font-bold text-zinc-500">Back</Button>
        <Button type="button" onClick={handleNext} disabled={subStep === 1 && (!props.firmName || !props.idNumber)} className="h-14 px-12 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all">
          {subStep === 4 ? "Publish Tech Gig" : "Continue"} <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const ClearanceForm = (props: any) => {
  const [subStep, setSubStep] = useState(1);
  const handleNext = (e: any) => { if (e && e.preventDefault) e.preventDefault(); subStep < 5 ? setSubStep(subStep + 1) : props.onNext(e); };
  const handleBack = (e: any) => { if (e && e.preventDefault) e.preventDefault(); subStep > 1 ? setSubStep(subStep - 1) : props.onBack(e); };
  
  const titles = ["Agency Identity", "Ministry Focus", "Service Terms", "Map Location", "Gig Cover Media"];
  const ministries = ['LMRA', 'Customs', 'MOIC (Sijilat)', 'GOSI', 'GDN (Traffic)', 'NHRA', 'Electricity & Water'];

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
      <ProgressBar currentStep={subStep} totalSteps={5} title={titles[subStep - 1]} />

      <div>
        {subStep === 1 && (
          <FormCard title="Agency Registration" icon={Building2} description="Enter your official commercial details.">
             <div className="space-y-6">
               <PremiumInput label="Agency / Establishment Name" value={props.firmName} onChange={(e: any) => props.setFirmName(e.target.value)} />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <PremiumInput label="CR Number" placeholder="e.g. 123456-1" value={props.crNumber} onChange={(e: any) => props.setCrNumber(e.target.value)} />
                 <PremiumInput type="number" label="Operating Years" placeholder="e.g. 8" value={props.experience} onChange={(e: any) => props.setExperience(e.target.value)} />
               </div>
             </div>
          </FormCard>
        )}

        {subStep === 2 && (
          <FormCard title="Department Expertise" icon={Activity} description="Select all ministries your agency is licensed to process documents for.">
            <div className="flex flex-wrap gap-3">
              {ministries.map(m => (
                <button 
                  key={m} 
                  type="button"
                  onClick={() => props.setMinistryExpertise((prev: string[]) => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])} 
                  className={`px-6 py-4 rounded-2xl text-sm font-black transition-all border-2 flex items-center gap-3 ${props.ministryExpertise.includes(m) ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900 shadow-md transform scale-[1.02]' : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'}`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${props.ministryExpertise.includes(m) ? 'border-white dark:border-zinc-900 bg-white dark:bg-zinc-900' : 'border-zinc-300 dark:border-zinc-700'}`}>
                    {props.ministryExpertise.includes(m) && <CheckCircle2 className="w-3 h-3 text-zinc-900 dark:text-white" />}
                  </div>
                  {m}
                </button>
              ))}
            </div>
          </FormCard>
        )}

        {subStep === 3 && (
          <div className="space-y-8">
             <FormCard title="Service Offering" icon={Briefcase}>
               <div className="space-y-6">
                  <PremiumInput 
                    label="Service Title" 
                    placeholder="e.g. Expedited LMRA Visa Processing" 
                    value={props.title} 
                    onChange={(e: any) => props.setTitle(e.target.value)} 
                    actionButton={<AITriggerButton onClick={props.handleAIPolish} disabled={!props.title} loading={props.isPolishingTitle} />}
                  />
                 <PremiumInput type="number" label="Service Fee (Starting BHD)" placeholder="e.g. 50" value={props.price} onChange={(e: any) => props.setPrice(e.target.value)} />
               </div>
             </FormCard>

             <FormCard title="Agency Bio & Requirements" icon={FileText}>
               <PremiumTextArea 
                  label="Processing Details" 
                  placeholder="Outline your typical processing times, required documents, and agency background..." 
                  value={props.aboutMe} 
                  onChange={(e: any) => props.setAboutMe(e.target.value)} 
                  actionButton={<AITriggerButton onClick={props.handleGenerateSummary} disabled={!props.title} loading={props.isGeneratingSummary} text="AI Write Bio" />}
               />
             </FormCard>
          </div>
        )}
        
        {subStep === 4 && <LocationSection {...props} />}

        {/* 🚨 ADDED MEDIA UPLOAD */}
        {subStep === 5 && <MediaUploadSection {...props} />}
      </div>

      <div className="flex justify-between mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
        <Button type="button" variant="ghost" onClick={handleBack} className="h-14 px-8 rounded-2xl font-bold text-zinc-500">Back</Button>
        <Button type="button" onClick={handleNext} disabled={subStep === 1 && (!props.firmName || !props.crNumber)} className="h-14 px-12 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black shadow-xl hover:scale-105 active:scale-95 transition-all">
          {subStep === 5 ? "Publish Service" : "Continue"} <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const ConsultingForm = (props: any) => {
  const [subStep, setSubStep] = useState(1);
  const handleNext = (e: any) => { if (e && e.preventDefault) e.preventDefault(); subStep < 5 ? setSubStep(subStep + 1) : props.onNext(e); };
  const handleBack = (e: any) => { if (e && e.preventDefault) e.preventDefault(); subStep > 1 ? setSubStep(subStep - 1) : props.onBack(e); };
  
  const titles = ["Advisory Profile", "Industry Focus", "Service Scope", "Practice Map", "Gig Cover Media"];
  const industries = ['FinTech', 'Real Estate', 'Logistics', 'Retail & F&B', 'Oil & Gas', 'SME Scaling', 'Marketing'];

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
      <ProgressBar currentStep={subStep} totalSteps={5} title={titles[subStep - 1]} />

      <div>
        {subStep === 1 && (
          <FormCard title="Advisory Background" icon={GraduationCap} description="Establish your firm's credibility.">
             <div className="space-y-6">
               <PremiumInput label="Consulting Firm / Agency Name" value={props.firmName} onChange={(e: any) => props.setFirmName(e.target.value)} />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <PremiumInput label="Lead Consultant Name" value={props.leadConsultant} onChange={(e: any) => props.setLeadConsultant(e.target.value)} />
                 <PremiumInput type="number" label="Years Experience" value={props.experience} onChange={(e: any) => props.setExperience(e.target.value)} />
               </div>
             </div>
          </FormCard>
        )}

        {subStep === 2 && (
          <FormCard title="Core Industry Verticals" icon={PieChart} description="Select the sectors you specialize in.">
            <div className="flex flex-wrap gap-3">
              {industries.map(ind => (
                <button 
                  key={ind} 
                  type="button"
                  onClick={() => props.setIndustryExpertise((prev: string[]) => prev.includes(ind) ? prev.filter(x => x !== ind) : [...prev, ind])} 
                  className={`px-6 py-4 rounded-2xl text-sm font-black transition-all border-2 flex items-center gap-3 ${props.industryExpertise.includes(ind) ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900 shadow-md transform scale-[1.02]' : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'}`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${props.industryExpertise.includes(ind) ? 'border-white dark:border-zinc-900 bg-white dark:bg-zinc-900' : 'border-zinc-300 dark:border-zinc-700'}`}>
                    {props.industryExpertise.includes(ind) && <CheckCircle2 className="w-3 h-3 text-zinc-900 dark:text-white" />}
                  </div>
                  {ind}
                </button>
              ))}
            </div>
          </FormCard>
        )}

        {subStep === 3 && (
          <div className="space-y-8">
             <FormCard title="Service Definition" icon={Briefcase}>
               <div className="space-y-6">
                 <PremiumInput 
                    label="Advisory Headline" 
                    placeholder="e.g. Market Entry Strategy for Bahrain" 
                    value={props.title} 
                    onChange={(e: any) => props.setTitle(e.target.value)} 
                    actionButton={<AITriggerButton onClick={props.handleAIPolish} disabled={!props.title} loading={props.isPolishingTitle} />}
                 />
                 <PremiumInput type="number" label="Starting Engagement Fee (BHD)" placeholder="e.g. 500" value={props.price} onChange={(e: any) => props.setPrice(e.target.value)} />
               </div>
             </FormCard>

             <FormCard title="Methodology" icon={FileText}>
               <PremiumTextArea 
                  label="Professional Bio & Strategy" 
                  placeholder="Explain your methodology, past successes, and the tangible ROI clients can expect..." 
                  value={props.aboutMe} 
                  onChange={(e: any) => props.setAboutMe(e.target.value)} 
                  actionButton={<AITriggerButton onClick={props.handleGenerateSummary} disabled={!props.title} loading={props.isGeneratingSummary} text="AI Write Bio" />}
               />
             </FormCard>
          </div>
        )}
        
        {subStep === 4 && <LocationSection {...props} />}

        {/* 🚨 ADDED MEDIA UPLOAD */}
        {subStep === 5 && <MediaUploadSection {...props} />}
      </div>

      <div className="flex justify-between mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
        <Button type="button" variant="ghost" onClick={handleBack} className="h-14 px-8 rounded-2xl font-bold text-zinc-500">Back</Button>
        <Button type="button" onClick={handleNext} disabled={subStep === 1 && (!props.firmName || !props.leadConsultant)} className="h-14 px-12 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black shadow-xl hover:scale-105 active:scale-95 transition-all">
          {subStep === 5 ? "Launch Advisory" : "Continue"} <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PAGE CONTROLLER
// ============================================================================

export default function PostServicePage() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [authResolved, setAuthResolved] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [supabase, setSupabase] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  // AI States
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isPolishingTitle, setIsPolishingTitle] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Shared Form State
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [firmName, setFirmName] = useState("");
  
  // Specific States
  const [accreditation, setAccreditation] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [idNumber, setIdNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [techStack, setTechStack] = useState("");
  const [gigMediaFile, setGigMediaFile] = useState<File | null>(null);
  const [crNumber, setCrNumber] = useState("");
  const [ministryExpertise, setMinistryExpertise] = useState<string[]>([]);
  const [leadConsultant, setLeadConsultant] = useState("");
  const [industryExpertise, setIndustryExpertise] = useState<string[]>([]);

  const categories = [
    { id: "Legal", icon: Scale, desc: "Lawyers & Legal Counsel" },
    { id: "IT & Tech", icon: Zap, desc: "Software & Digital Skills" },
    { id: "Clearance", icon: FileText, desc: "Gov & Customs Clearance" },
    { id: "Consulting", icon: BarChart3, desc: "Strategy & Advisory" },
  ];

  // AI Handlers
  const callGemini = async (prompt: string) => {
    const apiKey = ""; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    } catch (e) { return ""; }
  };

  const handleAIPolish = async () => {
    if (!title) return;

    setIsPolishingTitle(true);
    const toastId = toast.loading('AI is working its magic...');

    try {
      const res = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: title })
      });

      const data = await res.json();
      
      // NEW: Check if the server actually threw an error status (like 500)
      if (!res.ok) {
        throw new Error(data.error || 'Server error');
      }

      if (data.polishedText) {
        setTitle(data.polishedText); 
        toast.success('Polished!', { id: toastId });
      } else {
        toast.error('AI failed to generate.', { id: toastId });
      }
    } catch (error) {
      // Now it will actually catch the error and show the red toast!
      toast.error('Something went wrong.', { id: toastId });
      console.error(error);
    } finally {
      setIsPolishingTitle(false);
    }
  };

  const handleGenerateSummary = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!title) return;
    setIsGeneratingSummary(true);

    try {
      // Build a concise structured prompt including all relevant fields
      const structured = `Name: ${firmName || 'N/A'}\nHeadline: ${title}\nCategory: ${category || 'General'}\nPrice: ${price || 'N/A'}\nExperience: ${experience || 'N/A'}\nTech Stack: ${techStack || 'N/A'}\nPortfolio: ${portfolioUrl || 'N/A'}\nLocation: ${location || 'N/A'}\nExtra: ${aboutMe || ''}`;

      const response = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: structured, type: 'summary' })
      });

      const data = await response.json();
      if (data?.result) {
        setAboutMe(data.result);
      } else {
        // fallback to previous generator if needed
        const prompt = `Write a 2-paragraph professional profile bio for a ${category} specialist on Skill Souq. Name: ${firmName}. Headline: "${title}". Focus on expertise, ROI for the client.`;
        const result = await callGemini(prompt);
        if (result) setAboutMe(result);
      }
    } catch (err) {
      console.error('Summary generation failed:', err);
      const prompt = `Write a 2-paragraph professional profile bio for a ${category} specialist on Skill Souq. Name: ${firmName}. Headline: "${title}". Focus on expertise, ROI for the client.`;
      const result = await callGemini(prompt);
      if (result) setAboutMe(result);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        let client = (window as any).globalSupabaseClient;

        if (!client) {
          client = createClient();
          (window as any).globalSupabaseClient = client;
        }

        setSupabase(client);

        const { data: { session } } = await client.auth.getSession();

        if (session) {
          setUser(session.user);
          const interests = session.user.user_metadata?.interests || [];
          const matched = categories.find(c => interests.includes(c.id));
          if (matched) { setCategory(matched.id); setStep(2); }
        } else {
          setNeedsLogin(true);
        }
        setAuthResolved(true);
        setIsCheckingSession(false);
      } catch (err) {
        console.error("Supabase init error:", err);
        setErrorMsg("Failed to initialize database connection.");
        setAuthResolved(true);
        setIsCheckingSession(false);
      }
    };
    init();
  }, []);

  // 🌟 AUTO-SKIP STEP 1 IF USER HAS SPECIALIZATION FROM ONBOARDING
  useEffect(() => {
    const checkUserSpecialization = async () => {
      if (!supabase || !user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('interests')
          .eq('id', user.id)
          .single();

        // If they have interests saved from onboarding, set it and skip Step 1!
        if (profile && profile.interests && profile.interests.length > 0) {
          setCategory(profile.interests[0]); // e.g., Auto-sets to "IT & Tech"
          setStep(2); // Instantly jumps to the gig creation form!
        }
      } catch (err) {
        console.error("Error checking user specialization:", err);
      }
    };

    checkUserSpecialization();
  }, [supabase, user]);

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

  const handlePublish = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!supabase || !user) return;
    
    setLoading(true);
    setErrorMsg("");

    const combinedTextToScan = `${title} ${aboutMe}`;

    const basicCheck = scanForBannedContent(combinedTextToScan);
    if (!basicCheck.isSafe) {
      toast.error(basicCheck.reason, { duration: 5000 });
      setLoading(false);
      return;
    }

    const toastId = toast.loading('AI analyzing gig for policy compliance...');
    try {
      const aiResponse = await fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: combinedTextToScan })
      });

      const aiResult = await aiResponse.json();

      if (!aiResult.isSafe) {
        toast.error('AI Blocked: ' + aiResult.reason, { id: toastId, duration: 5000 });
        setLoading(false);
        return;
      }

      toast.success('Gig approved by Trust & Safety!', { id: toastId });
    } catch (error) {
      toast.error('Security scan failed. Please try again.', { id: toastId });
      console.error(error);
      setLoading(false);
      return;
    }

    let finalMediaUrl = null;
    if (gigMediaFile && gigMediaFile.type.startsWith("image/")) {
       finalMediaUrl = await processImage(gigMediaFile);
    }

    // 🚨 FIXED: The new description builder!
    let description = `### Summary\n${aboutMe}\n\n`;
    if (category === "IT & Tech") description += `**Stack:** ${techStack}\n**Portfolio:** ${portfolioUrl}`;
    else if (category === "Legal") description += `**Accreditation:** ${accreditation}\n**Address:** ${location}`;
    else if (category === "Clearance" || category === "Consulting") description += `**Address:** ${location}`;

    try {
      const payload = {
        seller_id: user.id,
        // 🚨 ADDED SELLER NAME & AVATAR
        seller_name: firmName || leadConsultant || (user.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim() : null),
        seller_avatar: user.user_metadata?.avatar_url || null,
        title: title || `${category} Specialist`, 
        category,
        price: parseFloat(price) || 0,
        description: description,
        media_url: finalMediaUrl
      };
      
      const { error } = await supabase.from('gigs').insert([payload]);
      if (error) throw error;
      
      setStep(4); 
    } catch (err: any) {
      console.error("PUBLISH ERROR:", err); 
      setErrorMsg(err.message || "Network Error: The request failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const formProps = {
    title, setTitle, firmName, setFirmName, accreditation, setAccreditation,
    idFile, setIdFile, licenseFile, setLicenseFile, experience, setExperience,
    idNumber, setIdNumber, contactEmail, setContactEmail, portfolioUrl, setPortfolioUrl, 
    techStack, setTechStack, gigMediaFile, setGigMediaFile,
    crNumber, setCrNumber, ministryExpertise, setMinistryExpertise,
    leadConsultant, setLeadConsultant, industryExpertise, setIndustryExpertise,
    price, setPrice, location, setLocation, aboutMe, setAboutMe,
    handleAIPolish, handleGenerateSummary, isGeneratingTitle, isGeneratingSummary, isPolishingTitle,
    onBack: () => setStep(1), onNext: handlePublish
  };

  if (!authResolved || isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-sans">
         <div className="flex flex-col items-center">
           <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
           <p className="text-xs font-black text-zinc-400 uppercase tracking-widest animate-pulse">Syncing Workspace...</p>
         </div>
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

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 font-sans py-10 px-6 pb-32">
      <div className="max-w-3xl mx-auto relative z-10">
        
        {step < 4 && (
          <div className="flex items-center justify-between mb-8 animate-in fade-in slide-in-from-top-4">
            <a href="/seller-dashboard" className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-full shadow-sm border border-zinc-200 dark:border-zinc-800">
              <ArrowLeft className="w-4 h-4" /> Workspace
            </a>
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Setup Wizard
            </div>
          </div>
        )}

        <div className="relative">
          
          {loading && (
            <div className="fixed inset-0 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
               <div className="w-20 h-20 bg-white dark:bg-zinc-900 shadow-2xl rounded-3xl flex items-center justify-center mb-6">
                 <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
               </div>
               <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">Publishing to Marketplace</h3>
               <p className="text-zinc-500 font-medium text-sm">Securing your listing data...</p>
            </div>
          )}

          {errorMsg && (
            <div className="mb-8 p-6 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-[2rem] font-bold flex items-start gap-4 border border-red-100 dark:border-red-900/30 shadow-sm animate-in slide-in-from-top-4">
               <AlertCircle className="w-6 h-6 shrink-0 mt-0.5"/> 
               <div>
                  <h4 className="text-lg mb-1">Failed to Publish</h4>
                  <p className="text-sm font-medium opacity-90">{String(errorMsg)}</p>
               </div>
            </div>
          )}

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="text-center mb-12 mt-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl mb-6 shadow-2xl shadow-blue-500/30">
                  <span className="text-white font-black text-3xl">S</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-zinc-900 dark:text-white">Define Specialization</h1>
                <p className="text-zinc-500 font-medium text-lg max-w-md mx-auto">Select your primary domain to unlock specific verification and credential requirements.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
                {categories.map((cat) => (
                  <button type="button" key={cat.id} onClick={() => setCategory(cat.id)} className={`p-8 rounded-[2.5rem] border-2 text-left transition-all duration-300 group relative overflow-hidden ${category === cat.id ? 'border-blue-600 bg-white dark:bg-zinc-900 shadow-xl shadow-blue-600/10 scale-[1.02]' : 'border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-900'}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 ${category === cat.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:scale-110 group-hover:text-zinc-600 dark:group-hover:text-zinc-200'}`}>
                       <cat.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-black mb-2 text-zinc-900 dark:text-white">{cat.id}</h3>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{cat.desc}</p>
                    
                    {category === cat.id && (
                      <div className="absolute top-6 right-6">
                        <CheckCircle2 className="w-6 h-6 text-blue-600 animate-in zoom-in" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex justify-center">
                <Button type="button" onClick={() => setStep(2)} disabled={!category} className="h-16 px-16 rounded-[2rem] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-lg font-black shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100">
                   Next Step <ChevronRight className="ml-2 w-5 h-5"/>
                </Button>
              </div>
            </div>
          )}

          {step === 2 && category === "Legal" && <LegalForm {...formProps} />}
          {step === 2 && category === "IT & Tech" && <ITTechForm {...formProps} />}
          {step === 2 && category === "Clearance" && <ClearanceForm {...formProps} />}
          {step === 2 && category === "Consulting" && <ConsultingForm {...formProps} />}

          {step === 4 && (
            <div className="text-center py-20 animate-in zoom-in duration-700 bg-white dark:bg-zinc-900 rounded-[3rem] shadow-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="w-36 h-36 mx-auto bg-emerald-100 dark:bg-emerald-900/40 rounded-[3rem] flex items-center justify-center mb-10 rotate-6 shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-400/20 animate-pulse"></div>
                <CheckCircle2 className="w-16 h-16 text-emerald-600 relative z-10" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-6 text-zinc-900 dark:text-white leading-none">Service Launched!</h1>
              <p className="text-zinc-500 text-xl font-medium mb-12 max-w-md mx-auto">Your elite listing is now active in the marketplace and ready to accept offers.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 px-6">
                 <a href="/seller-dashboard" className="h-16 px-10 rounded-[2rem] border-2 border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-black transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800">Return to Workspace</a>
                 <a href="/marketplace" className="h-16 px-10 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-600/20">View Marketplace <ArrowRight className="w-5 h-5 ml-2" /></a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}