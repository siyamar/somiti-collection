import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate, toBanglaDigits } from '../lib/format';
import {
  UserPlus,
  Edit2,
  KeyRound,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState('collector');
  const [formPassword, setFormPassword] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.users);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'ব্যবহারকারীদের তালিকা লোড করা যায়নি');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setFormName('');
    setFormPhone('');
    setFormRole('collector');
    setFormPassword('');
    setFormActive(true);
    setFormError('');
    setIsAddOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormPhone(u.phone);
    setFormRole(u.role);
    setFormActive(u.is_active);
    setFormError('');
  };

  const openResetModal = (u) => {
    setResettingUser(u);
    setFormPassword('');
    setFormError('');
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    try {
      await api.post('/users', {
        name: formName,
        phone: formPhone,
        password: formPassword,
        role: formRole,
      });
      setIsAddOpen(false);
      setSuccess('নতুন ব্যবহারকারী সফলভাবে তৈরি হয়েছে!');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'ব্যবহারকারী তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    try {
      await api.put(`/users/${editingUser.id}`, {
        name: formName,
        phone: formPhone,
        role: formRole,
        is_active: formActive,
      });
      setEditingUser(null);
      setSuccess('ব্যবহারকারীর তথ্য সফলভাবে হালনাগাদ হয়েছে!');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'হালনাগাদ করতে সমস্যা হয়েছে');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    try {
      await api.post(`/users/${resettingUser.id}/reset-password`, {
        new_password: formPassword,
      });
      setResettingUser(null);
      setSuccess('পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.id === currentUser?.id) {
      alert('আপনি নিজের একাউন্ট নিষ্ক্রিয় করতে পারবেন না।');
      return;
    }

    try {
      await api.put(`/users/${user.id}`, {
        name: user.name,
        phone: user.phone,
        role: user.role,
        is_active: !user.is_active,
      });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'অবস্থা পরিবর্তন করা সম্ভব হয়নি');
    }
  };

  const getInitial = (name) => (name ? name.trim().charAt(0) : 'ব');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header and Title (Matches design/23-users.png) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-bn text-2xl md:text-3xl font-bold text-ink tracking-tight">
            ব্যবহারকারী
          </h1>
          <p className="text-xs md:text-sm text-ink-light mt-1">
            যারা সিস্টেমে লগইন করেন: অ্যাডমিন ও মাঠকর্মী
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="h-btn px-4 bg-forest hover:bg-forest-light text-white text-sm font-medium rounded-btn flex items-center gap-2 shadow-sm transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>নতুন ব্যবহারকারী</span>
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-3 bg-ok-light text-ok border border-ok/20 rounded-btn text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-brick-light text-brick border border-brick/20 rounded-btn text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-line rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper border-b border-line text-xs font-semibold text-ink-light">
              <tr>
                <th className="py-3 px-4">নাম</th>
                <th className="py-3 px-4">মোবাইল (লগইন)</th>
                <th className="py-3 px-4 text-center">ভূমিকা</th>
                <th className="py-3 px-4 text-center">সক্রিয়</th>
                <th className="py-3 px-4">শেষ লগইন</th>
                <th className="py-3 px-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-ink-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-forest" />
                    ব্যবহারকারীদের তথ্য লোড হচ্ছে...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-ink-muted">
                    কোনো ব্যবহারকারী পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-paper/40 transition-colors">
                    {/* User Name & Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-saffron/15 text-saffron-dark font-serif-bn font-bold text-xs flex items-center justify-center border border-saffron/20 shrink-0">
                          {getInitial(u.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-ink">{u.name}</div>
                          {u.must_change_password && (
                            <span className="text-[10px] text-saffron bg-saffron-light px-1.5 py-0.2 rounded font-medium">
                              পাসওয়ার্ড রিসেট পেন্ডিং
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-mono-num text-ink">
                      {u.phone}
                    </td>

                    {/* Role Chip */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          u.role === 'admin'
                            ? 'bg-ink text-white'
                            : 'bg-line/70 text-ink-light'
                        }`}
                      >
                        {u.role === 'admin' ? 'অ্যাডমিন' : 'মাঠকর্মী'}
                      </span>
                    </td>

                    {/* Active Status Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        title={u.is_active ? 'সক্রিয় (নিষ্ক্রিয় করতে ক্লিক করুন)' : 'নিষ্ক্রিয় (সক্রিয় করতে ক্লিক করুন)'}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          u.is_active ? 'bg-ok' : 'bg-line'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            u.is_active ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Last Login */}
                    <td className="py-3.5 px-4 text-xs text-ink-muted">
                      {u.last_login_at
                        ? formatDate(u.last_login_at)
                        : 'এখনো লগইন করেননি'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-xs font-medium">
                        <button
                          onClick={() => openEditModal(u)}
                          className="text-forest hover:underline flex items-center gap-1"
                        >
                          সম্পাদনা
                        </button>
                        <span className="text-line">•</span>
                        <button
                          onClick={() => openResetModal(u)}
                          className="text-forest hover:underline flex items-center gap-1"
                        >
                          পাসওয়ার্ড রিসেট
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permissions Matrix Card (Matches design/23-users.png) */}
      <div className="bg-white border border-line rounded-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-line mb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-forest" />
            <h3 className="font-serif-bn font-bold text-base text-ink">
              ভূমিকা অনুযায়ী অনুমতি (Role Permissions)
            </h3>
          </div>
          <span className="text-[11px] font-mono-num text-ink-muted">
            কোডে নির্ধারিত · সার্ভার মিডলওয়্যারে যাচাইকৃত
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-ink-muted">
                <th className="pb-2 font-semibold">কার্যক্রমের বিবরণ</th>
                <th className="pb-2 text-center w-32 font-semibold">অ্যাডমিন</th>
                <th className="pb-2 text-center w-32 font-semibold">মাঠকর্মী (Collector)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              <tr>
                <td className="py-2.5 text-ink">সদস্য যোগ ও তথ্য সম্পাদনা</td>
                <td className="py-2.5 text-center text-ok font-bold">✓</td>
                <td className="py-2.5 text-center text-ok font-bold">✓</td>
              </tr>
              <tr>
                <td className="py-2.5 text-ink">দৈনিক কালেকশন শিট খোলা ও নিশ্চিতকরণ</td>
                <td className="py-2.5 text-center text-ok font-bold">✓</td>
                <td className="py-2.5 text-center text-ok font-bold">✓ (আজ ও গতকাল)</td>
              </tr>
              <tr>
                <td className="py-2.5 text-ink">নিশ্চিত শিটের তথ্য সংশোধন (Correction)</td>
                <td className="py-2.5 text-center text-ok font-bold">✓</td>
                <td className="py-2.5 text-center text-brick font-bold">✕</td>
              </tr>
              <tr>
                <td className="py-2.5 text-ink">দৈনিক ও মাসিক রিপোর্ট দেখা এবং এক্সেল ডাউনলোড</td>
                <td className="py-2.5 text-center text-ok font-bold">✓</td>
                <td className="py-2.5 text-center text-ok font-bold">✓</td>
              </tr>
              <tr>
                <td className="py-2.5 text-ink">ব্যবহারকারী পরিচালনা (Add/Edit Users)</td>
                <td className="py-2.5 text-center text-ok font-bold">✓</td>
                <td className="py-2.5 text-center text-brick font-bold">✕</td>
              </tr>
              <tr>
                <td className="py-2.5 text-ink">প্রতিষ্ঠানের সেটিংস ও SMS কনফিগারেশন</td>
                <td className="py-2.5 text-center text-ok font-bold">✓</td>
                <td className="py-2.5 text-center text-brick font-bold">✕</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-card border border-line w-full max-w-md p-6 relative">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold font-serif-bn text-ink mb-1">
              নতুন ব্যবহারকারী যোগ করুন
            </h3>
            <p className="text-xs text-ink-light mb-4">
              নতুন এডমিন বা মাঠকর্মীর তথ্য ও প্রাথমিক পাসওয়ার্ড সেট করুন।
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-brick-light text-brick text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-light mb-1">
                  পূর্ণ নাম <span className="text-brick">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="যেমন: ফারহানা ইয়াসমিন"
                  className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-light mb-1">
                  মোবাইল নম্বর (লগইন আইডি) <span className="text-brick">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm font-mono-num text-ink focus:outline-none focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-light mb-1">
                  ভূমিকা (Role) <span className="text-brick">*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                >
                  <option value="collector">মাঠকর্মী (Collector)</option>
                  <option value="admin">অ্যাডমিন (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-light mb-1">
                  প্রাথমিক পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) <span className="text-brick">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                  className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="h-btn px-4 border border-line text-ink-light hover:bg-paper rounded-btn text-sm"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-btn px-5 bg-forest text-white rounded-btn hover:bg-forest-light text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-card border border-line w-full max-w-md p-6 relative">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold font-serif-bn text-ink mb-1">
              ব্যবহারকারীর তথ্য সম্পাদনা
            </h3>
            <p className="text-xs text-ink-light mb-4">
              নাম, মোবাইল এবং ভূমিকা পরিবর্তন করুন।
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-brick-light text-brick text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-light mb-1">
                  পূর্ণ নাম <span className="text-brick">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-light mb-1">
                  মোবাইল নম্বর <span className="text-brick">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm font-mono-num text-ink focus:outline-none focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-light mb-1">
                  ভূমিকা (Role) <span className="text-brick">*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                >
                  <option value="collector">মাঠকর্মী (Collector)</option>
                  <option value="admin">অ্যাডমিন (Admin)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 text-forest border-line rounded focus:ring-forest accent-forest"
                />
                <label htmlFor="activeCheck" className="text-xs text-ink cursor-pointer font-medium">
                  ব্যবহারকারী সক্রিয় (Active) হিসেবে থাকবে
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="h-btn px-4 border border-line text-ink-light hover:bg-paper rounded-btn text-sm"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-btn px-5 bg-forest text-white rounded-btn hover:bg-forest-light text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'আপডেট হচ্ছে...' : 'আপডেট করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-card border border-line w-full max-w-md p-6 relative">
            <button
              onClick={() => setResettingUser(null)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 mb-2">
              <KeyRound className="w-5 h-5 text-forest" />
              <h3 className="text-lg font-bold font-serif-bn text-ink">
                পাসওয়ার্ড রিসেট করুন
              </h3>
            </div>
            <p className="text-xs text-ink-light mb-4">
              <strong>{resettingUser.name}</strong> ({resettingUser.phone})-এর জন্য নতুন পাসওয়ার্ড সেট করুন। তাকে পরবর্তী লগইনে বাধ্যতামূলক পাসওয়ার্ড পরিবর্তন করতে হবে।
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-brick-light text-brick text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-light mb-1">
                  নতুন সাময়িক পাসওয়ার্ড <span className="text-brick">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                  className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="h-btn px-4 border border-line text-ink-light hover:bg-paper rounded-btn text-sm"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="h-btn px-5 bg-forest text-white rounded-btn hover:bg-forest-light text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'রিসেট হচ্ছে...' : 'পাসওয়ার্ড রিসেট করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
