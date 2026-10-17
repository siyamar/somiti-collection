import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import MemberDrawer from '../components/MemberDrawer';
import { formatCurrency, formatDate, formatShortDate, toBanglaDigits } from '../lib/format';
import {
  ArrowLeft,
  Edit,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function MemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [member, setMember] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const fetchMember = async () => {
    try {
      const res = await api.get(`/members/${id}`);
      setMember(res.data.member);
    } catch (err) {
      console.error('Failed to fetch member details:', err);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await api.get(`/members/${id}/transactions`, { params });
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchMember(), fetchTransactions()]);
      setLoading(false);
    };
    loadAll();
  }, [id]);

  const handleFilterTransactions = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
    // refetch
    api.get(`/members/${id}/transactions`).then((res) => {
      setTransactions(res.data.transactions || []);
    });
  };

  const handleToggleStatus = async () => {
    if (!member) return;
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    const msg =
      nextStatus === 'inactive'
        ? 'আপনি কি এই সদস্যকে নিষ্ক্রিয় করতে চান?'
        : 'আপনি কি এই সদস্যকে পুনরায় সক্রিয় করতে চান?';
    if (!window.confirm(msg)) return;

    try {
      await api.patch(`/members/${member.id}/status`, { status: nextStatus });
      fetchMember();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  const getInitial = (name) => (name ? name.trim().charAt(0) : 'স');

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-ink-muted">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-forest" />
        <p className="text-sm">সদস্যের তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center">
        <h3 className="font-serif-bn text-xl font-bold text-ink">সদস্য পাওয়া যায়নি</h3>
        <p className="text-xs text-ink-light mt-1">প্রদত্ত আইডির কোনো সদস্য নিবন্ধিত নেই।</p>
        <Link to="/members" className="mt-4 inline-flex items-center gap-1.5 text-xs text-forest hover:underline">
          <ArrowLeft className="w-4 h-4" /> সদস্য তালিকায় ফিরে যান
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center justify-between no-print">
        <button
          onClick={() => navigate('/members')}
          className="inline-flex items-center gap-2 text-xs font-medium text-ink-light hover:text-forest transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>সদস্য তালিকা</span>
        </button>

        <span className="text-xs text-ink-muted font-mono-num">
          আইডি #{member.id}
        </span>
      </div>

      {/* Member Profile Header Card (Matches design/12-member_profile.png) */}
      <div className="bg-white border border-line rounded-card p-6 no-print">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {member.photo_path ? (
              <img
                src={member.photo_path}
                alt={member.name}
                className="w-20 h-20 rounded-2xl object-cover border border-line shadow-xs"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-saffron/20 text-saffron-dark font-serif-bn font-bold text-3xl flex items-center justify-center border border-saffron/30">
                {getInitial(member.name)}
              </div>
            )}

            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-serif-bn text-2xl md:text-3xl font-bold text-ink">
                  {member.name}
                </h1>
                <span
                  className={`text-xs px-3 py-0.5 rounded-full font-medium ${
                    member.status === 'active'
                      ? 'bg-ok-light text-ok'
                      : 'bg-line/70 text-ink-muted'
                  }`}
                >
                  {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-ink-light mt-1.5 font-sans">
                <span className="font-mono-num font-semibold text-forest">
                  {member.member_code}
                </span>
                <span>•</span>
                <span>{member.area}</span>
                <span>•</span>
                <span className="font-mono-num">{member.phone}</span>
                {member.address && (
                  <>
                    <span>•</span>
                    <span>{member.address}</span>
                  </>
                )}
              </div>

              <div className="text-xs text-ink-muted mt-1">
                ভর্তি: {formatDate(member.joined_at)}
                {member.nominee_name && (
                  <span>
                    {' '}· নমিনি: <strong>{member.nominee_name}</strong>
                    {member.nominee_phone ? ` (${member.nominee_phone})` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={() => setIsEditOpen(true)}
              className="h-btn px-4 bg-white border border-line hover:bg-paper text-ink-light rounded-btn text-xs font-medium flex items-center gap-2 shadow-xs transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>সম্পাদনা</span>
            </button>

            <button
              onClick={() => setIsPrintOpen(true)}
              className="h-btn px-4 bg-forest hover:bg-forest-light text-white rounded-btn text-xs font-medium flex items-center gap-2 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>পাসবই প্রিন্ট</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards (Matches design/12-member_profile.png) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="p-5 bg-white border border-line rounded-card">
          <div className="text-xs font-semibold text-ink-muted uppercase">
            মোট সঞ্চয় স্থিতি
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono-num text-forest mt-1.5">
            {formatCurrency(member.total_savings)}
          </div>
          <p className="text-[11px] text-ink-muted mt-1">
            শুধুমাত্র নিশ্চিত কালেকশন শিটের অনুমোদিত স্থিতি (রুল ২)
          </p>
        </div>

        <div className="p-5 bg-white border border-line rounded-card">
          <div className="text-xs font-semibold text-ink-muted uppercase">
            দৈনিক কিস্তির হার
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono-num text-ink mt-1.5">
            {formatCurrency(member.daily_amount)}
          </div>
          <p className="text-[11px] text-ink-muted mt-1">
            প্রতিদিন নির্ধারিত সঞ্চয়ের পরিমাণ
          </p>
        </div>

        <div className="p-5 bg-white border border-line rounded-card">
          <div className="text-xs font-semibold text-ink-muted uppercase">
            মোট জমার দিন
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono-num text-ink mt-1.5">
            {toBanglaDigits(member.total_paid_days || 0)} দিন
          </div>
          <p className="text-[11px] text-ink-muted mt-1">
            সর্বশেষ জমা: {member.last_paid_date ? formatDate(member.last_paid_date) : 'এখনো জমা হয়নি'}
          </p>
        </div>
      </div>

      {/* Passbook / Transactions Table (Matches design/12 & 13) */}
      <div className="bg-white border border-line rounded-card p-6 no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-line gap-3">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-forest" />
            <h2 className="font-serif-bn font-bold text-lg text-ink">
              জমা ও সঞ্চয় বিবরণী (Passbook Ledger)
            </h2>
          </div>

          {/* Date Filter */}
          <form onSubmit={handleFilterTransactions} className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 px-2 bg-paper border border-line rounded-btn text-xs font-mono-num focus:outline-none focus:border-forest"
            />
            <span className="text-xs text-ink-muted">থেকে</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 px-2 bg-paper border border-line rounded-btn text-xs font-mono-num focus:outline-none focus:border-forest"
            />
            <button
              type="submit"
              className="h-8 px-3 bg-paper border border-line hover:bg-mint text-forest text-xs font-medium rounded-btn"
            >
              ফিল্টার
            </button>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={clearDateFilter}
                className="text-xs text-brick hover:underline px-1"
              >
                রিসেট
              </button>
            )}
          </form>
        </div>

        {/* Transactions Table with Running Total via SQL SUM() OVER */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper border-b border-line text-xs font-semibold text-ink-light">
              <tr>
                <th className="py-3 px-4">তারিখ</th>
                <th className="py-3 px-4">বিবরণ</th>
                <th className="py-3 px-4 text-right">নির্ধারিত কিস্তি</th>
                <th className="py-3 px-4 text-right">আজকের জমা</th>
                <th className="py-3 px-4 text-right">চলমান সঞ্চয় স্থিতি</th>
                <th className="py-3 px-4">মন্তব্য</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loadingTransactions ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-ink-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-forest" />
                    বিবরণী লোড হচ্ছে...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-ink-muted text-xs">
                    এখনো কোনো নিশ্চিত কালেকশন নেই।
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.collection_id} className="hover:bg-paper/40 transition-colors">
                    <td className="py-3 px-4 text-xs font-medium text-ink">
                      {formatDate(tx.collect_date)}
                    </td>
                    <td className="py-3 px-4 text-xs text-ink-light">
                      কালেকশন শিট #{toBanglaDigits(tx.day_id)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-xs text-ink-light">
                      {formatCurrency(tx.expected_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-bold text-ok text-sm">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-bold text-forest text-sm bg-mint/20">
                      {formatCurrency(tx.running_total)}
                    </td>
                    <td className="py-3 px-4 text-xs text-ink-muted">
                      {tx.note || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable A4 Passbook Modal (Matches design/13-passbook.png) */}
      {isPrintOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-card w-full max-w-3xl p-8 relative print:p-0 print:border-none print:shadow-none">
            {/* Modal action bar (Hidden when printing) */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-line no-print">
              <h3 className="font-serif-bn font-bold text-lg text-ink">
                সদস্য হিসাব বিবরণী প্রিন্ট প্রিভিউ
              </h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={triggerPrint}
                  className="h-btn px-4 bg-forest text-white rounded-btn text-xs font-medium flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>এখনই প্রিন্ট করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintOpen(false)}
                  className="h-btn px-4 border border-line text-ink rounded-btn text-xs"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>

            {/* Printable Document (Matches design/13-passbook.png exactly) */}
            <div className="p-6 border border-line rounded-lg print:border-none print:p-0 font-sans text-ink">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-forest pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="লোগো" className="w-12 h-12 object-contain" />
                  <div>
                    <h2 className="font-serif-bn font-bold text-xl text-forest">
                      সবুজ বাংলা সমবায় সমিতি লিঃ
                    </h2>
                    <p className="text-xs text-ink-light">
                      ধামরাই, ঢাকা · রেজি: নং সকু-০০০০ · ০১৭১১-০০০০১১
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <h3 className="font-serif-bn font-bold text-lg text-forest">
                    সদস্য হিসাব বিবরণী
                  </h3>
                  <p className="text-xs text-ink-muted">
                    প্রিন্টের তারিখ: {formatDate(new Date())}
                  </p>
                </div>
              </div>

              {/* Member Meta Table */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 py-3 border-b border-line text-xs mb-4">
                <div className="flex justify-between">
                  <span className="text-ink-muted">সদস্যের নাম:</span>
                  <span className="font-bold text-ink">{member.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">সদস্য কোড:</span>
                  <span className="font-mono-num font-bold text-forest">{member.member_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">সমিতি / এলাকা:</span>
                  <span className="font-medium text-ink">{member.area}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">মোবাইল:</span>
                  <span className="font-mono-num text-ink">{member.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">দৈনিক কিস্তি:</span>
                  <span className="font-mono-num font-bold text-ink">{formatCurrency(member.daily_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">ভর্তির তারিখ:</span>
                  <span className="text-ink">{formatDate(member.joined_at)}</span>
                </div>
              </div>

              {/* Ledger Statement Table */}
              <table className="w-full text-xs text-left mb-6 border border-line">
                <thead className="bg-paper border-b border-line font-bold text-ink">
                  <tr>
                    <th className="py-2 px-3 border-r border-line">তারিখ</th>
                    <th className="py-2 px-3 border-r border-line text-right">কিস্তির হার</th>
                    <th className="py-2 px-3 border-r border-line text-right">জমা</th>
                    <th className="py-2 px-3 border-r border-line text-right">সঞ্চয় স্থিতি</th>
                    <th className="py-2 px-3 text-center">স্বাক্ষর</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-ink-muted">
                        কোনো লেনদেন পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.collection_id}>
                        <td className="py-2 px-3 border-r border-line font-mono-num">
                          {formatShortDate(tx.collect_date)}
                        </td>
                        <td className="py-2 px-3 border-r border-line text-right font-mono-num">
                          {formatCurrency(tx.expected_amount)}
                        </td>
                        <td className="py-2 px-3 border-r border-line text-right font-mono-num font-bold text-forest">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-2 px-3 border-r border-line text-right font-mono-num font-bold">
                          {formatCurrency(tx.running_total)}
                        </td>
                        <td className="py-2 px-3 text-center"></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Total Summary Box */}
              <div className="bg-paper p-4 rounded-lg border border-line flex items-center justify-between mb-12">
                <div>
                  <span className="text-xs text-ink-muted">মোট কালেকশন দিন</span>
                  <div className="font-bold font-mono-num text-sm mt-0.5">
                    {toBanglaDigits(transactions.length)} দিন
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-ink-muted">সর্বমোট সঞ্চয় স্থিতি</span>
                  <div className="font-bold font-mono-num text-xl text-forest mt-0.5">
                    {formatCurrency(member.total_savings)}
                  </div>
                </div>
              </div>

              {/* Signatures Row */}
              <div className="grid grid-cols-3 gap-6 text-center text-xs text-ink-light pt-8 border-t border-line">
                <div>
                  <div className="border-t border-ink-muted/40 pt-1.5 w-3/4 mx-auto font-medium">
                    সদস্যের স্বাক্ষর
                  </div>
                </div>
                <div>
                  <div className="border-t border-ink-muted/40 pt-1.5 w-3/4 mx-auto font-medium">
                    মাঠকর্মী
                  </div>
                </div>
                <div>
                  <div className="border-t border-ink-muted/40 pt-1.5 w-3/4 mx-auto font-medium">
                    শাখা ব্যবস্থাপক
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center text-[10px] text-ink-muted">
                কম্পিউটারে প্রস্তুতকৃত বিবরণী · সবুজ বাংলা সমবায় সমিতি লিঃ
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Drawer */}
      <MemberDrawer
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        member={member}
        onSaved={() => {
          fetchMember();
          fetchTransactions();
        }}
      />
    </div>
  );
}
