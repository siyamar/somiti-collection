import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import MemberDrawer from '../components/MemberDrawer';
import { formatCurrency, toBanglaDigits } from '../lib/format';
import {
  UserPlus,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
  User,
} from 'lucide-react';

export default function MembersPage() {
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [actionMenuMemberId, setActionMenuMemberId] = useState(null);

  const fetchAreas = async () => {
    try {
      const res = await api.get('/members/areas');
      setAreas(res.data.areas || []);
    } catch (err) {
      console.error('Failed to fetch areas:', err);
    }
  };

  const fetchMembers = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        q: searchQuery,
        area: selectedArea,
        status: selectedStatus,
      };
      const res = await api.get('/members', { params });
      setMembers(res.data.members || []);
      setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      setStats(res.data.stats || { total: 0, active: 0, inactive: 0 });
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  useEffect(() => {
    fetchMembers(1);
  }, [selectedArea, selectedStatus]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedArea('');
    setSelectedStatus('all');
  };

  const openAddDrawer = () => {
    setEditingMember(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (member) => {
    setEditingMember(member);
    setIsDrawerOpen(true);
    setActionMenuMemberId(null);
  };

  const handleToggleStatus = async (member) => {
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    const confirmMsg =
      nextStatus === 'inactive'
        ? `আপনি কি সদস্য "${member.name}"-কে নিষ্ক্রিয় করতে চান?`
        : `আপনি কি সদস্য "${member.name}"-কে সক্রিয় করতে চান?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/members/${member.id}/status`, { status: nextStatus });
      fetchMembers(pagination.page);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
    } finally {
      setActionMenuMemberId(null);
    }
  };

  const exportCSV = () => {
    if (members.length === 0) return;
    const headers = ['সদস্য কোড', 'নাম', 'মোবাইল', 'সমিতি', 'দৈনিক কিস্তি', 'মোট সঞ্চয়', 'অবস্থা'];
    const rows = members.map((m) => [
      m.member_code,
      m.name,
      m.phone,
      m.area,
      m.daily_amount,
      m.total_savings,
      m.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `members_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitial = (name) => (name ? name.trim().charAt(0) : 'স');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header (Matches design/10-members.png) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-bn text-2xl md:text-3xl font-bold text-ink tracking-tight">
            সদস্য তালিকা
          </h1>
          <p className="text-xs md:text-sm text-ink-light mt-1">
            মোট {toBanglaDigits(stats.total)} জন সদস্য · {toBanglaDigits(stats.active)} জন সক্রিয়
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="h-btn px-4 bg-white border border-line hover:bg-paper text-ink-light rounded-btn text-xs font-medium flex items-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ডাউনলোড (CSV)</span>
          </button>

          <button
            onClick={openAddDrawer}
            className="h-btn px-5 bg-forest hover:bg-forest-light text-white rounded-btn text-xs font-medium flex items-center gap-2 shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>নতুন সদস্য</span>
          </button>
        </div>
      </div>

      {/* Filters Bar (Matches design/10-members.png) */}
      <div className="bg-white border border-line rounded-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="নাম, সদস্য কোড, মোবাইল বা NID..."
              className="w-full h-input pl-9 pr-3 bg-paper border border-line rounded-input text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-forest"
            />
          </div>

          {/* Area Filter */}
          <div>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full h-input px-3 bg-paper border border-line rounded-input text-xs text-ink focus:outline-none focus:border-forest"
            >
              <option value="">সব সমিতি / এলাকা</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-input px-3 bg-paper border border-line rounded-input text-xs text-ink focus:outline-none focus:border-forest"
            >
              <option value="all">অবস্থা: সব</option>
              <option value="active">সক্রিয়</option>
              <option value="inactive">নিষ্ক্রিয়</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-center">
            {(searchQuery || selectedArea || selectedStatus !== 'all') && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-forest hover:underline font-medium px-2 py-1"
              >
                ফিল্টার মুছুন
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Members Table (Matches design/10-members.png) */}
      <div className="bg-white border border-line rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper border-b border-line text-xs font-semibold text-ink-light">
              <tr>
                <th className="py-3 px-4">সদস্য</th>
                <th className="py-3 px-4">মোবাইল</th>
                <th className="py-3 px-4">সমিতি</th>
                <th className="py-3 px-4 text-right">দৈনিক কিস্তি</th>
                <th className="py-3 px-4 text-right">সঞ্চয় স্থিতি</th>
                <th className="py-3 px-4 text-center">অবস্থা</th>
                <th className="py-3 px-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-ink-muted">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-forest" />
                    সদস্য তালিকা লোড হচ্ছে...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-ink-muted">
                    কোনো সদস্যের তথ্য পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => navigate(`/members/${m.id}`)}
                    className="hover:bg-paper/40 transition-colors cursor-pointer group"
                  >
                    {/* Avatar, Name, Code */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {m.photo_path ? (
                          <img
                            src={m.photo_path}
                            alt={m.name}
                            className="w-9 h-9 rounded-full object-cover border border-line shadow-2xs"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-saffron/20 text-saffron-dark font-serif-bn font-bold text-xs flex items-center justify-center border border-saffron/30 shrink-0">
                            {getInitial(m.name)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-ink group-hover:text-forest transition-colors">
                            {m.name}
                          </div>
                          <span className="font-mono-num text-[11px] text-ink-muted">
                            {m.member_code}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-mono-num text-xs text-ink">
                      {m.phone}
                    </td>

                    {/* Area */}
                    <td className="py-3.5 px-4 text-xs text-ink-light">
                      {m.area}
                    </td>

                    {/* Daily Amount */}
                    <td className="py-3.5 px-4 text-right font-mono-num text-xs text-ink-light">
                      {formatCurrency(m.daily_amount)}
                    </td>

                    {/* Total Savings (Rule 2) */}
                    <td className="py-3.5 px-4 text-right font-mono-num font-bold text-forest text-sm">
                      {formatCurrency(m.total_savings)}
                    </td>

                    {/* Status Chip */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                          m.status === 'active'
                            ? 'bg-ok-light text-ok'
                            : 'bg-line/70 text-ink-muted'
                        }`}
                      >
                        {m.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </td>

                    {/* Action dropdown */}
                    <td
                      className="py-3.5 px-4 text-right relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          setActionMenuMemberId(actionMenuMemberId === m.id ? null : m.id)
                        }
                        className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-paper"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {actionMenuMemberId === m.id && (
                        <div className="absolute right-4 top-10 w-40 bg-white border border-line rounded-card shadow-lg py-1 z-30 text-xs">
                          <button
                            onClick={() => navigate(`/members/${m.id}`)}
                            className="w-full text-left px-3 py-2 hover:bg-paper flex items-center gap-2 text-ink"
                          >
                            <Eye className="w-3.5 h-3.5 text-forest" />
                            <span>বিস্তারিত দেখুন</span>
                          </button>
                          <button
                            onClick={() => openEditDrawer(m)}
                            className="w-full text-left px-3 py-2 hover:bg-paper flex items-center gap-2 text-ink"
                          >
                            <Edit className="w-3.5 h-3.5 text-forest" />
                            <span>সম্পাদনা করুন</span>
                          </button>
                          <button
                            onClick={() => handleToggleStatus(m)}
                            className="w-full text-left px-3 py-2 hover:bg-paper flex items-center gap-2 text-brick"
                          >
                            {m.status === 'active' ? (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>নিষ্ক্রিয় করুন</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
                                <span className="text-ok">সক্রিয় করুন</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (Matches design/10-members.png) */}
        <div className="bg-paper/50 px-4 py-3 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-light">
          <div>
            {pagination.total > 0 && (
              <span>
                {toBanglaDigits((pagination.page - 1) * pagination.limit + 1)}-
                {toBanglaDigits(Math.min(pagination.page * pagination.limit, pagination.total))} দেখানো হচ্ছে,
                মোট {toBanglaDigits(pagination.total)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 font-mono-num">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchMembers(pagination.page - 1)}
              className="p-1.5 rounded-btn border border-line bg-white hover:bg-paper disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: pagination.totalPages }).map((_, idx) => {
              const p = idx + 1;
              const isCurrent = p === pagination.page;
              return (
                <button
                  key={p}
                  onClick={() => fetchMembers(p)}
                  className={`w-8 h-8 rounded-btn text-xs font-semibold ${
                    isCurrent
                      ? 'bg-forest text-white'
                      : 'bg-white border border-line hover:bg-paper text-ink'
                  }`}
                >
                  {toBanglaDigits(p)}
                </button>
              );
            })}

            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchMembers(pagination.page + 1)}
              className="p-1.5 rounded-btn border border-line bg-white hover:bg-paper disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Member Form Drawer */}
      <MemberDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        member={editingMember}
        areas={areas}
        onSaved={() => {
          fetchMembers(pagination.page);
          fetchAreas();
        }}
      />
    </div>
  );
}
