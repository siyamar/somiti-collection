import React, { useState, useEffect, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  formatCurrency,
  formatDate,
  toBanglaDigits,
  formatTime,
  formatRelativeDate,
} from '../lib/format';
import ConfirmDayModal from '../components/ConfirmDayModal';
import CorrectionModal from '../components/CorrectionModal';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Save,
  CheckCircle2,
  Printer,
  RotateCcw,
  Search,
  AlertCircle,
  Check,
  Edit2,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  History,
} from 'lucide-react';

export default function CollectionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const todayStr = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const yesterdayStr = useMemo(() => dayjs().subtract(1, 'day').format('YYYY-MM-DD'), []);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [loading, setLoading] = useState(true);
  const [dayData, setDayData] = useState(null);
  const [items, setItems] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unpaid', 'underpaid', 'paid'
  const [alert, setAlert] = useState(null);

  // Modals
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedCorrectionCol, setSelectedCorrectionCol] = useState(null);

  // Action loaders
  const [savingDraft, setSavingDraft] = useState(false);
  const [syncingMembers, setSyncingMembers] = useState(false);
  const [retryingSms, setRetryingSms] = useState(false);

  // Mobile card entry state
  const [selectedMobileMemberId, setSelectedMobileMemberId] = useState(null);
  const [mobileNoteOpenId, setMobileNoteOpenId] = useState(null);

  // References for keyboard navigation across inputs
  const inputRefs = useRef([]);

  // Fetch Day Data
  const fetchDayData = async (date) => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await api.get(`/days/${date}`);
      setDayData(res.data);
      // Initialize local editable state with collection records
      const initialItems = res.data.collections.map((c) => ({
        ...c,
        amount: c.amount ?? c.expected_amount ?? 0,
        originalAmount: c.amount,
      }));
      setItems(initialItems);
      setIsDirty(false);
      if (initialItems.length > 0) {
        setSelectedMobileMemberId((prev) => {
          if (prev && initialItems.some((m) => m.member_id === prev)) return prev;
          return initialItems[0].member_id;
        });
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.error?.message || 'কালেকশন শিট লোড করতে ব্যর্থ হয়েছে।',
      });
      setDayData(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDayData(selectedDate);
  }, [selectedDate]);

  // Handle amount change in draft
  const handleAmountChange = (index, val) => {
    const updated = [...items];
    const numericVal = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
    updated[index].amount = numericVal;
    setItems(updated);
    setIsDirty(true);
  };

  // Handle note change in draft
  const handleNoteChange = (index, val) => {
    const updated = [...items];
    updated[index].note = val;
    setItems(updated);
    setIsDirty(true);
  };

  // Keyboard navigation: Enter or Tab moves to next row input
  const handleKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = inputRefs.current[idx + 1];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  // Save Draft action
  const handleSaveDraft = async () => {
    if (!dayData?.day?.id) return;
    setSavingDraft(true);
    setAlert(null);
    try {
      const payload = {
        collections: items.map((c) => ({
          member_id: c.member_id,
          amount: Number(c.amount) || 0,
          note: c.note || null,
        })),
      };
      await api.put(`/days/${dayData.day.id}/collections`, payload);
      setIsDirty(false);
      setAlert({ type: 'success', message: 'খসড়া সফলভাবে সংরক্ষণ করা হয়েছে।' });
      await fetchDayData(selectedDate);
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.error?.message || 'সংরক্ষণ ব্যর্থ হয়েছে।',
      });
    } finally {
      setSavingDraft(false);
    }
  };

  // Sync new members who joined <= date
  const handleSyncMembers = async () => {
    if (!dayData?.day?.id) return;
    setSyncingMembers(true);
    setAlert(null);
    try {
      const res = await api.post(`/days/${dayData.day.id}/add-new-members`);
      setAlert({ type: 'success', message: res.data.message });
      await fetchDayData(selectedDate);
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.error?.message || 'সদস্য লোড করতে সমস্যা হয়েছে।',
      });
    } finally {
      setSyncingMembers(false);
    }
  };

  // Confirm day
  const handleConfirmDay = async () => {
    if (!dayData?.day?.id) return;
    // First auto-save if dirty
    if (isDirty) {
      const payload = {
        collections: items.map((c) => ({
          member_id: c.member_id,
          amount: Number(c.amount) || 0,
          note: c.note || null,
        })),
      };
      await api.put(`/days/${dayData.day.id}/collections`, payload);
    }

    const res = await api.post(`/days/${dayData.day.id}/confirm`);
    setAlert({
      type: 'success',
      message: `${res.data.message} মোট আদায় ${formatCurrency(res.data.total)} এবং ${toBanglaDigits(res.data.smsQueued)} জনকে SMS কিউ করা হয়েছে।`,
    });
    await fetchDayData(selectedDate);
  };

  // Retry failed SMS
  const handleRetrySms = async () => {
    if (!dayData?.day?.id) return;
    setRetryingSms(true);
    setAlert(null);
    try {
      const res = await api.post(`/days/${dayData.day.id}/retry-sms`);
      setAlert({ type: 'success', message: res.data.message });
      await fetchDayData(selectedDate);
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.error?.message || 'ব্যর্থ SMS পুনরায় পাঠানো যায়নি।',
      });
    } finally {
      setRetryingSms(false);
    }
  };

  // Open correction modal
  const handleOpenCorrection = (col) => {
    setSelectedCorrectionCol(col);
    setCorrectionModalOpen(true);
  };

  // Real-time calculated KPI metrics
  const liveTotals = useMemo(() => {
    let expected = 0;
    let collected = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let underpaidCount = 0;

    items.forEach((c) => {
      const exp = Number(c.expected_amount) || 0;
      const amt = Number(c.amount) || 0;
      expected += exp;
      collected += amt;
      if (amt === 0) {
        unpaidCount++;
      } else {
        paidCount++;
        if (amt < exp) {
          underpaidCount++;
        }
      }
    });

    return {
      expected_total: expected,
      collected_total: dayData?.day?.status === 'confirmed' ? Number(dayData.day.total_amount) : collected,
      total_members: items.length,
      paid_count: paidCount,
      unpaid_count: unpaidCount,
      underpaid_count: underpaidCount,
    };
  }, [items, dayData]);

  // Filtered collections
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.member_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.member_phone?.includes(searchQuery);

      if (!matchesSearch) return false;

      const amt = Number(item.amount) || 0;
      const exp = Number(item.expected_amount) || 0;

      if (activeTab === 'unpaid') return amt === 0;
      if (activeTab === 'underpaid') return amt > 0 && amt < exp;
      if (activeTab === 'paid') return amt >= exp;
      return true; // 'all'
    });
  }, [items, searchQuery, activeTab]);

  const isConfirmed = dayData?.day?.status === 'confirmed';

  // Date access validation for navigation buttons
  const canGoPrevious = isAdmin || selectedDate === todayStr;
  const canGoNext = selectedDate < todayStr && (isAdmin || selectedDate === yesterdayStr);

  const handlePrevDay = () => {
    if (canGoPrevious) {
      setSelectedDate(dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'));
    }
  };

  const handleNextDay = () => {
    if (canGoNext) {
      setSelectedDate(dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD'));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-28 md:pb-12 print:p-0 print:m-0 print:max-w-full">
      {/* Top Breadcrumb & Date Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <span>কালেকশন শিট</span>
            <span>/</span>
            <span className="font-semibold text-ink">{formatDate(selectedDate)}</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="font-serif-bn text-2xl md:text-3xl font-bold text-ink flex items-center gap-2.5">
              <span>দৈনিক কালেকশন শিট</span>
              {dayData?.day && (
                <span
                  className={`text-xs font-sans px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5 ${
                    isConfirmed
                      ? 'bg-mint text-ok'
                      : 'bg-saffron-light text-saffron'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span>{isConfirmed ? 'নিশ্চিত' : 'খসড়া'}</span>
                </span>
              )}
            </h1>
          </div>

          {dayData?.day && (
            <p className="text-xs text-ink-light mt-1">
              {formatDate(dayData.day.collect_date)} ·{' '}
              {isConfirmed ? (
                <>
                  নিশ্চিত করেছেন:{' '}
                  <strong>{dayData.day.confirmed_by_name || 'অ্যাডমিন'}</strong>
                  {dayData.day.confirmed_at && `, ${formatTime(dayData.day.confirmed_at)}`}
                </>
              ) : (
                <>
                  মাঠকর্মী: <strong>{dayData.day.creator_name || user?.name}</strong>
                  {dayData.day.updated_at && ` · সর্বশেষ সংরক্ষণ: ${formatTime(dayData.day.updated_at)}`}
                </>
              )}
            </p>
          )}
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Switcher */}
          <div className="flex items-center bg-white border border-line rounded-btn p-1 shadow-2xs">
            <button
              onClick={handlePrevDay}
              disabled={!canGoPrevious}
              className="p-1.5 text-ink-muted hover:text-ink hover:bg-paper rounded disabled:opacity-30 disabled:pointer-events-none"
              title="পূর্ববর্তী দিন"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 px-2 border-x border-line">
              <Calendar className="w-3.5 h-3.5 text-forest" />
              <input
                type="date"
                max={todayStr}
                min={isAdmin ? undefined : yesterdayStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-mono-num font-semibold text-ink bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextDay}
              disabled={!canGoNext}
              className="p-1.5 text-ink-muted hover:text-ink hover:bg-paper rounded disabled:opacity-30 disabled:pointer-events-none"
              title="পরবর্তী দিন"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-btn text-xs font-medium border transition-colors ${
                selectedDate === todayStr
                  ? 'bg-forest text-white border-forest'
                  : 'bg-white text-ink-light border-line hover:bg-paper'
              }`}
            >
              আজ
            </button>
            <button
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-3 py-1.5 rounded-btn text-xs font-medium border transition-colors ${
                selectedDate === yesterdayStr
                  ? 'bg-forest text-white border-forest'
                  : 'bg-white text-ink-light border-line hover:bg-paper'
              }`}
            >
              গতকাল
            </button>
          </div>

          {/* Action Buttons for Draft Sheet */}
          {!isConfirmed && dayData?.day && (
            <>
              <button
                onClick={handleSyncMembers}
                disabled={syncingMembers}
                className="h-btn px-3.5 bg-white border border-line hover:bg-paper text-ink rounded-btn text-xs font-medium flex items-center gap-1.5 shadow-2xs"
                title="আজকের মধ্যে যোগ দেওয়া নতুন সক্রিয় সদস্য শিটে অন্তর্ভুক্ত করুন"
              >
                <RotateCw className={`w-3.5 h-3.5 ${syncingMembers ? 'animate-spin' : ''}`} />
                <span>সদস্য লোড করুন</span>
              </button>

              <button
                onClick={handleSaveDraft}
                disabled={savingDraft || !isDirty}
                className={`h-btn px-3.5 border rounded-btn text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-all ${
                  isDirty
                    ? 'bg-saffron text-white border-saffron hover:bg-saffron/90'
                    : 'bg-white text-ink-muted border-line hover:bg-paper'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingDraft ? 'সংরক্ষণ হচ্ছে...' : isDirty ? 'খসড়া সংরক্ষণ করুন *' : 'খসড়া সংরক্ষিত'}</span>
              </button>

              <button
                onClick={() => setConfirmModalOpen(true)}
                className="h-btn px-4 bg-forest hover:bg-forest-light text-white rounded-btn text-xs font-medium flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>নিশ্চিত করুন ও SMS পাঠান</span>
              </button>
            </>
          )}

          {/* Action Buttons for Confirmed Sheet */}
          {isConfirmed && dayData?.day && (
            <>
              <button
                onClick={() => window.print()}
                className="h-btn px-3.5 bg-white border border-line hover:bg-paper text-ink rounded-btn text-xs font-medium flex items-center gap-1.5 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-ink-light" />
                <span>প্রিন্ট</span>
              </button>

              {isAdmin && (dayData?.smsSummary?.failed > 0 || dayData?.smsSummary?.sending > 0) && (
                <button
                  onClick={handleRetrySms}
                  disabled={retryingSms}
                  className="h-btn px-3.5 bg-white border border-line hover:bg-paper text-ink rounded-btn text-xs font-medium flex items-center gap-1.5 shadow-2xs"
                >
                  <RotateCcw className={`w-3.5 h-3.5 text-forest ${retryingSms ? 'animate-spin' : ''}`} />
                  <span>ব্যর্থ SMS আবার পাঠান</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Alert banner */}
      {alert && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center justify-between shadow-2xs print:hidden ${
            alert.type === 'success'
              ? 'bg-mint text-ok border border-ok/30'
              : 'bg-brick-light text-brick border border-brick/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-current opacity-70 hover:opacity-100">
            ×
          </button>
        </div>
      )}

      {/* KPI Cards (Matches design/05-sheet_entry.png) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 print:grid-cols-4">
        {/* Card 1: নির্ধারিত সঞ্চয় */}
        <div className="bg-white border border-line rounded-card p-4 shadow-2xs">
          <span className="text-xs font-medium text-ink-muted block">নির্ধারিত সঞ্চয়</span>
          <div className="text-xl md:text-2xl font-bold font-mono-num text-ink mt-1">
            {formatCurrency(liveTotals.expected_total)}
          </div>
          <span className="text-[11px] text-ink-light block mt-1">
            সদস্যদের দৈনিক নির্ধারিত সঞ্চয়
          </span>
        </div>

        {/* Card 2: আজকের কালেকশন */}
        <div className="bg-white border border-line rounded-card p-4 shadow-2xs">
          <span className="text-xs font-medium text-ink-muted block">
            {isConfirmed ? 'মোট সংগৃহীত সঞ্চয়' : 'আজকের কালেকশন'}
          </span>
          <div className="text-xl md:text-2xl font-bold font-mono-num text-ok mt-1">
            {formatCurrency(liveTotals.collected_total)}
          </div>
          <span className="text-[11px] text-ink-light block mt-1">
            {isConfirmed ? 'নিশ্চিতকৃত পরিমাণ' : `নির্ধারিত ${formatCurrency(liveTotals.expected_total)}`}
          </span>
        </div>

        {/* Card 3: জমা দিয়েছেন */}
        <div className="bg-white border border-line rounded-card p-4 shadow-2xs">
          <span className="text-xs font-medium text-ink-muted block">জমা দিয়েছেন</span>
          <div className="text-xl md:text-2xl font-bold font-mono-num text-forest mt-1">
            {toBanglaDigits(liveTotals.paid_count)} / {toBanglaDigits(liveTotals.total_members)} জন
          </div>
          <span className="text-[11px] text-ink-light block mt-1">
            {toBanglaDigits(liveTotals.unpaid_count)} জন দেননি · {toBanglaDigits(liveTotals.underpaid_count)} জন কম
          </span>
        </div>

        {/* Card 4: সর্বমোট (Draft: Saffron card, Confirmed: SMS status) */}
        {!isConfirmed ? (
          <div className="bg-[#FCF8EE] border border-[#EEDBBA] rounded-card p-4 shadow-2xs">
            <span className="text-xs font-medium text-ink-muted block">সর্বমোট</span>
            <div className="text-xl md:text-2xl font-bold font-mono-num text-ink mt-1">
              {formatCurrency(liveTotals.collected_total)}
            </div>
            <span className="text-[11px] text-saffron block mt-1 font-medium">
              নিশ্চিত করলে SMS যাবে {toBanglaDigits(liveTotals.paid_count)} জনকে
            </span>
          </div>
        ) : (
          <div className="bg-white border border-line rounded-card p-4 shadow-2xs">
            <span className="text-xs font-medium text-ink-muted block">SMS স্ট্যাটাস</span>
            <div className="text-xl md:text-2xl font-bold font-mono-num text-forest mt-1">
              {toBanglaDigits(dayData?.smsSummary?.total || 0)} টি SMS
            </div>
            <span className="text-[11px] text-ink-light block mt-1">
              {toBanglaDigits(dayData?.smsSummary?.sent || 0)} পাঠানো · {toBanglaDigits(dayData?.smsSummary?.pending || 0)} অপেক্ষমাণ
              {dayData?.smsSummary?.failed > 0 && ` · ${toBanglaDigits(dayData.smsSummary.failed)} ব্যর্থ`}
            </span>
          </div>
        )}
      </div>

      {/* Search, Filter Pills & Hint Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-card border border-line shadow-2xs print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="সদস্য খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-paper/60 border border-line rounded-btn text-ink placeholder:text-ink-muted focus:outline-none focus:border-forest focus:bg-white"
            />
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-paper text-ink font-semibold border border-line'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              সব ({toBanglaDigits(items.length)})
            </button>

            <button
              onClick={() => setActiveTab('unpaid')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'unpaid'
                  ? 'bg-brick-light text-brick font-semibold border border-brick/30'
                  : 'text-ink-muted hover:text-brick'
              }`}
            >
              জমা দেননি ({toBanglaDigits(liveTotals.unpaid_count)})
            </button>

            <button
              onClick={() => setActiveTab('underpaid')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'underpaid'
                  ? 'bg-saffron-light text-saffron font-semibold border border-saffron/30'
                  : 'text-ink-muted hover:text-saffron'
              }`}
            >
              কম দিয়েছেন ({toBanglaDigits(liveTotals.underpaid_count)})
            </button>
          </div>
        </div>

        {/* Data entry hint */}
        <div className="text-[11px] text-ink-muted font-sans hidden md:block">
          {!isConfirmed
            ? 'Tab চাপলে পরের ঘরে যাবে · ছোট সংখ্যা = নির্ধারিত পরিমাণ'
            : 'শিট নিশ্চিত করা হয়েছে · পরিবর্তনের জন্য অ্যাডমিন সংশোধন প্রযোজ্য'}
        </div>
      </div>

      {/* Main Ledger Sheet Table */}
      <div className="bg-white border border-line rounded-card shadow-sm overflow-hidden relative">
        {/* Printable Header */}
        <div className="hidden print:block p-6 border-b border-line text-center">
          <h2 className="font-serif-bn text-xl font-bold text-ink">সবুজ বাংলা সমবায় সমিতি লিঃ</h2>
          <p className="text-xs text-ink-muted mt-0.5">দৈনিক কালেকশন বিবরণী · {formatDate(selectedDate)}</p>
          <div className="flex justify-between items-center text-xs mt-3 pt-3 border-t border-line">
            <span>মাঠকর্মী: {dayData?.day?.creator_name || 'মাঠকর্মী'}</span>
            <span>মোট সদস্য: {toBanglaDigits(items.length)} জন</span>
            <span>মোট আদায়: {formatCurrency(liveTotals.collected_total)}</span>
          </div>
        </div>

        {/* Stamped Seal Overlay for Confirmed Sheets (Matches design/07-sheet_done.png) */}
        {isConfirmed && (
          <div className="absolute top-16 right-12 z-20 pointer-events-none opacity-90 hidden sm:block">
            <div className="stamp-seal">
              <span className="text-base tracking-widest font-serif-bn">নিশ্চিত</span>
              <span className="text-[10px] font-mono-num font-normal mt-0.5 opacity-90">
                {selectedDate} · {dayData?.day?.confirmed_at ? formatTime(dayData.day.confirmed_at) : ''}
              </span>
            </div>
          </div>
        )}

        {/* Desktop Table Container with Red Margin Line */}
        <div className="hidden md:block overflow-x-auto ledger-margin-line">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-paper/80 border-b border-line text-ink-muted font-semibold">
                <th className="py-3 px-4 w-12 text-center">ক্রম</th>
                <th className="py-3 px-4">সদস্য</th>
                <th className="py-3 px-4 w-32 text-right">নির্ধারিত</th>
                <th className="py-3 px-4 w-44 text-right">
                  {!isConfirmed ? 'আজকের জমা' : 'আদায়কৃত জমা'}
                </th>
                <th className="py-3 px-4 w-36 text-center">
                  {!isConfirmed ? 'স্ট্যাটাস' : 'SMS স্ট্যাটাস'}
                </th>
                <th className="py-3 px-4 w-40 text-right print:hidden">
                  {!isConfirmed ? 'মন্তব্য' : isAdmin ? 'কার্যক্রম' : ''}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-ink-muted">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-forest" />
                    <span>কালেকশন শিট প্রস্তুত হচ্ছে...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-ink-muted">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-ink-muted opacity-60" />
                    <span>কোনো সদস্য পাওয়া যায়নি।</span>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const amt = Number(item.amount) || 0;
                  const exp = Number(item.expected_amount) || 0;
                  const isUnpaid = amt === 0;
                  const isUnderpaid = amt > 0 && amt < exp;

                  return (
                    <tr
                      key={item.member_id}
                      className={`hover:bg-paper/40 transition-colors ${
                        isUnpaid && !isConfirmed ? 'bg-brick-light/10' : ''
                      }`}
                    >
                      {/* Serial Number */}
                      <td className="py-3 px-4 text-center text-ink-muted font-mono-num">
                        {toBanglaDigits(idx + 1)}
                      </td>

                      {/* Member Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-forest-light text-white font-bold flex items-center justify-center shrink-0 text-xs">
                            {item.member_name?.charAt(0) || 'স'}
                          </div>
                          <div>
                            <span className="font-semibold text-ink text-sm block leading-tight">
                              {item.member_name}
                            </span>
                            <span className="text-[11px] text-ink-muted flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono-num">{item.member_code}</span>
                              <span>·</span>
                              <span>
                                শেষ জমা: {item.last_paid_date ? formatRelativeDate(item.last_paid_date, selectedDate) : 'কোনো জমা নেই'}
                              </span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Expected Amount */}
                      <td className="py-3 px-4 text-right font-mono-num text-ink-muted">
                        {formatCurrency(exp)}
                      </td>

                      {/* Collection Amount (Input if draft, Static if confirmed) */}
                      <td className="py-3 px-4 text-right">
                        {!isConfirmed ? (
                          <div className="inline-block relative">
                            <input
                              ref={(el) => (inputRefs.current[idx] = el)}
                              type="number"
                              min="0"
                              step="1"
                              value={item.amount}
                              onChange={(e) => handleAmountChange(idx, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, idx)}
                              className={`w-32 px-3 py-1.5 text-right font-mono-num text-sm rounded-md border transition-all focus:outline-none focus:ring-1 ${
                                isUnpaid
                                  ? 'border-brick/60 bg-brick-light/20 text-brick font-bold focus:border-brick focus:ring-brick'
                                  : isUnderpaid
                                  ? 'border-saffron/60 bg-saffron-light/20 text-saffron-dark font-bold focus:border-saffron focus:ring-saffron'
                                  : 'border-line bg-white text-ink font-semibold focus:border-forest focus:ring-forest'
                              }`}
                            />
                          </div>
                        ) : (
                          <span
                            className={`font-mono-num text-sm font-bold ${
                              amt === 0 ? 'text-ink-muted' : 'text-ink'
                            }`}
                          >
                            {amt === 0 ? '—' : formatCurrency(amt)}
                          </span>
                        )}
                      </td>

                      {/* Status / SMS Chip */}
                      <td className="py-3 px-4 text-center">
                        {!isConfirmed ? (
                          isUnpaid ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-brick-light text-brick">
                              ● জমা দেননি
                            </span>
                          ) : isUnderpaid ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-saffron-light text-saffron">
                              ● কম দিয়েছেন
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-mint/50 text-ok">
                              ✓ নিয়মিত
                            </span>
                          )
                        ) : (
                          /* Confirmed SMS Status Chips (Matches design/07-sheet_done.png) */
                          amt === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-paper text-ink-muted">
                              পাঠানো হয়নি
                            </span>
                          ) : item.sms_status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-mint text-ok">
                              <span className="w-1.5 h-1.5 rounded-full bg-ok"></span>
                              <span>পাঠানো</span>
                            </span>
                          ) : item.sms_status === 'pending' || item.sms_status === 'sending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-saffron-light text-saffron">
                              <span className="w-1.5 h-1.5 rounded-full bg-saffron"></span>
                              <span>অপেক্ষমাণ</span>
                            </span>
                          ) : item.sms_status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-brick-light text-brick">
                              <span className="w-1.5 h-1.5 rounded-full bg-brick"></span>
                              <span>ব্যর্থ</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-paper text-ink-muted">
                              প্রসেসিং
                            </span>
                          )
                        )}
                      </td>

                      {/* Note (in draft) or Correction action (in confirmed) */}
                      <td className="py-3 px-4 text-right print:hidden">
                        {!isConfirmed ? (
                          <input
                            type="text"
                            placeholder="মন্তব্য (ঐচ্ছিক)..."
                            value={item.note || ''}
                            onChange={(e) => handleNoteChange(idx, e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-paper/50 border border-transparent hover:border-line focus:border-forest focus:bg-white rounded transition-colors"
                          />
                        ) : isAdmin ? (
                          <button
                            onClick={() => handleOpenCorrection(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-ink-light border border-line rounded hover:bg-paper hover:text-ink transition-colors shadow-2xs"
                            title="ভুল পরিমাণ সংশোধন করুন"
                          >
                            <Edit2 className="w-3 h-3 text-saffron" />
                            <span>সংশোধন</span>
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer / Summary Row */}
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="bg-paper border-t border-line font-bold text-ink">
                  <td colSpan="2" className="py-3 px-4">
                    মোট ({toBanglaDigits(filteredItems.length)} জন)
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num">
                    {formatCurrency(
                      filteredItems.reduce((acc, c) => acc + (Number(c.expected_amount) || 0), 0)
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num text-ok text-sm">
                    {formatCurrency(
                      filteredItems.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-xs text-ink-light font-normal">
                    {isConfirmed ? (
                      <span>
                        {toBanglaDigits(dayData?.smsSummary?.sent || 0)} পাঠানো ·{' '}
                        {toBanglaDigits(dayData?.smsSummary?.pending || 0)} অপেক্ষমাণ
                      </span>
                    ) : (
                      <span>{toBanglaDigits(liveTotals.paid_count)} জন জমা দিয়েছেন</span>
                    )}
                  </td>
                  <td className="py-3 px-4 print:hidden"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Mobile Collection Cards View (Matches design/09-mobile_entry.png) */}
        <div className="md:hidden p-3 space-y-3 bg-[#FBF9F5] rounded-b-card">
          {/* Mobile Progress Tracker */}
          <div className="bg-white p-3.5 rounded-card border border-line shadow-2xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-ink">
                {toBanglaDigits(liveTotals.paid_count)} / {toBanglaDigits(liveTotals.total_members)} জন আদায়
              </span>
              <span className="font-mono-num font-bold text-forest text-xs">
                {toBanglaDigits(
                  Math.round(
                    (liveTotals.paid_count / (liveTotals.total_members || 1)) * 100
                  )
                )}%
              </span>
            </div>
            <div className="w-full bg-paper-dark h-2 rounded-full overflow-hidden">
              <div
                className="bg-forest h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (liveTotals.paid_count / (liveTotals.total_members || 1)) * 100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Member Cards List */}
          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white border border-line rounded-card p-4 animate-pulse space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-paper-dark" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-paper-dark rounded w-1/3" />
                      <div className="h-2.5 bg-paper-dark rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white border border-line rounded-card p-8 text-center text-ink-muted">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-ink-muted/60" />
              <p className="text-sm font-medium text-ink">কোনো সদস্য পাওয়া যায়নি</p>
              <p className="text-xs text-ink-light mt-1">
                অনুসন্ধান বা ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const originalIdx = items.findIndex((c) => c.member_id === item.member_id);
              const isSelected = selectedMobileMemberId === item.member_id;
              const amt = Number(item.amount) || 0;
              const exp = Number(item.expected_amount) || 0;
              const isPaid = amt > 0;

              // Active / Expanded Card for Mobile Quick Entry (Matches design/09-mobile_entry.png center card)
              if (isSelected && !isConfirmed) {
                return (
                  <div
                    key={item.member_id}
                    className="bg-white border-2 border-forest rounded-card p-4 shadow-sm space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-saffron-light text-saffron font-bold flex items-center justify-center text-xs shrink-0 border border-saffron/30">
                          {item.member_name?.charAt(0) || 'স'}
                        </div>
                        <div>
                          <h4 className="font-bold text-ink text-sm leading-tight">
                            {item.member_name}
                          </h4>
                          <span className="text-[11px] text-ink-muted block font-mono">
                            {item.member_code}
                          </span>
                        </div>
                      </div>

                      {/* Status / Installment pill */}
                      <span className="text-[11px] font-semibold text-saffron bg-[#FFF8EB] border border-[#FBE3B5] px-2.5 py-0.5 rounded-full shrink-0">
                        {isPaid ? '• কিস্তি জমা' : '• জমা বাকি'}
                      </span>
                    </div>

                    {/* Entry Inputs */}
                    <div className="bg-paper/50 rounded-lg p-3 border border-line/70 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink font-semibold">আজকের সঞ্চয় / কিস্তি:</span>
                        <span className="text-ink-muted text-[11px]">
                          নির্ধারিত: <strong className="text-ink font-mono-num">{formatCurrency(exp)}</strong>
                        </span>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted font-bold text-base">
                          ৳
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={item.amount === '' ? '' : item.amount}
                          onChange={(e) => handleAmountChange(originalIdx, e.target.value)}
                          placeholder="০"
                          className="w-full h-12 pl-9 pr-3 text-right text-xl font-bold font-mono-num bg-white border border-forest/60 rounded-btn text-ink focus:outline-none focus:ring-2 focus:ring-forest/30"
                        />
                      </div>

                      {/* Quick preset action buttons (Matches design/09-mobile_entry.png) */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAmountChange(originalIdx, exp)}
                          className="py-1.5 px-2 bg-white hover:bg-paper border border-line rounded-btn text-xs font-semibold text-forest text-center transition-colors shadow-2xs"
                        >
                          নির্ধারিত
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAmountChange(originalIdx, 0)}
                          className="py-1.5 px-2 bg-white hover:bg-paper border border-line rounded-btn text-xs font-semibold text-brick text-center transition-colors shadow-2xs"
                        >
                          ০ (দেননি)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMobileNoteOpenId(
                              mobileNoteOpenId === item.member_id ? null : item.member_id
                            )
                          }
                          className="py-1.5 px-2 bg-white hover:bg-paper border border-line rounded-btn text-xs font-medium text-ink-muted text-center transition-colors shadow-2xs"
                        >
                          + মন্তব্য
                        </button>
                      </div>

                      {/* Optional Note input */}
                      {(mobileNoteOpenId === item.member_id || item.note) && (
                        <div className="pt-1.5">
                          <input
                            type="text"
                            placeholder="মন্তব্য লিখুন..."
                            value={item.note || ''}
                            onChange={(e) => handleNoteChange(originalIdx, e.target.value)}
                            className="w-full h-9 px-3 text-xs bg-white border border-line rounded-btn text-ink focus:outline-none focus:border-forest"
                          />
                        </div>
                      )}
                    </div>

                    {/* Member Quick Switch / Navigation inside card */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-line/60">
                      <button
                        type="button"
                        onClick={() => {
                          const prevIdx = filteredItems.findIndex(
                            (c) => c.member_id === item.member_id
                          ) - 1;
                          if (prevIdx >= 0) {
                            setSelectedMobileMemberId(filteredItems[prevIdx].member_id);
                          }
                        }}
                        disabled={
                          filteredItems.findIndex((c) => c.member_id === item.member_id) === 0
                        }
                        className="text-ink-muted hover:text-ink disabled:opacity-30 disabled:pointer-events-none py-1 flex items-center gap-1 font-medium"
                      >
                        ← পূর্ববর্তী
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const nextIdx = filteredItems.findIndex(
                            (c) => c.member_id === item.member_id
                          ) + 1;
                          if (nextIdx < filteredItems.length) {
                            setSelectedMobileMemberId(filteredItems[nextIdx].member_id);
                          }
                        }}
                        disabled={
                          filteredItems.findIndex((c) => c.member_id === item.member_id) ===
                          filteredItems.length - 1
                        }
                        className="text-forest hover:underline disabled:opacity-30 disabled:pointer-events-none py-1 flex items-center gap-1 font-semibold"
                      >
                        পরবর্তী সদস্য →
                      </button>
                    </div>
                  </div>
                );
              }

              // Collapsed / Inactive Card (Matches design/09-mobile_entry.png)
              return (
                <div
                  key={item.member_id}
                  onClick={() => !isConfirmed && setSelectedMobileMemberId(item.member_id)}
                  className={`bg-white border rounded-card p-3.5 shadow-2xs flex items-center justify-between gap-3 transition-colors ${
                    !isConfirmed ? 'cursor-pointer hover:border-forest/40' : ''
                  } ${
                    amt === 0 && !isConfirmed ? 'border-line bg-paper/30' : 'border-line'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shrink-0 border ${
                        isPaid
                          ? 'bg-mint/40 text-forest border-mint'
                          : 'bg-paper text-ink-muted border-line'
                      }`}
                    >
                      {item.member_name?.charAt(0) || 'স'}
                    </div>
                    <div className="truncate">
                      <h4 className="font-semibold text-ink text-xs leading-tight truncate">
                        {item.member_name}
                      </h4>
                      <span className="text-[11px] text-ink-light block font-mono">
                        {item.member_code}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {!isConfirmed ? (
                      isPaid ? (
                        <div>
                          <span className="font-mono-num font-bold text-sm text-forest block">
                            {formatCurrency(amt)}
                          </span>
                          <span className="text-[11px] text-forest flex items-center gap-1 justify-end font-medium">
                            <Check className="w-3 h-3 inline" /> লেখা হয়েছে
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-mono-num text-ink-muted block">
                            নির্ধারিত {formatCurrency(exp)}
                          </span>
                          <span className="text-[10px] text-ink-light">ট্যাপ করে লিখুন</span>
                        </div>
                      )
                    ) : (
                      /* Confirmed view */
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="font-mono-num font-bold text-sm text-ink block">
                            {amt === 0 ? '—' : formatCurrency(amt)}
                          </span>
                          <span className="text-[10px] text-forest block">
                            {item.sms_status === 'sent'
                              ? 'SMS পাঠানো'
                              : item.sms_status === 'failed'
                              ? 'SMS ব্যর্থ'
                              : 'অপেক্ষমাণ'}
                          </span>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCorrection(item);
                            }}
                            className="p-1.5 border border-line rounded-btn text-xs text-ink-light hover:text-forest"
                            title="সংশোধন"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-saffron" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmed Sheet: Correction History Banner (Matches design/07-sheet_done.png) */}
      {isConfirmed && (
        <div className="bg-[#FCF8EE] border border-[#EEDBBA] rounded-card p-4 print:hidden shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <History className="w-4 h-4 text-saffron shrink-0" />
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
              সংশোধন ইতিহাস
            </h3>
          </div>

          {!dayData?.corrections || dayData.corrections.length === 0 ? (
            <p className="text-xs text-ink-light leading-relaxed">
              এখনো কোনো সংশোধন হয়নি। সংশোধন করলে পুরনো ও নতুন পরিমাণ, কারণ এবং কে করেছেন তা এখানে দেখা যাবে, আর সদস্যকে সংশোধনের SMS যাবে।
            </p>
          ) : (
            <div className="space-y-2 mt-2">
              {dayData.corrections.map((corr) => (
                <div
                  key={corr.id}
                  className="bg-white/80 border border-[#EEDBBA] rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-saffron-light text-saffron flex items-center justify-center font-bold text-[10px]">
                      {corr.member_name?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink">{corr.member_name}</span>
                        <span className="text-[11px] font-mono-num text-ink-muted">({corr.member_code})</span>
                      </div>
                      <p className="text-[11px] text-ink-light mt-0.5">
                        কারণ: <span className="text-ink">{corr.reason}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-[11px] text-ink-muted line-through font-mono-num mr-2">
                        {formatCurrency(corr.old_amount)}
                      </span>
                      <span className="font-bold font-mono-num text-ok">
                        ➔ {formatCurrency(corr.new_amount)}
                      </span>
                    </div>
                    <div className="text-[10px] text-ink-muted border-l border-line pl-3">
                      <span>{corr.corrector_name || 'অ্যাডমিন'}</span>
                      <span className="block mt-0.5">{formatTime(corr.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmDayModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmDay}
        day={dayData?.day}
        totals={liveTotals}
        collections={items}
      />

      {/* Correction Modal */}
      <CorrectionModal
        isOpen={correctionModalOpen}
        onClose={() => {
          setCorrectionModalOpen(false);
          setSelectedCorrectionCol(null);
        }}
        collection={selectedCorrectionCol}
        date={selectedDate}
        onSuccess={() => {
          setAlert({
            type: 'success',
            message: 'কালেকশন রেকর্ড সংশোধন করা হয়েছে এবং সংশোধন SMS কিউ করা হয়েছে।',
          });
          fetchDayData(selectedDate);
        }}
      />

      {/* Mobile Sticky Action Bar (Matches design/09-mobile_entry.png bottom bar) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-line p-3 shadow-lg md:hidden print:hidden">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-ink-muted font-medium">এখন পর্যন্ত মোট:</span>
          <span className="text-base font-bold font-mono-num text-forest">
            {formatCurrency(liveTotals.collected_total)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isConfirmed ? (
            <>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft || !isDirty}
                className="flex-1 py-2.5 bg-paper hover:bg-paper-dark border border-line text-ink rounded-btn text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-forest" />
                <span>{savingDraft ? 'সংরক্ষণ...' : isDirty ? 'খসড়া রাখুন *' : 'খসড়া সংরক্ষিত'}</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmModalOpen(true)}
                className="flex-1 py-2.5 bg-forest hover:bg-forest-light text-white rounded-btn text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>নিশ্চিত ও SMS</span>
              </button>
            </>
          ) : (
            <div className="w-full text-center py-2.5 text-xs font-semibold text-forest flex items-center justify-center gap-1.5 bg-mint/20 rounded-btn border border-mint/40">
              <CheckCircle2 className="w-4 h-4" />
              <span>আজকের কালেকশন শিট নিশ্চিতকৃত</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
