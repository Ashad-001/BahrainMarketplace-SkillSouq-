"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { User, LogOut, Loader2, Bell, ArrowRightLeft, Circle, Trash2, Wallet } from "lucide-react";
import Logo from './Logo';
import LanguageSwitcher from './ClientOnlyLanguageSwitcher';
import ThemeToggle from './ClientOnlyThemeToggle';

/**
 * SKILL SOUQ - Auth-Aware Navigation Bar
 * Dynamically switches between Guest and User states.
 * Updated to use global Supabase script for reliability.
 */
export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<any>(null);
  const [activeRole, setActiveRole] = useState("buyer");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize Supabase and check session
  useEffect(() => {
    let isMounted = true;
    let channel: any;
    let authSubscription: any;

    const init = async () => {
      console.log("🔧 Navbar: Initializing Supabase client with SSR cookie persistence...");

      try {
        const client = createClient();
        setSupabase(client);
        console.log("✅ Navbar: Supabase client ready with SSR cookies");

        // Get current session
        const { data: { session } } = await client.auth.getSession();
        setUser(session?.user ?? null);
        setActiveRole(session?.user?.user_metadata?.active_role || "buyer");
        console.log("📋 Navbar: Session loaded, user:", session?.user?.email);

        if (session?.user) {
          const channelName = `global_notifications_${session.user.id}`;
          const existingChannel = (window as any).globalNavbarNotificationsChannel;

          if (existingChannel) {
            await client.removeChannel(existingChannel);
            (window as any).globalNavbarNotificationsChannel = null;
          }

          const { data: notifs } = await client
            .from('notifications')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(20);

          if (isMounted && notifs) setNotifications(notifs);

          channel = client
            .channel(channelName)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
              if (isMounted && payload.new.user_id === session.user.id) {
                setNotifications(prev => [payload.new, ...prev]);
              }
            });
          
          const { status } = await channel.subscribe();
          if (status === 'SUBSCRIBED' && isMounted) {
            (window as any).globalNavbarNotificationsChannel = channel;
          }
        }

        // Listen for auth changes (Login/Logout)
        const { data: { subscription } } = client.auth.onAuthStateChange((_event: any, session: any) => {
          console.log("🔄 Navbar: Auth state changed. Event:", _event, "User:", session?.user?.email);
          setUser(session?.user ?? null);
          setActiveRole(session?.user?.user_metadata?.active_role || "buyer");
        });
        authSubscription = subscription;
      } catch (err) {
        console.error("❌ Navbar Auth Error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe?.();
      if (channel && (window as any).globalSupabaseClient) {
        (window as any).globalSupabaseClient.removeChannel(channel);
        if ((window as any).globalNavbarNotificationsChannel === channel) {
          (window as any).globalNavbarNotificationsChannel = null;
        }
      }
    };
  }, []);

  // --- THE UPDATED ROLE SWITCHER ENGINE ---
  const toggleRole = async () => {
    if (!supabase || !user) return;
    setIsSwitching(true);
    
    const newRole = activeRole === 'buyer' ? 'seller' : 'buyer';
    setActiveRole(newRole);
    
    // Save the new role permanently in the database profile
    await supabase.auth.updateUser({ data: { active_role: newRole } });
    
    // Turn off the spinner, but DO NOT redirect!
    setIsSwitching(false);
  };

  const markAsRead = async (id: string, link: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (link) window.location.href = link;
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    setIsNotifOpen(false);
    await supabase.from('notifications').delete().eq('user_id', user.id);
  };

  const handleSignOut = async () => {
    try {
      if (!supabase) {
        console.error("❌ Supabase not initialized - waiting and retrying");
        // Wait a moment for Supabase to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!supabase) {
          alert("Database connection failed. Please refresh and try again.");
          return;
        }
      }
      console.log("🔐 Attempting sign out...");
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("❌ Sign out error:", error.message, error.code);
        alert("Sign out failed: " + (error.message || "Unknown error"));
        return;
      }
      
      console.log("✅ Sign out successful - clearing state and redirecting");
      setUser(null);
      
      // Clear localStorage to ensure no stale auth data
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to home
      window.location.href = "/";
    } catch (err: any) {
      console.error("❌ Sign out exception:", err.message, err); 
      alert("Sign out error: " + (err?.message || "Unknown error occurred"));
    }
  };

  const hasUnread = notifications.some(n => !n.is_read);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 dark:bg-zinc-950/80 dark:border-zinc-800 transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Logo Section */}
        <div className="flex items-center gap-8">
          <a href="/">
            <Logo />
          </a>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            <a href="/marketplace" className="hover:text-blue-600 transition-colors">Marketplace</a>
            <a href="/marketplace" className="hover:text-blue-600 transition-colors">Legal</a>
            <a href="/marketplace" className="hover:text-blue-600 transition-colors">IT & Tech</a>
          </div>
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <div className="hidden lg:flex items-center">
            <LanguageSwitcher />
          </div>
          
          <div className="hidden sm:block w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-2"></div>
          
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          ) : user ? (
            <div className="flex items-center gap-6 relative">
              
              {/* 1. THE MINIMAL ROLE SWITCHER (No bulky background) */}
              <div className="flex items-center gap-2.5">
                <button 
                  onClick={toggleRole}
                  disabled={isSwitching}
                  title="Swap Account Mode"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 shrink-0 ${activeRole === 'buyer' ? 'bg-blue-600 text-white shadow-blue-600/30' : 'bg-emerald-600 text-white shadow-emerald-600/30'} shadow-lg`}
                >
                  <ArrowRightLeft className={`w-4 h-4 ${isSwitching ? 'animate-spin' : ''}`} />
                </button>

                <button 
                  onClick={() => {
                    window.location.href = activeRole === 'buyer' ? '/buyer-dashboard' : '/seller-dashboard';
                  }}
                  className="text-xs font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-emerald-500 transition-colors"
                >
                  {activeRole === 'buyer' ? 'Buyer Dashboard' : 'Seller Dashboard'}
                </button>
              </div>

              {/* 2. THE ACTION ICONS (Locked side-by-side) */}
              <div className="flex items-center gap-1">
                {/* WALLET ICON */}
                <a 
                  href="/wallet" 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
                  title="Finance & Wallet"
                >
                  <Wallet className="w-5 h-5" />
                </a>

                {/* THE GLOBAL BELL ICON */}
                <div className="relative">
                  <button 
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors relative"
                  >
                    <Bell className="w-5 h-5" />
                    {hasUnread && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-zinc-950 rounded-full animate-pulse"></span>
                    )}
                  </button>

                  {/* NOTIFICATION DROPDOWN MENU */}
                  {isNotifOpen && (
                    <div className="absolute top-14 right-0 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-3xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in">
                      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
                        <h3 className="font-black text-zinc-900 dark:text-white text-sm">Notifications</h3>
                        {notifications.length > 0 && (
                          <button onClick={clearAllNotifications} className="text-[10px] font-bold text-red-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                            <Trash2 className="w-3 h-3"/> Clear All
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-80 overflow-y-auto no-scrollbar p-2">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-zinc-400">
                            <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs font-bold uppercase tracking-widest">You're all caught up!</p>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <button 
                              key={n.id}
                              onClick={() => markAsRead(n.id, n.link)}
                              className={`w-full text-left p-3 rounded-2xl transition-colors flex items-start gap-3 group ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                            >
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? (n.type === 'payment' ? 'bg-emerald-500' : n.type === 'order' ? 'bg-blue-500' : 'bg-purple-500') : 'bg-zinc-300 dark:bg-zinc-700'}`}></div>
                              <div>
                                <p className={`text-sm mb-0.5 leading-tight ${!n.is_read ? 'font-black text-zinc-900 dark:text-white' : 'font-bold text-zinc-600 dark:text-zinc-400'}`}>{n.title}</p>
                                <p className="text-xs font-medium text-zinc-500 line-clamp-2 leading-relaxed">{n.message}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. PROFILE SECTION */}
              <div className="flex items-center gap-3 pl-2 border-l border-zinc-100 dark:border-zinc-800">
                <div className="flex flex-col items-end hidden md:flex">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[120px]">
                    {user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-tighter">Premium Member</span>
                </div>

                <div className="group relative">
                  <button className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:ring-2 ring-blue-600 transition-all">
                    <User className="w-5 h-5 text-zinc-600" />
                  </button>

                  <div className="absolute right-0 top-full pt-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all translate-y-1 group-hover:translate-y-0">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 w-48 overflow-hidden">
                      <a href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                        <User className="w-4 h-4" /> Profile
                      </a>
                      <button 
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors mt-1"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex items-center gap-3">
              <a href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 px-3 hidden sm:block">
                Become a Seller
              </a>
              <a href="/login">
                <button className="text-sm font-medium rounded-full px-5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  Log In
                </button>
              </a>
              <a href="/login">
                <button className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 rounded-full px-6 py-2 text-sm font-medium shadow-lg active:scale-[0.98] transition-all">
                  Join Now
                </button>
              </a>
            </div>
          )}
        </div>

        {/* 📱 MOBILE ONLY: Profile Pic + Hamburger */}
        <div className="flex md:hidden items-center gap-4">
          {user && (
            <Link href="/profile">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm cursor-pointer">
                {user.email?.[0]?.toUpperCase()}
              </div>
            </Link>
          )}

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-zinc-900 dark:text-white p-2 focus:outline-none"
          >
            {isMobileMenuOpen ? (
              /* ❌ The 'X' Icon (Shows when menu is open) */
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              /* 🍔 The Hamburger Icon (Shows when menu is closed) */
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

      </div>

      {/* 📱 THE MOBILE DROPDOWN MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full h-[100vh] overflow-y-auto no-scrollbar bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl z-50 pb-32">
          
          <div className="flex-1 flex flex-col p-6 gap-4">
            
            {/* Section 1: Navigation Categories */}
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Browse</p>
              <a href="/marketplace" onClick={() => setIsMobileMenuOpen(false)} className="block text-zinc-900 dark:text-white text-sm font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-2">
                Marketplace
              </a>
            </div>

            <div className="h-px w-full bg-zinc-200 dark:bg-zinc-700"></div>

            {/* Section 2: Account & Role */}
            {user ? (
              <>
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Account</p>
                  
                  <button 
                    onClick={() => {
                      toggleRole();
                      setTimeout(() => {
                        window.location.href = activeRole === 'buyer' ? '/seller-dashboard' : '/buyer-dashboard';
                      }, 500);
                    }}
                    disabled={isSwitching}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                  >
                    <ArrowRightLeft className={`w-4 h-4 ${isSwitching ? 'animate-spin' : ''}`} />
                    {activeRole === 'buyer' ? 'BUYER DASHBOARD' : 'SELLER DASHBOARD'}
                  </button>
                </div>

                <div className="h-px w-full bg-zinc-200 dark:bg-zinc-700"></div>

                {/* Section 3: Quick Actions */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Quick Actions</p>
                  
                  <a href="/wallet" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between py-2 text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <span className="text-sm font-semibold">Wallet</span>
                    <Wallet className="w-5 h-5 text-zinc-400" />
                  </a>

                  <button 
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    className="w-full flex items-center justify-between py-2 text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <span className="text-sm font-semibold">Notifications</span>
                    <div className="relative">
                      <Bell className="w-5 h-5 text-zinc-400" />
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                      )}
                    </div>
                  </button>
                </div>

                <div className="h-px w-full bg-zinc-200 dark:bg-zinc-700"></div>

                {/* Section 4: Settings */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Settings</p>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">Theme</span>
                    <ThemeToggle />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">Language</span>
                    <LanguageSwitcher />
                  </div>
                </div>

                <div className="h-px w-full bg-zinc-200 dark:bg-zinc-700 mt-auto"></div>

                {/* Section 5: User Profile & Logout */}
                <div className="space-y-3 pt-2">
                  <Link 
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2 px-3 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {user.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold">{user.email?.split('@')[0]}</p>
                      <p className="text-xs text-zinc-500">View Profile</p>
                    </div>
                  </Link>

                  <button 
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 text-red-600 font-bold py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    SIGN OUT
                  </button>
                </div>
              </>
            ) : (
              <>
                <a href="/login" onClick={() => setIsMobileMenuOpen(false)} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold py-3 rounded-xl w-full hover:bg-zinc-800 dark:hover:bg-gray-100 transition-colors text-sm">
                  Log In
                </a>
                <a href="/login" onClick={() => setIsMobileMenuOpen(false)} className="bg-blue-600 text-white flex items-center justify-center font-bold py-3 rounded-xl w-full hover:bg-blue-700 transition-colors text-sm">
                  Join Now
                </a>
              </>
            )}
          </div>
        </div>
      )}

    </nav>
  );
}
