import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api/client';
import {
  Building2,
  MessageSquare,
  FileText,
  History,
  Upload,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Smartphone,
  Info,
  Clock,
  RotateCw,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('gateway'); // 'org' | 'gateway' | 'template' | 'logs'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Form State
  const [formData, setFormData] = useState({
    org_name: '',
    org_short: '',
    org_address: '',
    org_phone: '',
    logo_path: '/logo.png',
    sms_enabled: '1',
    sms_api_url: '',
    sms_api_key: '',
    sms_sender_id: '',
    sms_template: '{name}, আজ {date} ৳{amount} জমা হয়েছে। আপনার মোট জমা ৳{total}। -{org}',
  });

  // Editing API key toggle
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);

  // Logo upload state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  // Test SMS state
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // SMS Logs tab state
  const [smsLogs, setSmsLogs] = useState([]);
  const [smsLogsLoading, setSmsLogsLoading] = useState(false);
  const [smsFilter, setSmsFilter] = useState('');
  const [smsPage, setSmsPage] = useState(1);
  const [smsPagination, setSmsPagination] = useState({ total: 0, totalPages: 1 });
  const [retryingId, setRetryingId] = useState(null);

  // Fetch initial settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data?.settings) {
        setFormData((prev) => ({
          ...prev,
          ...res.data.settings,
        }));
        if (res.data.settings.logo_path) {
          setLogoPreview(res.data.settings.logo_path);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'সেটিংস লোড করতে সমস্যা হয়েছে।',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Fetch SMS Logs when logs tab is opened or filters change
  const fetchSmsLogs = async (page = 1, status = smsFilter) => {
    try {
      setSmsLogsLoading(true);
      const params = { page, limit: 15 };
      if (status) params.status = status;
      const res = await api.get('/sms', { params });
      setSmsLogs(res.data.items || []);
      setSmsPagination(res.data.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch SMS logs:', err);
    } finally {
      setSmsLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchSmsLogs(smsPage, smsFilter);
    }
  }, [activeTab, smsPage, smsFilter]);

  // Handle general field change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? '1' : '0') : value,
    }));
  };

  // Save Settings
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setStatusMessage(null);

      const payload = { ...formData };
      // If not editing API key and it contains masking dots, don't overwrite
      if (!isEditingApiKey && payload.sms_api_key.includes('•••')) {
        delete payload.sms_api_key;
      }

      const res = await api.put('/settings', payload);
      setStatusMessage({
        type: 'success',
        text: res.data?.message || 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে।',
      });
      setIsEditingApiKey(false);
      // Re-fetch to get cleanly formatted values
      fetchSettings();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।',
      });
    } finally {
      setSaving(false);
    }
  };

  // Logo file selection & upload
  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    try {
      setUploadingLogo(true);
      const data = new FormData();
      data.append('logo', logoFile);

      const res = await api.post('/settings/logo', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStatusMessage({
        type: 'success',
        text: res.data?.message || 'লোগো সফলভাবে পরিবর্তন করা হয়েছে।',
      });
      setFormData((prev) => ({ ...prev, logo_path: res.data.logo_path }));
      setLogoFile(null);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'লোগো আপলোড ব্যর্থ হয়েছে।',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Send Test SMS
  const handleSendTestSms = async () => {
    if (!testPhone.trim()) {
      setTestResult({ success: false, message: 'একটি ১১ ডিজিটের মোবাইল নম্বর দিন।' });
      return;
    }
    try {
      setSendingTest(true);
      setTestResult(null);
      const res = await api.post('/settings/sms-test', { phone: testPhone.trim() });
      setTestResult({
        success: true,
        message: res.data?.message || 'টেস্ট SMS সফলভাবে কিউতে যুক্ত হয়েছে।',
      });
      if (activeTab === 'logs') {
        fetchSmsLogs(1);
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.error?.message || 'টেস্ট SMS পাঠাতে ত্রুটি হয়েছে।',
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Retry Failed SMS
  const handleRetrySms = async (id) => {
    try {
      setRetryingId(id);
      await api.post(`/sms/${id}/retry`);
      fetchSmsLogs(smsPage, smsFilter);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'পুনরায় চেষ্টা করতে সমস্যা হয়েছে।');
    } finally {
      setRetryingId(null);
    }
  };

  // Add variable chip to template
  const insertVariable = (variable) => {
    setFormData((prev) => ({
      ...prev,
      sms_template: prev.sms_template + variable,
    }));
  };

  // Live Phone Simulator & Character calculation
  const sampleData = {
    name: 'রহিমা বেগম',
    member_code: 'M-0001',
    date: '১৬/১০/২০২৬',
    amount: '১০০',
    total: '৪,৮৫০',
    org: formData.org_short || 'সবুজ বাংলা',
  };

  const renderedTemplate = useMemo(() => {
    let t = formData.sms_template || '';
    t = t.replace(/{name}/g, sampleData.name);
    t = t.replace(/{member_code}/g, sampleData.member_code);
    t = t.replace(/{date}/g, sampleData.date);
    t = t.replace(/{amount}/g, sampleData.amount);
    t = t.replace(/{total}/g, sampleData.total);
    t = t.replace(/{org}/g, sampleData.org);
    return t;
  }, [formData.sms_template, formData.org_short]);

  const charCount = renderedTemplate.length;
  // Unicode SMS calculation: 1 part <= 70 chars, multi-part 67 chars each
  const isUnicode = /[^\u0000-\u007F]/.test(renderedTemplate);
  const smsParts = isUnicode
    ? charCount <= 70
      ? 1
      : Math.ceil(charCount / 67)
    : charCount <= 160
    ? 1
    : Math.ceil(charCount / 153);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-forest animate-spin mb-3" />
        <p className="text-sm text-ink-light">সেটিংস লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Breadcrumb */}
      <div>
        <div className="text-xs text-ink-light mb-1">
          সেটিংস /{' '}
          {activeTab === 'org'
            ? 'প্রতিষ্ঠানের তথ্য'
            : activeTab === 'gateway'
            ? 'SMS গেটওয়ে'
            : activeTab === 'template'
            ? 'SMS টেমপ্লেট'
            : 'SMS হিস্ট্রি'}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif-bn text-2xl md:text-3xl font-bold text-ink">
              সেটিংস
            </h1>
            <p className="text-xs text-ink-light mt-0.5">
              শুধু অ্যাডমিন দেখতে ও পরিবর্তন করতে পারবেন
            </p>
          </div>

          {activeTab !== 'logs' && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-btn px-5 bg-forest hover:bg-forest-light text-white text-sm font-medium rounded-btn flex items-center gap-2 shadow-sm transition-colors self-start sm:self-auto disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              সংরক্ষণ করুন
            </button>
          )}
        </div>
      </div>

      {/* Alert / Notification banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-card text-sm flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-mint/15 text-forest border border-mint/40'
              : 'bg-wine/10 text-wine border border-wine/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs underline ml-4 hover:opacity-80"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* Main Grid: Left Tabs & Right Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Tabs (Matching design/24-settings.png) */}
        <div className="md:col-span-3 space-y-1 bg-white p-2 border border-line rounded-card shadow-sm">
          <button
            onClick={() => {
              setActiveTab('org');
              setStatusMessage(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-colors text-left ${
              activeTab === 'org'
                ? 'bg-paper text-forest font-semibold shadow-xs'
                : 'text-ink-muted hover:bg-paper/60 hover:text-ink'
            }`}
          >
            <Building2 className="w-4 h-4 text-forest" />
            প্রতিষ্ঠানের তথ্য
          </button>

          <button
            onClick={() => {
              setActiveTab('gateway');
              setStatusMessage(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-colors text-left ${
              activeTab === 'gateway'
                ? 'bg-paper text-forest font-semibold shadow-xs'
                : 'text-ink-muted hover:bg-paper/60 hover:text-ink'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-forest" />
            SMS গেটওয়ে
          </button>

          <button
            onClick={() => {
              setActiveTab('template');
              setStatusMessage(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-colors text-left ${
              activeTab === 'template'
                ? 'bg-paper text-forest font-semibold shadow-xs'
                : 'text-ink-muted hover:bg-paper/60 hover:text-ink'
            }`}
          >
            <FileText className="w-4 h-4 text-forest" />
            SMS টেমপ্লেট
          </button>

          <button
            onClick={() => {
              setActiveTab('logs');
              setStatusMessage(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-colors text-left ${
              activeTab === 'logs'
                ? 'bg-paper text-forest font-semibold shadow-xs'
                : 'text-ink-muted hover:bg-paper/60 hover:text-ink'
            }`}
          >
            <History className="w-4 h-4 text-forest" />
            SMS হিস্ট্রি ও কিউ
          </button>
        </div>

        {/* Right Content Area */}
        <div className="md:col-span-9 space-y-6">
          {/* TAB 1: প্রতিষ্ঠানের তথ্য (Organization Info & Logo) */}
          {activeTab === 'org' && (
            <div className="space-y-6">
              {/* Logo Card */}
              <div className="bg-white border border-line rounded-card p-6 shadow-sm">
                <h3 className="font-serif-bn font-bold text-lg text-ink mb-1">
                  প্রতিষ্ঠানের লোগো
                </h3>
                <p className="text-xs text-ink-light mb-4">
                  সাইডবার, লগইন স্ক্রিন এবং প্রিন্টেবল হিসাব বিবরণীতে এই লোগো ব্যবহৃত হবে (PNG বা JPG, সর্বোচ্চ ২ মেগাবাইট)
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative w-24 h-24 rounded-card bg-paper border border-line p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    <img
                      src={logoPreview || formData.logo_path || '/logo.png'}
                      alt="প্রতিষ্ঠানের লোগো"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="space-y-3 w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-btn px-4 bg-paper hover:bg-paper-dark border border-line text-ink text-xs font-medium rounded-btn flex items-center gap-2 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-forest" />
                        লোগো ফাইল নির্বাচন করুন
                      </button>

                      {logoFile && (
                        <button
                          type="button"
                          onClick={handleLogoUpload}
                          disabled={uploadingLogo}
                          className="h-btn px-4 bg-forest hover:bg-forest-light text-white text-xs font-medium rounded-btn flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          {uploadingLogo ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          লোগো আপলোড ও সংরক্ষণ
                        </button>
                      )}
                    </div>
                    {logoFile && (
                      <p className="text-xs text-ink-light">
                        নির্বাচিত ফাইল: <span className="font-mono text-ink">{logoFile.name}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Organization Details Card */}
              <div className="bg-white border border-line rounded-card p-6 shadow-sm">
                <h3 className="font-serif-bn font-bold text-lg text-ink mb-1">
                  সংস্থার সাধারণ তথ্য
                </h3>
                <p className="text-xs text-ink-light mb-5">
                  সমিতির নাম ও যোগাযোগের ঠিকানা
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      প্রতিষ্ঠানের পূর্ণ নাম *
                    </label>
                    <input
                      type="text"
                      name="org_name"
                      value={formData.org_name}
                      onChange={handleChange}
                      className="w-full h-input px-3 bg-paper border border-line rounded-btn text-sm text-ink focus:outline-none focus:border-forest"
                      placeholder="সবুজ বাংলা সমবায় সমিতি লিঃ"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      সংক্ষিপ্ত নাম *
                    </label>
                    <input
                      type="text"
                      name="org_short"
                      value={formData.org_short}
                      onChange={handleChange}
                      className="w-full h-input px-3 bg-paper border border-line rounded-btn text-sm text-ink focus:outline-none focus:border-forest"
                      placeholder="সবুজ বাংলা"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      অফিসের ঠিকানা
                    </label>
                    <input
                      type="text"
                      name="org_address"
                      value={formData.org_address}
                      onChange={handleChange}
                      className="w-full h-input px-3 bg-paper border border-line rounded-btn text-sm text-ink focus:outline-none focus:border-forest"
                      placeholder="বাজার মোড়, থানা রোড, উপজেলা"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      অফিসিয়াল ফোন নম্বর
                    </label>
                    <input
                      type="text"
                      name="org_phone"
                      value={formData.org_phone}
                      onChange={handleChange}
                      className="w-full h-input px-3 bg-paper border border-line rounded-btn text-sm text-ink focus:outline-none focus:border-forest"
                      placeholder="০১৭১১-২২৩৩৪৪"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-btn px-6 bg-forest hover:bg-forest-light text-white text-sm font-medium rounded-btn flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                  >
                    {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    সংরক্ষণ করুন
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SMS গেটওয়ে (SMS Gateway) - Matching design/24-settings.png */}
          {activeTab === 'gateway' && (
            <div className="space-y-6">
              {/* Primary Gateway Card */}
              <div className="bg-white border border-line rounded-card p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-serif-bn font-bold text-lg text-ink">
                      SMS গেটওয়ে সংযোগ
                    </h3>
                    <p className="text-xs text-ink-light">
                      বাংলাদেশি যেকোনো HTTP API ভিত্তিক গেটওয়ে (BulkSMSBD, Greenweb, Alpha SMS ইত্যাদি)
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-mint/15 text-forest border border-mint/30 rounded-full text-xs font-medium self-start sm:self-auto">
                    <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
                    সংযুক্ত · ড্রাইভার: ফেইক কনসোল (Fake Mode)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      গেটওয়ে প্রোভাইডার *
                    </label>
                    <select
                      disabled
                      className="w-full h-input px-3 bg-paper/60 border border-line rounded-btn text-sm text-ink cursor-not-allowed"
                    >
                      <option>কাস্টম HTTP API</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      Sender ID / মাস্কিং
                    </label>
                    <input
                      type="text"
                      name="sms_sender_id"
                      value={formData.sms_sender_id}
                      onChange={handleChange}
                      placeholder="AloPath"
                      className="w-full h-input px-3 bg-paper border border-line rounded-btn text-sm text-ink focus:outline-none focus:border-forest"
                    />
                    <span className="text-[11px] text-ink-light mt-1 block">
                      মাস্কিং না থাকলে নন-মাস্কিং নম্বর থেকে যাবে
                    </span>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      API URL *
                    </label>
                    <input
                      type="text"
                      name="sms_api_url"
                      value={formData.sms_api_url}
                      onChange={handleChange}
                      placeholder="https://sms-provider.example/api/send"
                      className="w-full h-input px-3 bg-paper border border-line rounded-btn text-sm text-ink focus:outline-none focus:border-forest font-mono text-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-ink-muted">
                        API Key *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsEditingApiKey(!isEditingApiKey)}
                        className="text-[11px] text-forest hover:underline flex items-center gap-1"
                      >
                        {isEditingApiKey ? (
                          <>
                            <EyeOff className="w-3 h-3" /> গোপন রাখুন
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" /> পরিবর্তন করুন
                          </>
                        )}
                      </button>
                    </div>
                    <input
                      type={isEditingApiKey ? 'text' : 'password'}
                      name="sms_api_key"
                      value={formData.sms_api_key}
                      onChange={handleChange}
                      placeholder={isEditingApiKey ? 'নতুন API Key লিখুন' : '••••••••••••'}
                      disabled={!isEditingApiKey && !formData.sms_api_key}
                      className="w-full h-input px-3 bg-paper border border-line rounded-btn text-sm text-ink focus:outline-none focus:border-forest font-mono text-xs"
                    />
                    <span className="text-[11px] text-ink-light mt-1 block">
                      .env বা ডাটাবেসে নিরাপদে সংরক্ষিত থাকবে
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      প্রতি মিনিটে সর্বোচ্চ SMS
                    </label>
                    <input
                      type="number"
                      disabled
                      defaultValue={60}
                      className="w-full h-input px-3 bg-paper/60 border border-line rounded-btn text-sm text-ink cursor-not-allowed"
                    />
                    <span className="text-[11px] text-ink-light mt-1 block">
                      ওয়ার্কার প্রতি মিনিটে ৬০টি করে এসএমএস পাঠায়
                    </span>
                  </div>
                </div>

                {/* Bottom Test SMS & Save Row */}
                <div className="mt-6 pt-5 border-t border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 w-full md:max-w-md">
                    <input
                      type="text"
                      placeholder="০১৭১২-৩৪৫৬৭৮"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="h-input px-3 bg-paper border border-line rounded-btn text-xs text-ink focus:outline-none focus:border-forest w-48 shrink-0"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestSms}
                      disabled={sendingTest}
                      className="h-btn px-3 bg-paper hover:bg-paper-dark border border-line text-ink text-xs font-medium rounded-btn flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {sendingTest ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-forest" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-forest" />
                      )}
                      টেস্ট SMS পাঠান
                    </button>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-btn px-6 bg-forest hover:bg-forest-light text-white text-sm font-medium rounded-btn flex items-center gap-2 shadow-sm transition-colors self-end md:self-auto disabled:opacity-50"
                  >
                    {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    সংরক্ষণ করুন
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`mt-3 p-2.5 rounded-btn text-xs flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-mint/10 text-forest border border-mint/30'
                        : 'bg-wine/10 text-wine border border-wine/30'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* SMS Control Toggles Card (Matching design/24-settings.png) */}
              <div className="bg-white border border-line rounded-card p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-3 rounded-card bg-paper/50 border border-line">
                    <div>
                      <div className="font-bold text-sm text-ink">
                        SMS পাঠানো চালু
                      </div>
                      <p className="text-xs text-ink-light mt-0.5">
                        বন্ধ করলে SMS শুধু "অপেক্ষমাণ" থাকবে, পাঠানো হবে না
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="sms_enabled"
                        checked={formData.sms_enabled === '1'}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-card bg-paper/50 border border-line">
                    <div>
                      <div className="font-bold text-sm text-ink">
                        ক্রন ব্যাকগ্রাউন্ড ওয়ার্কার
                      </div>
                      <p className="text-xs text-ink-light mt-0.5">
                        প্রতি ১ মিনিট পরপর পেন্ডিং কিউ থেকে সর্বোচ্চ ৬০টি করে পাঠায়
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-mint/20 text-forest text-xs font-semibold rounded-full border border-mint/40">
                      সক্রিয়
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SMS টেমপ্লেট (SMS Template & Phone Simulator) - Matching design/22-sms_templates.png */}
          {activeTab === 'template' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Template Editor */}
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-white border border-line rounded-card p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-line">
                    <div>
                      <span className="font-bold text-sm text-ink block">
                        কালেকশন জমা টেমপ্লেট
                      </span>
                      <span className="text-xs text-ink-light">
                        কালেকশন শিট নিশ্চিত করার সময় এই এসএমএস পাঠানো হবে
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-mint/15 text-forest border border-mint/30">
                      সক্রিয়
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1.5">
                      টেমপ্লেটের লেখা
                    </label>
                    <textarea
                      rows={4}
                      name="sms_template"
                      value={formData.sms_template}
                      onChange={handleChange}
                      className="w-full p-3 bg-paper border border-line rounded-btn text-sm text-ink focus:outline-none focus:border-forest font-serif-bn leading-relaxed resize-none"
                      placeholder="{name}, আজ {date} ৳{amount} জমা হয়েছে..."
                    />
                  </div>

                  {/* Character and part counters */}
                  <div className="p-2.5 rounded-btn bg-paper/60 border border-line flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-ink-muted">
                      উদাহরণ সহ:{' '}
                      <strong className="text-ink font-mono">{charCount}</strong> অক্ষর
                    </span>
                    <span className="text-ink-muted">
                      ভাষা:{' '}
                      <strong className="text-ink">
                        {isUnicode ? 'বাংলা (Unicode)' : 'English (GSM)'}
                      </strong>
                    </span>
                    <span className="text-ink-muted">
                      SMS পার্ট:{' '}
                      <strong className="text-forest font-bold">{smsParts}টি</strong>{' '}
                      <span className="text-[10px] text-ink-light">
                        ({isUnicode ? 'প্রতি পার্টে ৬৭ অক্ষর' : 'প্রতি পার্টে ১৫৩ অক্ষর'})
                      </span>
                    </span>
                  </div>

                  {/* Available variable tags */}
                  <div>
                    <span className="text-xs font-medium text-ink-muted block mb-2">
                      ব্যবহারযোগ্য ভেরিয়েবল (ক্লিক করলে যোগ হবে):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '{name}', desc: 'সদস্যের নাম' },
                        { label: '{member_code}', desc: 'কোড' },
                        { label: '{date}', desc: 'তারিখ' },
                        { label: '{amount}', desc: 'আজকের জমা' },
                        { label: '{total}', desc: 'মোট সঞ্চয়' },
                        { label: '{org}', desc: 'সংস্থার নাম' },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => insertVariable(item.label)}
                          className="px-2.5 py-1 bg-paper hover:bg-forest/10 hover:border-forest text-ink text-xs font-mono rounded-btn border border-line transition-all flex items-center gap-1"
                          title={item.desc}
                        >
                          <span className="text-forest font-bold">{item.label}</span>
                          <span className="text-[10px] text-ink-light">({item.desc})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Banglish tip matching design screenshot */}
                  <div className="p-3 bg-paper/40 border border-line rounded-btn text-xs text-ink-light space-y-1">
                    <div className="font-semibold text-ink flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-forest" />
                      খরচ বাঁচানোর টিপস:
                    </div>
                    <p>
                      খরচ বাঁচাতে চাইলে ইংরেজি অক্ষরে লিখতে পারেন (১ পার্টে ১৬০ অক্ষর)। যেমন:{' '}
                      <span className="font-mono text-ink">
                        {sampleData.name}, 16/10 joma 100, mot sonchoy 4850. -Sobuj Bangla
                      </span>
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="h-btn px-6 bg-forest hover:bg-forest-light text-white text-sm font-medium rounded-btn flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                    >
                      {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                      টেমপ্লেট সংরক্ষণ করুন
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Mobile Phone Simulator (Matching design/22-sms_templates.png) */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[320px] bg-ink rounded-[40px] p-3 shadow-2xl border-4 border-gray-800">
                  {/* Phone Speaker Notch */}
                  <div className="w-24 h-4 bg-gray-900 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <div className="w-10 h-1 bg-gray-700 rounded-full" />
                  </div>

                  {/* Phone Screen */}
                  <div className="bg-[#EBE7DF] rounded-[30px] p-4 min-h-[440px] flex flex-col justify-between select-none">
                    <div>
                      {/* Sender Header */}
                      <div className="text-center pb-3 border-b border-gray-300">
                        <div className="font-bold text-sm text-ink">
                          {formData.sms_sender_id || formData.org_short || 'সবুজ বাংলা'}
                        </div>
                        <div className="text-[10px] text-ink-light">আজ ৫:০৫ অপরাহ্ন</div>
                      </div>

                      {/* Live SMS Message Bubble */}
                      <div className="mt-6 flex flex-col items-start">
                        <div className="bg-white text-ink text-xs p-3.5 rounded-2xl rounded-tl-sm shadow-sm border border-line max-w-[90%] font-serif-bn leading-relaxed whitespace-pre-wrap">
                          {renderedTemplate}
                        </div>
                        <span className="text-[10px] text-ink-light mt-1 ml-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-forest inline" /> ডেলিভার্ড
                        </span>
                      </div>
                    </div>

                    {/* Bottom screen label */}
                    <div className="text-center pt-4 border-t border-gray-300">
                      <span className="text-[11px] text-ink-light font-medium">
                        লাইভ প্রিভিউ · নমুনা সদস্য: রহিমা বেগম
                      </span>
                    </div>
                  </div>

                  {/* Phone Home Indicator Bar */}
                  <div className="w-28 h-1 bg-gray-600 rounded-full mx-auto mt-3" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SMS হিস্ট্রি ও কিউ (SMS Logs & Queue) */}
          {activeTab === 'logs' && (
            <div className="bg-white border border-line rounded-card shadow-sm overflow-hidden">
              <div className="p-4 border-b border-line flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif-bn font-bold text-base text-ink">
                    SMS কিউ ও লগ
                  </h3>
                  <span className="text-xs text-ink-light">
                    (মোট: {smsPagination.total}টি)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-paper rounded-btn p-0.5 border border-line text-xs">
                    <button
                      onClick={() => setSmsFilter('')}
                      className={`px-3 py-1 rounded-btn font-medium transition-colors ${
                        smsFilter === ''
                          ? 'bg-forest text-white'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      সকল
                    </button>
                    <button
                      onClick={() => setSmsFilter('sent')}
                      className={`px-3 py-1 rounded-btn font-medium transition-colors ${
                        smsFilter === 'sent'
                          ? 'bg-forest text-white'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      পাঠানো
                    </button>
                    <button
                      onClick={() => setSmsFilter('pending')}
                      className={`px-3 py-1 rounded-btn font-medium transition-colors ${
                        smsFilter === 'pending'
                          ? 'bg-forest text-white'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      অপেক্ষমাণ
                    </button>
                    <button
                      onClick={() => setSmsFilter('failed')}
                      className={`px-3 py-1 rounded-btn font-medium transition-colors ${
                        smsFilter === 'failed'
                          ? 'bg-forest text-white'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      ব্যর্থ
                    </button>
                  </div>

                  <button
                    onClick={() => fetchSmsLogs(smsPage, smsFilter)}
                    className="p-1.5 bg-paper hover:bg-paper-dark border border-line rounded-btn text-ink transition-colors"
                    title="রিফ্রেশ"
                  >
                    <RotateCw className="w-4 h-4 text-forest" />
                  </button>
                </div>
              </div>

              {smsLogsLoading ? (
                <div className="p-10 text-center text-ink-light">
                  <RefreshCw className="w-6 h-6 animate-spin text-forest mx-auto mb-2" />
                  লগ লোড হচ্ছে...
                </div>
              ) : smsLogs.length === 0 ? (
                <div className="p-12 text-center text-ink-light text-sm">
                  কোনো SMS লগ পাওয়া যায়নি।
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-paper border-b border-line text-ink-muted font-medium">
                        <th className="py-2.5 px-4">আইডি</th>
                        <th className="py-2.5 px-4">প্রাপক / সদস্য</th>
                        <th className="py-2.5 px-4">মোবাইল</th>
                        <th className="py-2.5 px-4">বার্তা</th>
                        <th className="py-2.5 px-4">স্ট্যাটাস</th>
                        <th className="py-2.5 px-4">তারিখ ও সময়</th>
                        <th className="py-2.5 px-4 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {smsLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-paper/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-ink-light">#{log.id}</td>
                          <td className="py-3 px-4">
                            {log.member_name ? (
                              <div>
                                <span className="font-semibold text-ink">
                                  {log.member_name}
                                </span>
                                <span className="text-[10px] text-ink-light block font-mono">
                                  {log.member_code}
                                </span>
                              </div>
                            ) : (
                              <span className="text-ink-light">টেস্ট প্রাপক</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-ink">{log.phone}</td>
                          <td className="py-3 px-4 max-w-xs truncate text-ink font-serif-bn" title={log.message}>
                            {log.message}
                          </td>
                          <td className="py-3 px-4">
                            {log.status === 'sent' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-mint/15 text-forest border border-mint/30">
                                <CheckCircle2 className="w-3 h-3" /> পাঠানো
                              </span>
                            )}
                            {log.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                <Clock className="w-3 h-3" /> অপেক্ষমাণ
                              </span>
                            )}
                            {log.status === 'sending' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                <RefreshCw className="w-3 h-3 animate-spin" /> পাঠানো হচ্ছে
                              </span>
                            )}
                            {log.status === 'failed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-wine/10 text-wine border border-wine/30">
                                <AlertCircle className="w-3 h-3" /> ব্যর্থ ({log.attempts}/3)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-ink-light whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('bn-BD', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {log.status === 'failed' && (
                              <button
                                onClick={() => handleRetrySms(log.id)}
                                disabled={retryingId === log.id}
                                className="px-2.5 py-1 bg-paper hover:bg-forest/10 hover:border-forest text-forest border border-line rounded-btn font-medium transition-colors"
                              >
                                {retryingId === log.id ? 'চেষ্টা হচ্ছে...' : 'পুনরায় পাঠান'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
