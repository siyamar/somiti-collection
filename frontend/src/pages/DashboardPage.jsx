import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatMoney } from '../lib/format';
import dayjs from 'dayjs';
import {
  Calendar,
  Users,
  AlertTriangle,
  PiggyBank,
  ArrowRight,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [reminderSendingId, setReminderSendingId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Time based Bangla greeting
  const getGreeting = () => {
    const hour = dayjs().hour();
    if (hour < 12) return 'শুভ সকাল';
    if (hour < 16) return 'শুভ দুপুর';
    if (hour < 19) return 'শুভ অপরাহ্ন';
    return 'শুভ সন্ধ্যা';
  };

  const fetchDashboard = async (date) => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard', { params: { date } });
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedDate);
  }, [selectedDate]);

  // Send single reminder SMS to an unpaid member
  const handleSendReminder = async (memberId, memberName) => {
    try {
      setReminderSendingId(memberId);
      const res = await api.post('/sms/reminders', { member_ids: [memberId] });
      setToastMessage({
        type: 'success',
        text: `${memberName}-এর কাছে রিমাইন্ডার SMS সফলভাবে কিউতে যুক্ত করা হয়েছে।`,
      });
      fetchDashboard(selectedDate);
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'রিমাইন্ডার পাঠাতে সমস্যা হয়েছে।',
      });
    } finally {
      setReminderSendingId(null);
    }
  };

  const metrics = dashboardData?.metrics || {
    today_total: 0,
    paid_members: 0,
    total_members: 0,
    paid_percentage: 0,
    due_3plus_count: 0,
    all_time_total: 0,
  };

  const chartDays = dashboardData?.chart_14_days || [];
  const maxChartAmount = Math.max(...chartDays.map((d) => d.total), 100);

  const smsStats = dashboardData?.sms_stats || { sent: 0, pending: 0, sending: 0, failed: 0 };
  const totalSmsToday = smsStats.sent + smsStats.pending + smsStats.sending + smsStats.failed;

  const sentPct = totalSmsToday > 0 ? (smsStats.sent / totalSmsToday) * 100 : 0;
  const pendingPct = totalSmsToday > 0 ? ((smsStats.pending + smsStats.sending) / totalSmsToday) * 100 : 0;
  const failedPct = totalSmsToday > 0 ? (smsStats.failed / totalSmsToday) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Greeting & Date Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-bn text-2xl md:text-3xl font-bold text-ink">
            {getGreeting()}, {user?.name}!
          </h1>
          <p className="text-xs md:text-sm text-ink-light mt-0.5">
            {formatDate(selectedDate)} · সবুজ বাংলা সমবায় সমিতি লিঃ
            {dashboardData?.day_status === 'confirmed' ? (
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-forest bg-mint/20 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> আজকের কালেকশন নিশ্চিত
              </span>
            ) : dashboardData?.day_status === 'draft' ? (
              <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-ochre bg-ochre/15 px-2 py-0.5 rounded-full">
                খসড়া সংরক্ষিত
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-line rounded-btn px-2.5 py-1.5 shadow-xs">
            <Calendar className="w-4 h-4 text-forest shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs text-ink bg-transparent focus:outline-none"
            />
            {selectedDate !== dayjs().format('YYYY-MM-DD') && (
              <button
                onClick={() => setSelectedDate(dayjs().format('YYYY-MM-DD'))}
                className="text-[11px] px-2 py-0.5 bg-paper hover:bg-paper-dark text-forest font-medium rounded-btn ml-1"
              >
                আজ
              </button>
            )}
          </div>

          <Link
            to="/collections"
            className="h-btn px-4 bg-forest hover:bg-forest-light text-white text-xs md:text-sm font-medium rounded-btn flex items-center gap-2 shadow-sm transition-colors"
          >
            <span>+ কালেকশন শিট</span>
          </Link>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-3 rounded-card text-xs flex items-center justify-between ${
            toastMessage.type === 'success'
              ? 'bg-mint/15 text-forest border border-mint/40'
              : 'bg-wine/10 text-wine border border-wine/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[11px] underline hover:opacity-80"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* 4 KPI Cards (Matching design/03-dashboard.png) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: আজকের মোট কালেকশন (Forest Dark Green Card) */}
        <div className="p-5 bg-forest text-white rounded-card shadow-sm flex flex-col justify-between">
          <div className="text-xs text-mint/80 font-medium">আজকের মোট কালেকশন</div>
          <div className="my-2">
            <span className="font-serif-bn font-bold text-2xl lg:text-3xl tracking-tight">
              ৳ {formatMoney(metrics.today_total)}
            </span>
          </div>
          <div className="text-[11px] text-mint/70 flex items-center justify-between">
            <span>
              {dashboardData?.day_status === 'confirmed' ? 'নিশ্চিত শিটের হিসাব' : 'খসড়া / অপেক্ষমাণ'}
            </span>
            <Link to="/collections" className="underline hover:text-white flex items-center gap-1">
              শিট দেখুন <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: জমা দিয়েছেন */}
        <div className="p-5 bg-white border border-line rounded-card shadow-sm flex flex-col justify-between">
          <div className="text-xs text-ink-muted font-medium flex items-center justify-between">
            <span>জমা দিয়েছেন</span>
            <Users className="w-4 h-4 text-forest" />
          </div>
          <div className="my-2">
            <span className="font-serif-bn font-bold text-2xl lg:text-3xl text-ink">
              {metrics.paid_members}
            </span>
            <span className="text-xs text-ink-light ml-1 font-mono-num">
              / {metrics.total_members} জন
            </span>
          </div>
          <div className="text-[11px] text-forest font-medium">
            {metrics.paid_percentage}% সদস্য আজকের সঞ্চয় দিয়েছেন
          </div>
        </div>

        {/* Card 3: বকেয়া সদস্য (৩+ দিন) */}
        <div className="p-5 bg-white border border-line rounded-card shadow-sm flex flex-col justify-between">
          <div className="text-xs text-ink-muted font-medium flex items-center justify-between">
            <span>বকেয়া সদস্য (৩+ দিন)</span>
            <AlertTriangle className="w-4 h-4 text-wine" />
          </div>
          <div className="my-2">
            <span className="font-serif-bn font-bold text-2xl lg:text-3xl text-wine">
              {metrics.due_3plus_count}
            </span>
            <span className="text-xs text-wine ml-1 font-medium">জন</span>
          </div>
          <div className="text-[11px] text-ink-light flex items-center justify-between">
            <span>পরপর ৩ বা তার বেশি দিন অনাদায়ী</span>
            <Link to="/reports?tab=dues" className="text-wine underline font-medium flex items-center gap-0.5">
              তালিকা <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: সর্বমোট সঞ্চয় তহবিল */}
        <div className="p-5 bg-white border border-line rounded-card shadow-sm flex flex-col justify-between">
          <div className="text-xs text-ink-muted font-medium flex items-center justify-between">
            <span>সর্বমোট সঞ্চয় তহবিল</span>
            <PiggyBank className="w-4 h-4 text-forest" />
          </div>
          <div className="my-2">
            <span className="font-serif-bn font-bold text-2xl lg:text-3xl text-forest">
              ৳ {formatMoney(metrics.all_time_total)}
            </span>
          </div>
          <div className="text-[11px] text-ink-light">
            সকল নিশ্চিত দিনের সংগৃহীত মোট আমানত
          </div>
        </div>
      </div>

      {/* Middle Grid: 14-day Chart & Today's SMS Status (Matching design/03-dashboard.png) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 14-Day Collection Trend Bar Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-line rounded-card p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif-bn font-bold text-base text-ink">
                দৈনিক কালেকশন
              </h3>
              <p className="text-xs text-ink-light">গত ১৪ দিনের আদায় চিত্র (টাকা)</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-ink-muted">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-forest inline-block" /> নিশ্চিত
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-ochre inline-block" /> আজ
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-line inline-block" /> বন্ধ / ০
              </span>
            </div>
          </div>

          {/* Bar Chart Canvas */}
          <div className="h-48 pt-4 flex items-end justify-between gap-1 border-b border-line pb-2">
            {chartDays.map((d) => {
              const heightPct = d.total > 0 ? Math.max(12, Math.round((d.total / maxChartAmount) * 100)) : 4;
              const isToday = d.is_current;
              const isConfirmedDay = d.status === 'confirmed';

              let barColor = 'bg-line hover:bg-gray-300';
              if (isToday) {
                barColor = 'bg-ochre hover:bg-ochre-dark';
              } else if (isConfirmedDay && d.total > 0) {
                barColor = 'bg-forest hover:bg-forest-light';
              }

              return (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
                  onClick={() => setSelectedDate(d.date)}
                >
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-ink text-white text-[10px] rounded px-2 py-1 whitespace-nowrap pointer-events-none z-10 shadow-md">
                    <span className="font-bold">{d.display_date}</span>: ৳{formatMoney(d.total)} ({d.status === 'confirmed' ? 'নিশ্চিত' : 'খসড়া/নেই'})
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[28px] rounded-t-xs transition-all ${barColor}`}
                  />

                  {/* Label */}
                  <span
                    className={`text-[10px] mt-2 font-mono-num ${
                      isToday ? 'font-bold text-forest underline' : 'text-ink-light'
                    }`}
                  >
                    {d.day_number}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-2 text-right">
            <span className="text-[11px] text-ink-light">
              তারিখের বারে ক্লিক করে নির্দিষ্ট দিনের ড্যাশবোর্ড দেখুন
            </span>
          </div>
        </div>

        {/* SMS Status Widget (4 cols, matching design/03-dashboard.png) */}
        <div className="lg:col-span-4 bg-white border border-line rounded-card p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-bn font-bold text-base text-ink">
                SMS অবস্থা
              </h3>
              <span className="text-xs text-ink-light">আজ ({selectedDate})</span>
            </div>

            {/* Multi-segment Progress Bar */}
            <div className="w-full h-3 rounded-full bg-paper overflow-hidden flex mb-5 border border-line">
              <div style={{ width: `${sentPct}%` }} className="bg-forest h-full" title={`পাঠানো: ${smsStats.sent}`} />
              <div style={{ width: `${pendingPct}%` }} className="bg-ochre h-full" title={`অপেক্ষমাণ: ${smsStats.pending}`} />
              <div style={{ width: `${failedPct}%` }} className="bg-wine h-full" title={`ব্যর্থ: ${smsStats.failed}`} />
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-btn bg-paper/60 border border-line">
                <span className="text-xl font-bold font-serif-bn text-forest block">
                  {smsStats.sent}
                </span>
                <span className="text-[11px] text-forest font-medium">● পাঠানো</span>
              </div>
              <div className="p-2.5 rounded-btn bg-paper/60 border border-line">
                <span className="text-xl font-bold font-serif-bn text-ochre block">
                  {smsStats.pending + smsStats.sending}
                </span>
                <span className="text-[11px] text-ochre font-medium">● অপেক্ষমাণ</span>
              </div>
              <div className="p-2.5 rounded-btn bg-paper/60 border border-line">
                <span className="text-xl font-bold font-serif-bn text-wine block">
                  {smsStats.failed}
                </span>
                <span className="text-[11px] text-wine font-medium">● ব্যর্থ</span>
              </div>
            </div>

            {/* Alert Box if any failed SMS */}
            {smsStats.failed > 0 && (
              <div className="mt-4 p-2.5 bg-wine/10 border border-wine/30 rounded-btn text-xs text-wine flex items-center justify-between">
                <span>{smsStats.failed}টি SMS পাঠানো ব্যর্থ হয়েছে।</span>
                <Link to="/settings" className="font-bold underline">
                  দেখুন
                </Link>
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-line flex items-center justify-between text-xs text-ink-light">
            <span>মোট প্রক্রিয়াকৃত: {totalSmsToday}টি</span>
            <Link to="/settings" className="text-forest hover:underline flex items-center gap-1 font-medium">
              SMS সেটিংস <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section: আজকের অনাদায়ী সদস্যদের তালিকা (Today's Unpaid Members List) */}
      <div className="bg-white border border-line rounded-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-serif-bn font-bold text-base text-ink">
              আজকের অনাদায়ী সদস্য তালিকা ({formatDate(selectedDate)})
            </h3>
            <p className="text-xs text-ink-light">
              যারা আজকের দৈনিক সঞ্চয় এখনো জমা দেননি
            </p>
          </div>

          <Link
            to="/reports?tab=dues"
            className="text-xs text-forest hover:underline font-medium flex items-center gap-1 self-start sm:self-auto"
          >
            সম্পূর্ণ বকেয়া রিপোর্ট <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-ink-light">
            <RefreshCw className="w-6 h-6 animate-spin text-forest mx-auto mb-2" />
            তথ্য লোড হচ্ছে...
          </div>
        ) : dashboardData?.unpaid_members?.length === 0 ? (
          <div className="p-10 text-center text-ink-light text-xs">
            🎉 আজ কোনো অনাদায়ী সদস্য নেই! সকল সদস্যের সঞ্চয় জমা হয়েছে।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-paper border-b border-line text-ink-muted font-medium">
                  <th className="py-2.5 px-4">কোড</th>
                  <th className="py-2.5 px-4">সদস্যের নাম</th>
                  <th className="py-2.5 px-4">মোবাইল নম্বর</th>
                  <th className="py-2.5 px-4">এলাকা</th>
                  <th className="py-2.5 px-4 text-right">দৈনিক কিস্তি</th>
                  <th className="py-2.5 px-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dashboardData?.unpaid_members?.map((m) => (
                  <tr key={m.id} className="hover:bg-paper/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-ink-light">{m.member_code}</td>
                    <td className="py-3 px-4 font-semibold text-ink">
                      <Link to={`/members/${m.id}`} className="hover:text-forest underline">
                        {m.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-ink">{m.phone}</td>
                    <td className="py-3 px-4 text-ink-muted">{m.area || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-ink">
                      ৳{formatMoney(m.daily_amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleSendReminder(m.id, m.name)}
                        disabled={reminderSendingId === m.id}
                        className="px-2.5 py-1 bg-paper hover:bg-forest/10 hover:border-forest text-forest border border-line rounded-btn font-medium transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                        title="রিমাইন্ডার SMS পাঠান"
                      >
                        {reminderSendingId === m.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        <span>রিমাইন্ডার</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
