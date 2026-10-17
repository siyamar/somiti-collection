import React, { useState } from 'react';
import { formatCurrency, formatDate, toBanglaDigits } from '../lib/format';
import { CheckCircle2, AlertCircle, X, Send, ArrowRight } from 'lucide-react';

export default function ConfirmDayModal({
  isOpen,
  onClose,
  onConfirm,
  day,
  totals,
  collections = [],
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Find first paid member as sample for SMS preview
  const sampleMember = collections.find((c) => Number(c.amount) > 0) || collections[0];
  const sampleAmount = sampleMember ? Number(sampleMember.amount) || 0 : 0;
  const sampleTotal = sampleMember ? (Number(sampleMember.total_savings) || 0) + sampleAmount : 0;

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'শিট নিশ্চিত করতে সমস্যা হয়েছে।');
      setLoading(false);
    }
  };

  const unpaidMembers = collections.filter((c) => Number(c.amount) === 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-card border border-line w-full max-w-lg p-6 relative shadow-2xl animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-paper"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-saffron-light text-saffron flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-serif-bn text-xl font-bold text-ink">
              শিট নিশ্চিত করবেন?
            </h2>
            <p className="text-xs text-ink-light mt-1 leading-relaxed">
              নিশ্চিত করার পর এই শিটের টাকা আর সাধারণ এন্ট্রি হিসেবে পরিবর্তন করা যাবে না। ভুল হলে শুধুমাত্র অ্যাডমিন "সংশোধন" করতে পারবেন।
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-brick-light text-brick text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Snapshot Summary Box (Matches design/06-sheet_confirm.png) */}
        <div className="border border-line rounded-lg overflow-hidden mb-5">
          <div className="grid grid-cols-3 divide-x divide-line bg-paper/40 p-3.5 text-center">
            <div>
              <span className="text-[11px] text-ink-muted block">নির্ধারিত সঞ্চয়</span>
              <span className="text-sm font-bold font-mono-num text-ink mt-0.5 block">
                {formatCurrency(totals?.expected_total || 0)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-ink-muted block">মোট কালেকশন</span>
              <span className="text-sm font-bold font-mono-num text-ok mt-0.5 block">
                {formatCurrency(totals?.collected_total || 0)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-ink-muted block">জমা দিয়েছেন</span>
              <span className="text-sm font-bold font-mono-num text-forest mt-0.5 block">
                {toBanglaDigits(totals?.paid_count || 0)} জন
              </span>
            </div>
          </div>

          <div className="bg-paper px-4 py-2 border-t border-line text-xs flex items-center justify-between">
            <span className="text-ok font-medium flex items-center gap-1">
              ✓ {toBanglaDigits(totals?.paid_count || 0)} জন জমা দিয়েছেন
            </span>
            {unpaidMembers.length > 0 && (
              <span className="text-brick font-medium">
                ✕ {toBanglaDigits(unpaidMembers.length)} জন দেননি ({unpaidMembers.slice(0, 2).map((m) => m.member_name).join(', ')}{unpaidMembers.length > 2 ? '...' : ''})
              </span>
            )}
          </div>
        </div>

        {/* SMS Preview Card (Matches design/06-sheet_confirm.png) */}
        <div className="bg-paper/70 border border-line rounded-lg p-4 mb-6">
          <span className="text-xs font-semibold text-ink-light block mb-1.5 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-forest" />
            <span>SMS-এর নমুনা ({toBanglaDigits(totals?.paid_count || 0)} জনকে স্বয়ংক্রিয়ভাবে যাবে):</span>
          </span>

          <div className="p-3 bg-white border border-line rounded-lg text-xs font-sans text-ink leading-relaxed">
            {sampleMember ? (
              <>
                <strong>{sampleMember.member_name}</strong>, আজ {day?.collect_date} ৳{toBanglaDigits(sampleAmount)} জমা হয়েছে। আপনার মোট জমা ৳{toBanglaDigits(sampleTotal)}। -সবুজ বাংলা
              </>
            ) : (
              'সদস্যের নাম, আজ জমা ৳... হয়েছে। মোট জমা ৳...। -সবুজ বাংলা'
            )}
          </div>
          <p className="text-[10px] text-ink-muted mt-2">
            বাংলা SMS · ৬০-৭০ অক্ষর · ১টি SMS পার্ট প্রতি সদস্য
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-btn px-5 border border-line text-ink-light hover:bg-paper rounded-btn text-xs font-medium"
          >
            ফিরে যান
          </button>
          <button
            type="button"
            onClick={handleConfirmSubmit}
            disabled={loading}
            className="h-btn px-6 bg-forest hover:bg-forest-light text-white rounded-btn text-xs font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'নিশ্চিত হচ্ছে...' : 'হ্যাঁ, নিশ্চিত করুন'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
