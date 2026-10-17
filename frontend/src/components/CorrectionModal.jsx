import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { formatCurrency, toBanglaDigits } from '../lib/format';
import { AlertTriangle, X, Check, FileEdit, Send } from 'lucide-react';

export default function CorrectionModal({
  isOpen,
  onClose,
  collection,
  date,
  onSuccess,
}) {
  const [newAmount, setNewAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (collection) {
      setNewAmount(String(collection.amount ?? ''));
      setReason('');
      setError('');
    }
  }, [collection]);

  if (!isOpen || !collection) return null;

  const currentAmount = Number(collection.amount) || 0;
  const parsedNew = Number(newAmount) || 0;
  const currentTotal = Number(collection.total_savings) || 0;
  // Calculated new total: (currentTotal - currentAmount) + parsedNew
  const newEstimatedTotal = Math.max(0, currentTotal - currentAmount + parsedNew);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newAmount === '' || isNaN(parsedNew) || parsedNew < 0) {
      setError('সংশোধিত পরিমাণ অবশ্যই ০ বা তার বেশি বৈধ সংখ্যা হতে হবে।');
      return;
    }

    if (!reason.trim()) {
      setError('সংশোধনের কারণ উল্লেখ করা বাধ্যতামূলক।');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/collections/${collection.id}/correct`, {
        new_amount: parsedNew,
        reason: reason.trim(),
      });
      onSuccess?.(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'সংশোধন সম্পন্ন করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-card border border-line w-full max-w-lg p-6 relative shadow-2xl animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-paper"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-full bg-saffron-light text-saffron flex items-center justify-center shrink-0">
            <FileEdit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif-bn text-xl font-bold text-ink flex items-center gap-2">
              <span>কালেকশন সংশোধন</span>
              <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-saffron-light text-saffron font-semibold">
                অ্যাডমিন অনলি
              </span>
            </h2>
            <p className="text-xs text-ink-light mt-0.5 leading-relaxed">
              নিশ্চিত করা শিটের কোনো সদস্যের জমার পরিমাণ ভুল হলে এখানে সংশোধন করুন। এর একটি স্থায়ী ইতিহাস থাকবে এবং সদস্যকে সংশোধিত SMS পাঠানো হবে।
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-brick-light text-brick text-xs rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Member snapshot */}
        <div className="bg-paper/60 border border-line rounded-lg p-3.5 mb-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-ink">{collection.member_name}</span>
              <span className="text-xs font-mono-num text-ink-light">({collection.member_code})</span>
            </div>
            <span className="text-xs text-ink-muted block mt-0.5">
              তারিখ: {date} · বর্তমান মোট সঞ্চয়: {formatCurrency(currentTotal)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-ink-muted block">বর্তমান রেকর্ড</span>
            <span className="text-base font-bold font-mono-num text-brick block">
              {formatCurrency(currentAmount)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              নতুন সংশোধিত পরিমাণ (৳) <span className="text-brick">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-sm font-semibold">৳</span>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="যেমন: ২০০"
                className="w-full pl-8 pr-3 py-2 bg-white border border-line rounded-btn text-sm font-mono-num text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              সংশোধনের কারণ <span className="text-brick">*</span>
            </label>
            <textarea
              rows="2"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="যেমন: মাঠকর্মীর টাইপো ভুল / রসিদ যাচাই সাপেক্ষে সংশোধন"
              className="w-full px-3 py-2 bg-white border border-line rounded-btn text-xs font-sans text-ink focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest resize-none"
            />
          </div>

          {/* Correction SMS preview */}
          <div className="bg-paper/70 border border-line rounded-lg p-3.5">
            <span className="text-[11px] font-semibold text-ink-light block mb-1 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-forest" />
              <span>সদস্যকে পাঠানো সংশোধন SMS-এর প্রিভিউ:</span>
            </span>
            <div className="p-2.5 bg-white border border-line rounded-md text-xs font-sans text-ink leading-relaxed">
              <strong>{collection.member_name}</strong>, আপনার {date} তারিখের জমার পরিমাণ সংশোধন করে ৳{toBanglaDigits(parsedNew)} করা হয়েছে। বর্তমান মোট জমা ৳{toBanglaDigits(newEstimatedTotal)}। -সবুজ বাংলা
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-btn px-4 border border-line text-ink-light hover:bg-paper rounded-btn text-xs font-medium"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-btn px-5 bg-forest hover:bg-forest-light text-white rounded-btn text-xs font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'সংশোধন নিশ্চিত করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
