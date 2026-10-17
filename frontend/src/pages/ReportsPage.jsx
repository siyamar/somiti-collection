import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { formatDate, formatMoney } from '../lib/format';
import dayjs from 'dayjs';
import {
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  UserCheck,
  Download,
  Printer,
  Search,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building,
  User,
  Phone,
  MapPin,
  Clock,
} from 'lucide-react';

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'daily';
  const [activeTab, setActiveTab] = useState(initialTab); // 'daily' | 'monthly' | 'dues' | 'statement'

  // Update URL search param on tab switch
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Toast State
  const [toast, setToast] = useState(null);

  // -------------------------------------------------------------
  // TAB 1: Daily Report State
  // -------------------------------------------------------------
  const [dailyDate, setDailyDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyData, setDailyData] = useState(null);

  const fetchDailyReport = async (date) => {
    try {
      setDailyLoading(true);
      const res = await api.get('/reports/daily', { params: { date } });
      setDailyData(res.data);
    } catch (err) {
      console.error('Failed to load daily report:', err);
    } finally {
      setDailyLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyReport(dailyDate);
    }
  }, [activeTab, dailyDate]);

  // -------------------------------------------------------------
  // TAB 2: Monthly Report State
  // -------------------------------------------------------------
  const [monthlyMonth, setMonthlyMonth] = useState(dayjs().format('YYYY-MM'));
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState(null);

  const fetchMonthlyReport = async (month) => {
    try {
      setMonthlyLoading(true);
      const res = await api.get('/reports/monthly', { params: { month } });
      setMonthlyData(res.data);
    } catch (err) {
      console.error('Failed to load monthly report:', err);
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyReport(monthlyMonth);
    }
  }, [activeTab, monthlyMonth]);

  // -------------------------------------------------------------
  // TAB 3: Defaulters / Due List State
  // -------------------------------------------------------------
  const [minDays, setMinDays] = useState(3);
  const [areaFilter, setAreaFilter] = useState('');
  const [areasList, setAreasList] = useState([]);
  const [duesLoading, setDuesLoading] = useState(false);
  const [duesData, setDuesData] = useState(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [sendingBatchReminder, setSendingBatchReminder] = useState(false);

  const fetchDuesReport = async () => {
    try {
      setDuesLoading(true);
      const res = await api.get('/reports/dues', {
        params: { min_days: minDays, area: areaFilter || undefined },
      });
      setDuesData(res.data);
      setSelectedMemberIds([]); // reset selection
    } catch (err) {
      console.error('Failed to load dues report:', err);
    } finally {
      setDuesLoading(false);
    }
  };

  // Fetch areas for filter dropdown
  useEffect(() => {
    api.get('/members/areas').then((res) => {
      setAreasList(res.data?.areas || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'dues') {
      fetchDuesReport();
    }
  }, [activeTab, minDays, areaFilter]);

  // Checkbox handlers for batch SMS
  const toggleSelectMember = (id) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!duesData?.items) return;
    if (selectedMemberIds.length === duesData.items.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(duesData.items.map((i) => i.id));
    }
  };

  const handleSendBatchReminders = async () => {
    if (selectedMemberIds.length === 0) return;
    try {
      setSendingBatchReminder(true);
      const res = await api.post('/sms/reminders', { member_ids: selectedMemberIds });
      setToast({
        type: 'success',
        text: res.data?.message || 'বকেয়া রিমাইন্ডার SMS সফলভাবে কিউতে যুক্ত করা হয়েছে।',
      });
      setSelectedMemberIds([]);
    } catch (err) {
      setToast({
        type: 'error',
        text: err.response?.data?.error?.message || 'রিমাইন্ডার পাঠাতে সমস্যা হয়েছে।',
      });
    } finally {
      setSendingBatchReminder(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 4: Member Statement / Passbook State
  // -------------------------------------------------------------
  const [statementMemberId, setStatementMemberId] = useState('');
  const [statementFrom, setStatementFrom] = useState('');
  const [statementTo, setStatementTo] = useState('');
  const [membersList, setMembersList] = useState([]);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementData, setStatementData] = useState(null);

  // Fetch active members list for dropdown
  useEffect(() => {
    api.get('/members', { params: { limit: 100 } }).then((res) => {
      const items = res.data?.items || [];
      setMembersList(items);
      if (items.length > 0 && !statementMemberId) {
        setStatementMemberId(items[0].id);
      }
    }).catch(() => {});
  }, []);

  const fetchStatement = async (id, from, to) => {
    if (!id) return;
    try {
      setStatementLoading(true);
      const res = await api.get(`/reports/statement/${id}`, {
        params: { from: from || undefined, to: to || undefined },
      });
      setStatementData(res.data);
    } catch (err) {
      console.error('Failed to load statement:', err);
    } finally {
      setStatementLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'statement' && statementMemberId) {
      fetchStatement(statementMemberId, statementFrom, statementTo);
    }
  }, [activeTab, statementMemberId, statementFrom, statementTo]);

  // Generic Excel Download Helper
  const downloadExcel = (url) => {
    window.open(`/api${url}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Printable CSS style rules */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-statement, #printable-statement * {
            visibility: visible;
          }
          #printable-statement {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header & Tabs Navigation (No Print) */}
      <div className="no-print space-y-4">
        <div>
          <h1 className="font-serif-bn text-2xl md:text-3xl font-bold text-ink">
            রিপোর্ট ও খতিয়ান
          </h1>
          <p className="text-xs text-ink-light mt-0.5">
            দৈনিক, মাসিক, বকেয়া বিশ্লেষণ ও সদস্যের প্রিন্টযোগ্য হিসাব বিবরণী
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-line overflow-x-auto text-xs sm:text-sm font-medium gap-2">
          <button
            onClick={() => handleTabChange('daily')}
            className={`pb-2.5 px-3 whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'daily'
                ? 'border-forest text-forest font-semibold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <Calendar className="w-4 h-4" />
            দৈনিক কালেকশন রিপোর্ট
          </button>

          <button
            onClick={() => handleTabChange('monthly')}
            className={`pb-2.5 px-3 whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'monthly'
                ? 'border-forest text-forest font-semibold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            মাসিক রিপোর্ট
          </button>

          <button
            onClick={() => handleTabChange('dues')}
            className={`pb-2.5 px-3 whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'dues'
                ? 'border-forest text-forest font-semibold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-wine" />
            বকেয়া তালিকা (৩+ দিন)
          </button>

          <button
            onClick={() => handleTabChange('statement')}
            className={`pb-2.5 px-3 whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'statement'
                ? 'border-forest text-forest font-semibold'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <UserCheck className="w-4 h-4 text-forest" />
            সদস্য হিসাব বিবরণী (পাসবুক)
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`no-print p-3 rounded-card text-xs flex items-center justify-between ${
            toast.type === 'success'
              ? 'bg-mint/15 text-forest border border-mint/40'
              : 'bg-wine/10 text-wine border border-wine/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="underline hover:opacity-80">
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: দৈনিক কালেকশন রিপোর্ট (Matching design/19-report_daily.png) */}
      {/* ============================================================== */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Top Filter and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-card border border-line shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-muted">তারিখ নির্বাচন:</span>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="h-input px-3 bg-paper border border-line rounded-btn text-xs text-ink focus:outline-none focus:border-forest"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadExcel(`/reports/daily?date=${dailyDate}&format=xlsx`)}
                className="h-btn px-3.5 bg-paper hover:bg-paper-dark border border-line text-xs font-medium text-ink rounded-btn flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-forest" />
                Excel ডাউনলোড
              </button>

              <button
                onClick={() => window.print()}
                className="h-btn px-3.5 bg-paper hover:bg-paper-dark border border-line text-xs font-medium text-ink rounded-btn flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-forest" />
                প্রিন্ট
              </button>
            </div>
          </div>

          {/* KPI Summary Cards (Matching design/19-report_daily.png) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-4 bg-white border border-line rounded-card">
              <span className="text-xs text-ink-light block">মোট সদস্য</span>
              <span className="text-xl font-bold font-serif-bn text-ink mt-1 block">
                {dailyData?.summary?.total_members || 0} জন
              </span>
            </div>

            <div className="p-4 bg-white border border-line rounded-card">
              <span className="text-xs text-ink-light block">জমা দিয়েছেন</span>
              <span className="text-xl font-bold font-serif-bn text-forest mt-1 block">
                {dailyData?.summary?.paid_members || 0} জন
              </span>
            </div>

            <div className="p-4 bg-white border border-line rounded-card">
              <span className="text-xs text-ink-light block">মোট সঞ্চয় জমা</span>
              <span className="text-xl font-bold font-serif-bn text-forest mt-1 block">
                ৳ {formatMoney(dailyData?.summary?.collected_total || 0)}
              </span>
            </div>

            <div className="p-4 bg-white border border-line rounded-card">
              <span className="text-xs text-ink-light block">প্রত্যাশিত লক্ষ্য</span>
              <span className="text-xl font-bold font-serif-bn text-ink mt-1 block">
                ৳ {formatMoney(dailyData?.summary?.expected_total || 0)}
              </span>
            </div>

            <div className="p-4 bg-white border border-line rounded-card col-span-2 md:col-span-1">
              <span className="text-xs text-ink-light block">ঘাটতি</span>
              <span className="text-xl font-bold font-serif-bn text-wine mt-1 block">
                ৳ {formatMoney(dailyData?.summary?.shortfall || 0)}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-line rounded-card shadow-sm overflow-hidden">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="font-serif-bn font-bold text-base text-ink">
                  {formatDate(dailyDate)} এর কালেকশন বিবরণ
                </h3>
                <span className="text-xs text-ink-light">
                  স্ট্যাটাস: {dailyData?.summary?.day_status === 'confirmed' ? 'নিশ্চিত' : 'খসড়া / অনিশ্চিত'}
                </span>
              </div>
            </div>

            {dailyLoading ? (
              <div className="p-10 text-center text-ink-light">
                <RefreshCw className="w-6 h-6 animate-spin text-forest mx-auto mb-2" />
                তথ্য লোড হচ্ছে...
              </div>
            ) : dailyData?.items?.length === 0 ? (
              <div className="p-10 text-center text-ink-light text-xs">
                এই তারিখে কোনো কালেকশন এন্ট্রি নেই।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-paper border-b border-line text-ink-muted font-medium">
                      <th className="py-2.5 px-4">কোড</th>
                      <th className="py-2.5 px-4">সদস্যের নাম</th>
                      <th className="py-2.5 px-4">মোবাইল</th>
                      <th className="py-2.5 px-4">এলাকা</th>
                      <th className="py-2.5 px-4 text-right">প্রত্যাশিত (৳)</th>
                      <th className="py-2.5 px-4 text-right">আদায় (৳)</th>
                      <th className="py-2.5 px-4 text-right">মোট সঞ্চয় স্থিতি (৳)</th>
                      <th className="py-2.5 px-4">মন্তব্য</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {dailyData?.items?.map((item) => (
                      <tr key={item.collection_id} className="hover:bg-paper/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-ink-light">{item.member_code}</td>
                        <td className="py-3 px-4 font-semibold text-ink">{item.member_name}</td>
                        <td className="py-3 px-4 font-mono text-ink">{item.member_phone}</td>
                        <td className="py-3 px-4 text-ink-muted">{item.area || '—'}</td>
                        <td className="py-3 px-4 text-right font-mono text-ink">
                          {formatMoney(item.expected_amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-forest">
                          {formatMoney(item.amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-ink">
                          {formatMoney(item.total_savings)}
                        </td>
                        <td className="py-3 px-4 text-ink-light">{item.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: মাসিক রিপোর্ট (Monthly Collection Report) */}
      {/* ============================================================== */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-card border border-line shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-muted">মাস নির্বাচন:</span>
              <input
                type="month"
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(e.target.value)}
                className="h-input px-3 bg-paper border border-line rounded-btn text-xs text-ink focus:outline-none focus:border-forest"
              />
            </div>

            <button
              onClick={() => downloadExcel(`/reports/monthly?month=${monthlyMonth}&format=xlsx`)}
              className="h-btn px-3.5 bg-paper hover:bg-paper-dark border border-line text-xs font-medium text-ink rounded-btn flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-forest" />
              Excel ডাউনলোড
            </button>
          </div>

          {/* Monthly KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white border border-line rounded-card">
              <span className="text-xs text-ink-light block">মাসের মোট কালেকশন</span>
              <span className="text-2xl font-bold font-serif-bn text-forest mt-1.5 block">
                ৳ {formatMoney(monthlyData?.summary?.monthly_total || 0)}
              </span>
              <span className="text-[11px] text-ink-light mt-1 block">
                শুধুমাত্র নিশ্চিত দিনের সঞ্চয় গণনা করা হয়েছে
              </span>
            </div>

            <div className="p-5 bg-white border border-line rounded-card">
              <span className="text-xs text-ink-light block">নিশ্চিত কার্যদিবস</span>
              <span className="text-2xl font-bold font-serif-bn text-ink mt-1.5 block">
                {monthlyData?.summary?.confirmed_days || 0} দিন
              </span>
              <span className="text-[11px] text-ink-light mt-1 block">
                চলতি মাসে কালেকশন শিট সম্পন্ন হয়েছে
              </span>
            </div>

            <div className="p-5 bg-white border border-line rounded-card">
              <span className="text-xs text-ink-light block">দৈনিক গড় আদায়</span>
              <span className="text-2xl font-bold font-serif-bn text-ink mt-1.5 block">
                ৳ {formatMoney(monthlyData?.summary?.average_daily || 0)}
              </span>
              <span className="text-[11px] text-ink-light mt-1 block">
                প্রতি কর্মদিবসের গড় কালেকশন
              </span>
            </div>
          </div>

          {/* Monthly Days Table */}
          <div className="bg-white border border-line rounded-card shadow-sm overflow-hidden">
            <div className="p-4 border-b border-line">
              <h3 className="font-serif-bn font-bold text-base text-ink">
                প্রতিদিনের কালেকশন তালিকা ({monthlyMonth})
              </h3>
            </div>

            {monthlyLoading ? (
              <div className="p-10 text-center text-ink-light">
                <RefreshCw className="w-6 h-6 animate-spin text-forest mx-auto mb-2" />
                তথ্য লোড হচ্ছে...
              </div>
            ) : monthlyData?.items?.length === 0 ? (
              <div className="p-10 text-center text-ink-light text-xs">
                এই মাসে কোনো কালেকশন কার্যদিবস পাওয়া যায়নি।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-paper border-b border-line text-ink-muted font-medium">
                      <th className="py-2.5 px-4">তারিখ</th>
                      <th className="py-2.5 px-4">স্ট্যাটাস</th>
                      <th className="py-2.5 px-4">আদায়কারী সদস্য</th>
                      <th className="py-2.5 px-4 text-right">মোট আদায় (৳)</th>
                      <th className="py-2.5 px-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {monthlyData?.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-paper/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-ink">
                          {formatDate(item.collect_date)}
                        </td>
                        <td className="py-3 px-4">
                          {item.status === 'confirmed' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-mint/15 text-forest border border-mint/30">
                              নিশ্চিত
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-ochre/15 text-ochre border border-ochre/30">
                              খসড়া
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-ink">
                          {item.paid_count} / {item.total_count} জন
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-forest text-sm">
                          ৳ {formatMoney(item.total_amount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/collections?date=${item.collect_date}`}
                            className="text-xs text-forest hover:underline font-medium"
                          >
                            শিট দেখুন
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: বকেয়া তালিকা (Matching design/20-defaulters.png) */}
      {/* ============================================================== */}
      {activeTab === 'dues' && (
        <div className="space-y-6">
          {/* Top 3 KPI Cards (Matching design/20-defaulters.png) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white border border-line rounded-card shadow-xs">
              <span className="text-xs text-ink-light block">৩-৪ দিন বাকি</span>
              <div className="my-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-serif-bn text-ink">
                  {duesData?.summary?.count_3_to_4 || 0}
                </span>
                <span className="text-xs text-ink-light">জন</span>
              </div>
              <span className="text-[11px] text-ink-muted">স্বল্পমেয়াদী বকেয়া</span>
            </div>

            <div className="p-5 bg-white border border-line rounded-card shadow-xs">
              <span className="text-xs text-ink-light block">৫-৬ দিন বাকি</span>
              <div className="my-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-serif-bn text-ochre">
                  {duesData?.summary?.count_5_to_6 || 0}
                </span>
                <span className="text-xs text-ink-light">জন</span>
              </div>
              <span className="text-[11px] text-ochre">মনোযোগ দেওয়া প্রয়োজন</span>
            </div>

            <div className="p-5 bg-white border border-wine/30 rounded-card shadow-xs bg-wine/5">
              <span className="text-xs text-wine block font-medium">৭ দিন বা বেশি বাকি</span>
              <div className="my-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-serif-bn text-wine">
                  {duesData?.summary?.count_7_plus || 0}
                </span>
                <span className="text-xs text-wine">জন</span>
              </div>
              <span className="text-[11px] text-wine font-medium">
                মাঠ পরিদর্শন ও দ্রুত যোগাযোগ দরকার
              </span>
            </div>
          </div>

          {/* Filter Bar & Batch SMS Button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-card border border-line shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted">বকেয়ার সময়:</span>
                <select
                  value={minDays}
                  onChange={(e) => setMinDays(Number(e.target.value))}
                  className="h-input px-3 bg-paper border border-line rounded-btn text-xs text-ink focus:outline-none"
                >
                  <option value={1}>কমপক্ষে ১ দিন বাকি</option>
                  <option value={3}>কমপক্ষে ৩ দিন বাকি</option>
                  <option value={5}>কমপক্ষে ৫ দিন বাকি</option>
                  <option value={7}>কমপক্ষে ৭ দিন বাকি</option>
                </select>
              </div>

              {areasList.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-muted">এলাকা:</span>
                  <select
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="h-input px-3 bg-paper border border-line rounded-btn text-xs text-ink focus:outline-none"
                  >
                    <option value="">সকল এলাকা</option>
                    {areasList.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadExcel(`/reports/dues?min_days=${minDays}&area=${areaFilter}&format=xlsx`)}
                className="h-btn px-3 bg-paper hover:bg-paper-dark border border-line text-xs font-medium text-ink rounded-btn flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-forest" />
                Excel
              </button>

              <button
                onClick={handleSendBatchReminders}
                disabled={selectedMemberIds.length === 0 || sendingBatchReminder}
                className="h-btn px-4 bg-ochre hover:bg-ochre-dark text-white text-xs font-medium rounded-btn flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
              >
                {sendingBatchReminder ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>নির্বাচিত {selectedMemberIds.length} জনকে রিমাইন্ডার SMS</span>
              </button>
            </div>
          </div>

          {/* Dues Table */}
          <div className="bg-white border border-line rounded-card shadow-sm overflow-hidden">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <h3 className="font-serif-bn font-bold text-base text-ink">
                বকেয়া সদস্যদের বিস্তারিত তালিকা
              </h3>
              <span className="text-xs text-ink-light">
                মোট বকেয়া টাকা: ৳ {formatMoney(duesData?.summary?.total_due_amount || 0)}
              </span>
            </div>

            {duesLoading ? (
              <div className="p-10 text-center text-ink-light">
                <RefreshCw className="w-6 h-6 animate-spin text-forest mx-auto mb-2" />
                তথ্য লোড হচ্ছে...
              </div>
            ) : duesData?.items?.length === 0 ? (
              <div className="p-10 text-center text-ink-light text-xs">
                🎉 কোনো সদস্যের বকেয়া নেই!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-paper border-b border-line text-ink-muted font-medium">
                      <th className="py-2.5 px-4 w-8">
                        <input
                          type="checkbox"
                          checked={
                            duesData?.items &&
                            selectedMemberIds.length === duesData.items.length
                          }
                          onChange={toggleSelectAll}
                          className="rounded border-line text-forest focus:ring-forest cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-4">সদস্য</th>
                      <th className="py-2.5 px-4">মোবাইল</th>
                      <th className="py-2.5 px-4">পরপর বাকি দিন</th>
                      <th className="py-2.5 px-4">সর্বশেষ জমা</th>
                      <th className="py-2.5 px-4 text-right">দৈনিক কিস্তি</th>
                      <th className="py-2.5 px-4 text-right">মোট বকেয়া (৳)</th>
                      <th className="py-2.5 px-4 text-right">বর্তমান সঞ্চয় স্থিতি (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {duesData?.items?.map((item) => {
                      const isSelected = selectedMemberIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-paper/40 transition-colors ${
                            isSelected ? 'bg-forest/5' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectMember(item.id)}
                              className="rounded border-line text-forest focus:ring-forest cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <Link
                                to={`/members/${item.id}`}
                                className="font-semibold text-ink hover:text-forest underline"
                              >
                                {item.name}
                              </Link>
                              <span className="text-[10px] text-ink-light block font-mono">
                                {item.member_code} {item.area ? `· ${item.area}` : ''}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-ink">{item.phone}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                item.missed_days >= 7
                                  ? 'bg-wine/15 text-wine'
                                  : item.missed_days >= 5
                                  ? 'bg-ochre/15 text-ochre'
                                  : 'bg-paper border border-line text-ink'
                              }`}
                            >
                              {item.missed_days} দিন বাকি
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-ink-light">
                            {item.last_paid ? formatDate(item.last_paid) : 'কখনও দেননি'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-ink">
                            ৳ {formatMoney(item.daily_amount)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-wine">
                            ৳ {formatMoney(item.total_due)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-ink font-medium">
                            ৳ {formatMoney(item.total_savings)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: সদস্য হিসাব বিবরণী / পাসবুক (Matching design/13-passbook.png) */}
      {/* ============================================================== */}
      {activeTab === 'statement' && (
        <div className="space-y-6">
          {/* Member Picker & Filter Bar (No Print) */}
          <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-card border border-line shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-muted">সদস্য নির্বাচন:</span>
                <select
                  value={statementMemberId}
                  onChange={(e) => setStatementMemberId(e.target.value)}
                  className="h-input px-3 bg-paper border border-line rounded-btn text-xs text-ink focus:outline-none min-w-[200px]"
                >
                  {membersList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.member_code} - {m.name} ({m.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                <span>তারিখ থেকে:</span>
                <input
                  type="date"
                  value={statementFrom}
                  onChange={(e) => setStatementFrom(e.target.value)}
                  className="h-input px-2 bg-paper border border-line rounded-btn text-xs text-ink focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                <span>পর্যন্ত:</span>
                <input
                  type="date"
                  value={statementTo}
                  onChange={(e) => setStatementTo(e.target.value)}
                  className="h-input px-2 bg-paper border border-line rounded-btn text-xs text-ink focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  downloadExcel(
                    `/reports/statement/${statementMemberId}?from=${statementFrom}&to=${statementTo}&format=xlsx`
                  )
                }
                className="h-btn px-3 bg-paper hover:bg-paper-dark border border-line text-xs font-medium text-ink rounded-btn flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-forest" />
                Excel
              </button>

              <button
                onClick={() => window.print()}
                className="h-btn px-4 bg-forest hover:bg-forest-light text-white text-xs font-medium rounded-btn flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                বিবরণী প্রিন্ট করুন
              </button>
            </div>
          </div>

          {/* Printable Statement Sheet (Matching design/13-passbook.png) */}
          <div
            id="printable-statement"
            className="bg-white border border-line rounded-card p-6 md:p-8 shadow-sm space-y-6 max-w-4xl mx-auto"
          >
            {/* Top Sheet Header with Logo */}
            <div className="flex items-start justify-between border-b border-ink/20 pb-5">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="সবুজ বাংলা"
                  className="w-12 h-12 object-contain rounded-full bg-paper p-1 border border-line"
                />
                <div>
                  <h2 className="font-serif-bn font-bold text-xl text-ink leading-tight">
                    সবুজ বাংলা সমবায় সমিতি লিঃ
                  </h2>
                  <p className="text-xs text-ink-light">
                    দৈনিক সঞ্চয় ও ক্ষুদ্র ঋণ কর্মসূচি
                  </p>
                </div>
              </div>

              <div className="text-right">
                <h3 className="font-serif-bn font-bold text-lg text-ink">
                  সদস্য হিসাব বিবরণী
                </h3>
                <span className="text-xs text-ink-light font-mono">
                  {statementFrom || statementTo
                    ? `${statementFrom || 'শুরু'} – ${statementTo || 'আজ'}`
                    : 'সম্পূর্ণ বিবরণী'}
                </span>
              </div>
            </div>

            {/* Member Details Box */}
            {statementData?.member && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-paper/50 p-4 rounded-btn border border-line text-xs">
                <div>
                  <span className="text-ink-light block">সদস্যের নাম</span>
                  <strong className="text-ink font-serif-bn text-sm block">
                    {statementData.member.name}
                  </strong>
                </div>

                <div>
                  <span className="text-ink-light block">সদস্য কোড</span>
                  <strong className="text-ink font-mono text-sm block">
                    {statementData.member.member_code}
                  </strong>
                </div>

                <div>
                  <span className="text-ink-light block">মোবাইল নম্বর</span>
                  <span className="text-ink font-mono block">
                    {statementData.member.phone}
                  </span>
                </div>

                <div>
                  <span className="text-ink-light block">এলাকা</span>
                  <span className="text-ink block">{statementData.member.area || '—'}</span>
                </div>

                <div>
                  <span className="text-ink-light block">দৈনিক জমার হার</span>
                  <strong className="text-ink font-mono block">
                    ৳ {formatMoney(statementData.member.daily_amount)}
                  </strong>
                </div>

                <div>
                  <span className="text-ink-light block">মোট সঞ্চয় স্থিতি</span>
                  <strong className="text-forest font-mono text-base block font-bold">
                    ৳ {formatMoney(statementData.member.total_savings)}
                  </strong>
                </div>
              </div>
            )}

            {/* Transaction Ledger Table */}
            {statementLoading ? (
              <div className="p-8 text-center text-ink-light">
                <RefreshCw className="w-6 h-6 animate-spin text-forest mx-auto mb-2" />
                বিবরণী লোড হচ্ছে...
              </div>
            ) : statementData?.transactions?.length === 0 ? (
              <div className="p-8 text-center text-ink-light text-xs">
                কোনো নিশ্চিত জমা রেকর্ড পাওয়া যায়নি।
              </div>
            ) : (
              <div className="border border-line rounded-btn overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-paper border-b border-line text-ink-muted font-medium">
                      <th className="py-2.5 px-3">তারিখ</th>
                      <th className="py-2.5 px-3 text-right">জমা (৳)</th>
                      <th className="py-2.5 px-3 text-right">সঞ্চয় স্থিতি (৳)</th>
                      <th className="py-2.5 px-3">মন্তব্য</th>
                      <th className="py-2.5 px-3 text-center w-28">স্বাক্ষর</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {statementData?.transactions?.map((tx) => (
                      <tr key={tx.id}>
                        <td className="py-2.5 px-3 font-mono">{formatDate(tx.collect_date)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-forest">
                          {formatMoney(tx.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-ink">
                          {formatMoney(tx.balance)}
                        </td>
                        <td className="py-2.5 px-3 text-ink-light">{tx.note || '—'}</td>
                        <td className="py-2.5 px-3 text-center border-l border-line text-ink-light">
                          {/* Blank for physical signature */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary Box */}
            <div className="p-4 bg-paper/60 border border-line rounded-btn flex items-center justify-between text-xs">
              <span className="font-medium text-ink">
                মোট জমার পরিমাণ: {statementData?.transactions?.length || 0} টি কিস্তি
              </span>
              <span className="text-sm font-bold text-forest font-mono">
                সর্বমোট আমানত: ৳ {formatMoney(statementData?.member?.total_savings || 0)}
              </span>
            </div>

            {/* Bottom 3 Signature Blocks (Matching design/13-passbook.png) */}
            <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs text-ink-muted">
              <div>
                <div className="border-t border-ink/40 w-3/4 mx-auto pt-1 font-medium">
                  সদস্যের স্বাক্ষর
                </div>
              </div>
              <div>
                <div className="border-t border-ink/40 w-3/4 mx-auto pt-1 font-medium">
                  মাঠকর্মী / ক্যাশিয়ার
                </div>
              </div>
              <div>
                <div className="border-t border-ink/40 w-3/4 mx-auto pt-1 font-medium">
                  শাখা ব্যবস্থাপক
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-line text-center text-[10px] text-ink-light">
              কম্পিউটারে তৈরি বিবরণী · প্রিন্ট তারিখ: {formatDate(new Date())} · সবুজ বাংলা সমবায় সমিতি লিঃ
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
