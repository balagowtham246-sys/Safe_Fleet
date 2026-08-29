import React from 'react';
import {
  ShieldAlert,
  Activity,
  Users,
  Truck,
  History,
  BarChart3,
  Volume2,
  VolumeX,
  PlayCircle,
  Radio,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { ActiveNavTab, UserProfile } from '../types';
import { audioAlerts } from '../utils/audioAlerts';
import { auth, signOut, User } from '../lib/firebase';

interface NavbarProps {
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  criticalEventCount: number;
  isAudioMuted: boolean;
  setIsAudioMuted: (muted: boolean) => void;
  onOpenDemoScript: () => void;
  currentUser?: User | null;
  userProfile?: UserProfile | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  criticalEventCount,
  isAudioMuted,
  setIsAudioMuted,
  onOpenDemoScript,
  currentUser,
  userProfile,
}) => {
  const toggleSound = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    audioAlerts.isMuted = next;
    if (!next) {
      audioAlerts.playCautionChime();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const navItems: { id: ActiveNavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'monitoring', label: 'Live Monitoring', icon: Radio },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'vehicles', label: 'Vehicles', icon: Truck },
    { id: 'events', label: 'Safety Events', icon: History },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#1E293B]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-md shadow-blue-900/30">
            SF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold uppercase tracking-tight text-white">SafeFleet AI</span>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                MVP v1.0
              </span>
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                17 TRIPS ACTIVE
              </span>
            </div>
            <p className="hidden text-[10px] text-slate-400 sm:block uppercase tracking-wider">
              Real-Time Driver Safety &amp; Risk Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 rounded-lg bg-slate-900/70 p-1 border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.id === 'events' && criticalEventCount > 0 && (
                  <span className="ml-1 rounded-full bg-red-500/30 border border-red-500/60 px-1.5 py-0.2 text-[10px] font-bold text-red-300 animate-pulse">
                    {criticalEventCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Controls & Safety Manager Info */}
        <div className="flex items-center gap-3">
          {/* Hackathon Guide Modal Button */}
          <button
            id="btn-hackathon-demo-script"
            onClick={onOpenDemoScript}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all shadow-sm"
          >
            <PlayCircle className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">2-Min Script</span>
          </button>

          {/* Sound Alert Toggle */}
          <button
            id="btn-toggle-sound"
            onClick={toggleSound}
            title={isAudioMuted ? 'Unmute in-cab warning alerts' : 'Mute sound alerts'}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
              isAudioMuted
                ? 'border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300'
                : 'border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
            }`}
          >
            {isAudioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Safety Manager / User Profile Indicator with Firebase Auth */}
          <div className="hidden sm:flex items-center gap-2.5 border-l border-slate-700 pl-3">
            <div className="flex items-center gap-2 text-left">
              <div className="text-right">
                <p className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                  {userProfile?.name || currentUser?.displayName || 'Sarah Jenkins'}
                </p>
                <div className="flex items-center justify-end gap-1">
                  <ShieldCheck className="h-3 w-3 text-blue-400" />
                  <span className="text-[10px] text-blue-400 font-semibold uppercase">
                    Fleet Manager
                  </span>
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-900/60 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-200">
                {userProfile?.name ? userProfile.name.slice(0, 2).toUpperCase() : 'SJ'}
              </div>
            </div>

            {/* Logout button */}
            <button
              id="btn-manager-logout"
              onClick={handleSignOut}
              title="Sign Out"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:bg-red-950/40 hover:border-red-500/40 hover:text-red-300 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="flex lg:hidden overflow-x-auto border-t border-slate-800 bg-[#1E293B] px-3 py-2 gap-1.5 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};

