import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from '../components/ChangePasswordModal';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  FileSpreadsheet,
  UserCheck,
  Settings,
  LogOut,
  Bell,
  Search,
  KeyRound,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';

export default function MainLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // User initials for avatar circle
  const getInitial = (name) => {
    if (!name) return 'স';
    return name.trim().charAt(0);
  };

  const navItems = [
    {
      to: '/dashboard',
      label: 'ড্যাশবোর্ড',
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      to: '/collections',
      label: 'দৈনিক কালেকশন',
      icon: CalendarCheck,
      adminOnly: false,
    },
    {
      to: '/members',
      label: 'সদস্য',
      icon: Users,
      adminOnly: false,
    },
    {
      to: '/reports',
      label: 'রিপোর্ট',
      icon: FileSpreadsheet,
      adminOnly: false,
    },
    {
      to: '/users',
      label: 'ব্যবহারকারী',
      icon: UserCheck,
      adminOnly: true,
    },
    {
      to: '/settings',
      label: 'সেটিংস',
      icon: Settings,
      adminOnly: true,
    },
  ];

  const filteredNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Forced change password modal if required */}
      <ChangePasswordModal
        isOpen={user?.must_change_password || isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        forced={Boolean(user?.must_change_password)}
      />

      {/* Desktop Sidebar (228px, forest background) */}
      <aside className="hidden lg:flex w-sidebar flex-col justify-between bg-forest text-white shrink-0 min-h-screen p-4 border-r border-forest-light select-none">
        <div>
          {/* Logo & Org Name */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <img
              src="/logo.png"
              alt="সবুজ বাংলা লোগো"
              className="w-9 h-9 rounded-full bg-white p-0.5 object-contain"
            />
            <div>
              <h2 className="font-serif-bn font-bold text-base text-white leading-tight">
                সবুজ বাংলা
              </h2>
              <span className="text-[11px] text-mint/70 block">
                সমবায় সমিতি লিঃ
              </span>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-mint/50 px-3 uppercase tracking-wider mb-2">
            মেনু
          </div>

          {/* Nav List */}
          <nav className="space-y-1.5">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-paper text-forest font-bold shadow-sm'
                      : 'text-white/80 hover:bg-forest-light hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-forest' : 'text-mint'}`} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom system status */}
        <div className="px-3 py-3 border-t border-forest-light/60">
          <div className="flex items-center gap-2 text-xs text-mint/80">
            <span className="w-2 h-2 rounded-full bg-ok animate-pulse"></span>
            <span>সার্ভার সক্রিয়</span>
          </div>
          <div className="text-[10px] text-mint/50 mt-1 font-mono-num">
            ভার্সন ১.০ · ঢাকা
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-64 bg-forest text-white h-full p-4 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-forest-light">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="লোগো" className="w-8 h-8 rounded-full bg-white p-0.5" />
                  <span className="font-serif-bn font-bold text-base">সবুজ বাংলা</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded text-mint hover:bg-forest-light"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5 mt-6">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.to);

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium ${
                        isActive
                          ? 'bg-paper text-forest font-bold'
                          : 'text-white/80 hover:bg-forest-light'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-brick-light hover:bg-forest-light"
            >
              <LogOut className="w-4 h-4" />
              <span>লগআউট</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (Matches design/03-dashboard.png) */}
        <header className="h-16 bg-paper border-b border-line px-4 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white text-ink"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick Search Input */}
            <div className="relative hidden sm:block w-72 md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="সদস্যের নাম, কোড বা মোবাইল..."
                className="w-full h-9 pl-9 pr-14 bg-white border border-line rounded-input text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-forest"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono-num bg-paper border border-line px-1.5 py-0.5 rounded text-ink-muted">
                Ctrl K
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Notification Icon */}
            <button
              title="বিজ্ঞপ্তি"
              className="w-9 h-9 rounded-full bg-white border border-line flex items-center justify-center text-ink-light hover:text-forest hover:bg-paper transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-saffron absolute top-2 right-2"></span>
            </button>

            {/* User Profile Pill / Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-full bg-white border border-line hover:border-forest/40 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-saffron/20 text-saffron-dark font-serif-bn font-bold text-xs flex items-center justify-center border border-saffron/30">
                  {getInitial(user?.name)}
                </div>
                <div className="text-left hidden md:block leading-tight pr-1">
                  <div className="text-xs font-bold text-ink">
                    {user?.name || 'ব্যবহারকারী'}
                  </div>
                  <div className="text-[10px] text-ink-muted capitalize">
                    {user?.role === 'admin' ? 'এডমিন' : 'মাঠকর্মী'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white border border-line rounded-card shadow-lg py-1.5 z-50 text-xs"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <div className="px-3.5 py-2 border-b border-line">
                    <div className="font-bold text-ink">{user?.name}</div>
                    <div className="text-[10px] font-mono-num text-ink-muted">{user?.phone}</div>
                  </div>

                  <button
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="w-full text-left px-3.5 py-2 hover:bg-paper flex items-center gap-2 text-ink"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-forest" />
                    <span>পাসওয়ার্ড পরিবর্তন</span>
                  </button>

                  <button
                    onClick={logout}
                    className="w-full text-left px-3.5 py-2 hover:bg-brick-light text-brick flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>লগআউট</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
