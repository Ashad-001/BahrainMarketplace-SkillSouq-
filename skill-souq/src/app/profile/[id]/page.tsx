"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  User, MapPin, Calendar, Star, ShieldCheck, 
  MessageSquare, Loader2, Briefcase, ArrowRight,
  Award, Languages, Link as LinkIcon
} from "lucide-react";

export default function PublicProfilePage() {
  const [profileId, setProfileId] = useState<string>("");
  
  const [supabase, setSupabase] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [gigs, setGigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Extract ID from URL path natively
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathParts = window.location.pathname.split('/');
      const id = pathParts[pathParts.length - 1];
      if (id && id !== "[id]") {
        setProfileId(id);
      }
    }
  }, []);

  useEffect(() => {
    if (!profileId) return;

    let isMounted = true;

    const init = async () => {
      const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const PROJECT_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      let client = (window as any).globalSupabaseClient;
      if (!client) {
        client = createClient(PROJECT_URL, PROJECT_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
          storage: window.localStorage as any,
        });
        (window as any).globalSupabaseClient = client;
      }
      setSupabase(client);

      try {
        // 1. Fetch the User's Profile
        const { data: profileData, error: profileError } = await client
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Profile Error:", profileError);
        }

        // If we found a profile, save it
        if (profileData && isMounted) {
          setProfile(profileData);
        } else if (isMounted) {
          // Fallback if no profile row exists yet, but they have gigs
          setProfile({
            id: profileId,
            first_name: "SkillSouq",
            last_name: "Professional",
            professional_title: "Verified Partner",
            bio: "I am a dedicated professional offering high-quality services on SkillSouq. I prioritize clear communication and delivering exceptional results for my clients.",
            skills: [],
            languages: [],
            website: "",
            rating: 5.0,
            joined_at: new Date().toISOString()
          });
        }

        // 2. Fetch the User's Gigs
        const { data: gigsData } = await client
          .from('gigs')
          .select('*')
          .eq('seller_id', profileId)
          .order('created_at', { ascending: false });

        if (gigsData && isMounted) {
          setGigs(gigsData);
        }

        if (isMounted) setLoading(false);
      } catch (err) {
        console.error("Page Load Error:", err);
        if (isMounted) setLoading(false);
      }
    };

    init();

    return () => { isMounted = false; };
  }, [profileId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-zinc-950 font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
      </div>
    );
  }

  if (!profile && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] dark:bg-zinc-950 font-sans">
        <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-200 dark:border-zinc-800 mb-6 flex items-center justify-center">
          <User className="w-10 h-10 text-zinc-300" />
        </div>
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white">Profile Not Found</h1>
        <p className="text-zinc-500 font-medium mt-2 mb-8">This professional may have removed their account.</p>
        <a href="/marketplace" className="h-12 px-8 bg-blue-600 text-white font-black rounded-full hover:bg-blue-700 transition-all flex items-center">
          Back to Marketplace
        </a>
      </div>
    );
  }

  const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "SkillSouq Professional";

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 font-sans pb-32">
      
      {/* --- CLEAN HERO COVER SECTION --- */}
      {/* Replaced the heavy dark gradient with a super clean, soft branded mesh to match the marketplace */}
      <div className="h-64 w-full relative bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent border-b border-zinc-100 dark:border-zinc-900">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-24 relative z-10">
        
        {/* --- MAIN PROFILE CARD --- */}
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-8 items-start">
          
          {/* AVATAR */}
          <div className="relative shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2rem] bg-zinc-100 dark:bg-zinc-800 border-4 border-white dark:border-zinc-900 flex items-center justify-center shadow-md relative overflow-hidden group">
               {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={fullName} className="w-full h-full object-cover" />
               ) : (
                  <span className="text-5xl md:text-7xl font-black text-zinc-300 dark:text-zinc-700">
                    {fullName.charAt(0).toUpperCase()}
                  </span>
               )}
            </div>
            {/* Online Status Dot */}
            <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 border-4 border-white dark:border-zinc-900 rounded-full" title="Online"></div>
          </div>

          {/* PROFILE DETAILS */}
          <div className="flex-1 w-full pt-2">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white tracking-tight mb-1">
                  {fullName}
                </h1>
                <p className="text-base font-bold text-blue-600 dark:text-blue-500">
                  {profile.professional_title || "SkillSouq Verified Partner"}
                </p>
              </div>
              
              <div className="shrink-0 flex flex-col gap-3 w-full md:w-auto">
                <a href={`/messages?to=${profile.id}&name=${encodeURIComponent(fullName)}`} className="w-full md:w-auto h-12 px-8 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-full font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm">
                  <MessageSquare className="w-4 h-4" /> Contact Provider
                </a>
              </div>
            </div>

            {/* PILL TAGS (Matched to Marketplace style) */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {profile.rating ? Number(profile.rating).toFixed(1) : "5.0"} Rating
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full">
                <MapPin className="w-3.5 h-3.5" /> Kingdom of Bahrain
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full">
                <Calendar className="w-3.5 h-3.5" /> Joined {new Date(profile.joined_at).getFullYear()}
              </div>
            </div>

            {/* BIO */}
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-3">About Me</h3>
              <p className="text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed text-sm whitespace-pre-wrap">
                {profile.bio || "This professional has not added a bio yet."}
              </p>
            </div>

            {/* --- 🌟 DYNAMIC EXPERTISE & LINKS SECTION --- */}
            {((profile.skills && profile.skills.length > 0) || (profile.languages && profile.languages.length > 0) || profile.website) && (
              <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-800">
                {/* Dynamic Skills/Expertise */}
                {profile.skills && profile.skills.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-500" /> Expertise & Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill: string) => (
                        <span key={skill} className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Languages */}
                  {profile.languages && profile.languages.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5">
                        <Languages className="w-3.5 h-3.5 text-emerald-500" /> Languages
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.languages.map((lang: string) => (
                          <span key={lang} className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-100 dark:border-emerald-800/50">
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Website */}
                  {profile.website && (
                    <div>
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-blue-500" /> Website
                      </h3>
                      <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
                        {profile.website.replace(/^https?:\/\//, '')} <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* --- THE GIGS PORTFOLIO --- */}
      <div className="max-w-5xl mx-auto px-6 mt-16">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Briefcase className="w-6 h-6 text-zinc-900 dark:text-white" />
            Active Services
          </h2>
          <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs font-black">
            {gigs.length} Gigs Available
          </span>
        </div>

        {gigs.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-12 text-center border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">No active services</h3>
            <p className="text-zinc-500 font-medium text-sm">This professional hasn't listed any services yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs.map((gig) => (
              
              <a 
                href={`/gig/${gig.id}`} 
                key={gig.id} 
                className="group bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col"
              >
                {/* MARKETPLACE STYLE IMAGE HEADER */}
                <div
                  className="h-48 bg-zinc-100 dark:bg-zinc-800 relative bg-cover bg-center shrink-0 border-b border-zinc-100 dark:border-zinc-800"
                  style={{ backgroundImage: `url(${gig.media_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800'})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  
                  {/* Badges layered on image exactly like the marketplace */}
                  <div className="absolute top-4 left-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-black text-zinc-900 dark:text-white shadow-sm">
                     <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> 5.0
                  </div>
                  <div className="absolute top-4 right-4 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full flex items-center gap-1 text-[10px] font-black uppercase tracking-widest shadow-sm">
                     <ShieldCheck className="w-3 h-3" /> Verified
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="px-3 py-1.5 bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/20">
                      {gig.category}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                    {gig.title}
                  </h3>
                  
                  {/* Clean up the description to remove markdown artifacts for the preview */}
                  <p className="text-sm font-medium text-zinc-500 mb-6 line-clamp-2 flex-1">
                    {gig?.description?.replace(/[*#]/g, '') || "Premium Service"}
                  </p>

                  <div className="flex items-end justify-between mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Starting at</p>
                      <p className="text-lg font-black text-zinc-900 dark:text-white">BHD {gig.price}</p>
                    </div>
                    {/* The signature circle arrow button */}
                    <div className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:-rotate-45 shadow-sm">
                       <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </a>

            ))}
          </div>
        )}
      </div>

    </div>
  );
}