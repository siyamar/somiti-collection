import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ChangePasswordModal({ isOpen, onClose, forced = false }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('নতুন পাসওয়ার্ড দুটি মিলছে না।');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
      setTimeout(() => {
        onClose();
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-card border border-line w-full max-w-md p-6 relative">
        {!forced && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-paper transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-mint flex items-center justify-center text-forest">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-serif-bn text-ink">
              {forced ? 'পাসওয়ার্ড পরিবর্তন আবশ্যক' : 'পাসওয়ার্ড পরিবর্তন করুন'}
            </h3>
            <p className="text-xs text-ink-light">
              {forced
                ? 'আপনার নিরাপত্তার স্বার্থে প্রথমবার লগইনে পাসওয়ার্ড পরিবর্তন করতে হবে।'
                : 'আপনার একাউন্টের নতুন পাসওয়ার্ড সেট করুন।'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-brick-light text-brick text-sm rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-ok-light text-ok text-sm rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-light mb-1">
              বর্তমান পাসওয়ার্ড <span className="text-brick">*</span>
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-input px-3 bg-paper border border-line rounded-input focus:outline-none focus:border-forest text-sm font-sans"
              placeholder="বর্তমান পাসওয়ার্ড দিন"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-light mb-1">
              নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) <span className="text-brick">*</span>
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-input px-3 bg-paper border border-line rounded-input focus:outline-none focus:border-forest text-sm font-sans"
              placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-light mb-1">
              নতুন পাসওয়ার্ড পুনরায় নিশ্চিত করুন <span className="text-brick">*</span>
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-input px-3 bg-paper border border-line rounded-input focus:outline-none focus:border-forest text-sm font-sans"
              placeholder="নতুন পাসওয়ার্ড আবার লিখুন"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            {!forced && (
              <button
                type="button"
                onClick={onClose}
                className="h-btn px-4 border border-line text-ink-light hover:bg-paper rounded-btn text-sm"
              >
                বাতিল
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="h-btn px-5 bg-forest text-white rounded-btn hover:bg-forest-light transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
