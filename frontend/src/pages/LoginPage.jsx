import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Send, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Normalize phone number (strip whitespace, dashes, +88 prefix if entered)
    let cleanPhone = phone.trim().replace(/[\s-]/g, '');
    if (cleanPhone.startsWith('+88')) cleanPhone = cleanPhone.slice(3);
    if (cleanPhone.startsWith('88')) cleanPhone = cleanPhone.slice(2);

    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      setError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01700000000)');
      return;
    }

    if (!password) {
      setError('অনুগ্রহ করে আপনার পাসওয়ার্ড প্রদান করুন');
      return;
    }

    setLoading(true);
    try {
      await login(cleanPhone, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.error?.message ||
        'লগইন ব্যর্থ হয়েছে। মোবাইল নম্বর ও পাসওয়ার্ড সঠিক কিনা পরীক্ষা করুন।'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper">
      {/* Left Branding Column (Matches design/01-login.png) */}
      <div className="relative w-full lg:w-1/2 bg-forest text-white flex flex-col justify-between p-8 md:p-14 overflow-hidden min-h-[460px] lg:min-h-screen">
        {/* Subtle background ledger lines */}
        <div className="absolute inset-0 opacity-5 pointer-events-none flex flex-col justify-between">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-full border-b border-white" />
          ))}
        </div>
        {/* Red ledger vertical margin line */}
        <div className="absolute top-0 bottom-0 left-8 md:left-14 w-[1.5px] bg-[#E29587]/30 pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10 flex items-center gap-3.5 pl-6">
          <img
            src="/logo.png"
            alt="লোগো"
            className="w-12 h-12 rounded-full bg-white p-1 object-contain shadow-sm"
          />
          <div>
            <h1 className="font-serif-bn font-bold text-xl tracking-wide text-white">
              সবুজ বাংলা
            </h1>
            <p className="text-mint/80 text-xs font-sans">
              দৈনিক সঞ্চয় ও কালেকশন ব্যবস্থাপনা
            </p>
          </div>
        </div>

        {/* Middle Value Proposition */}
        <div className="relative z-10 pl-6 my-auto py-8">
          <span className="text-saffron font-bold text-xs uppercase tracking-wider">
            খাতা থেকে স্ক্রিনে
          </span>
          <h2 className="font-serif-bn text-3xl md:text-5xl font-bold leading-tight mt-2 text-white">
            প্রতিদিনের কিস্তি,<br />
            নির্ভুল হিসাব।
          </h2>
          <p className="text-mint/90 text-sm md:text-base leading-relaxed mt-4 max-w-lg">
            মাঠকর্মী এক পাতায় পুরো সমিতির জমা তুলবেন, আর প্রত্যেক সদস্যের মোবাইলে সাথে সাথে পৌঁছে যাবে জমার SMS।
          </p>

          {/* KPI Snapshot Cards */}
          <div className="flex flex-wrap items-center gap-4 mt-8">
            <div className="bg-forest-medium/60 border border-forest-light/60 rounded-card p-4 max-w-[230px]">
              <span className="text-[11px] text-mint/80 block">আজকের SMS</span>
              <p className="text-xs text-white mt-1 leading-snug font-medium">
                রহিমা বেগম, আজ ৳ ২০০ জমা হয়েছে। মোট জমা ৳ ১২,৪০০।
              </p>
            </div>

            <div className="bg-saffron text-ink rounded-card p-4 min-w-[170px] shadow-sm">
              <span className="text-[11px] text-ink/80 block font-medium">আজকের কালেকশন</span>
              <div className="text-2xl font-bold font-mono-num mt-1 text-ink">
                ৳ ৮৬,৪৫০
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright in sidebar */}
        <div className="relative z-10 pl-6 text-xs text-mint/60">
          সবুজ বাংলা সমবায় সমিতি লিঃ · সকল লেনদেন সুরক্ষিত
        </div>
      </div>

      {/* Right Form Column */}
      <div className="w-full lg:w-1/2 bg-paper flex items-center justify-center p-6 md:p-14">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="font-serif-bn text-3xl font-bold text-ink tracking-tight">
              লগইন করুন
            </h2>
            <p className="text-ink-light text-sm mt-1.5">
              আপনার নিবন্ধিত মোবাইল নম্বর ও পাসওয়ার্ড দিন
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-brick-light text-brick border border-brick/20 rounded-btn text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-ink-light mb-1.5">
                মোবাইল নম্বর <span className="text-brick">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-mono-num text-ink-muted select-none">
                  +৮৮
                </span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01700000000"
                  className="w-full h-input pl-12 pr-4 bg-white border border-line rounded-input focus:outline-none focus:border-forest text-sm font-mono-num text-ink"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-ink-light">
                  পাসওয়ার্ড <span className="text-brick">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert('পাসওয়ার্ড ভুলে গেলে অনুগ্রহ করে প্রধান এডমিনের সাথে যোগাযোগ করুন।')}
                  className="text-xs text-forest font-medium hover:underline"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-input px-4 pr-11 bg-white border border-line rounded-input focus:outline-none focus:border-forest text-sm text-ink"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-ink-muted hover:text-ink p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-light">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-forest border-line focus:ring-forest accent-forest"
                />
                <span>এই ডিভাইসে লগইন রাখুন</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-btn bg-forest hover:bg-forest-light text-white font-medium rounded-btn transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <span>{loading ? 'লগইন হচ্ছে...' : 'লগইন'}</span>
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Security alert footnote */}
          <div className="mt-8 p-3.5 bg-brick-light text-brick border border-brick/20 rounded-btn flex items-center gap-2.5 text-xs">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>৫ বার ভুল পাসওয়ার্ড দিলে ১৫ মিনিটের জন্য লগইন বন্ধ থাকবে</span>
          </div>

          <div className="mt-12 text-center text-xs text-ink-muted">
            © সবুজ বাংলা সমবায় সমিতি লিঃ · সংস্করণ ১.০
          </div>
        </div>
      </div>
    </div>
  );
}
