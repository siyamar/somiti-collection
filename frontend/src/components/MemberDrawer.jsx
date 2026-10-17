import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { X, Upload, AlertCircle, CheckCircle2, User, Phone, MapPin, Calendar, DollarSign, Image } from 'lucide-react';

export default function MemberDrawer({ isOpen, onClose, member = null, onSaved, areas = [] }) {
  const isEdit = Boolean(member?.id);

  // Form states
  const [name, setName] = useState('');
  const [fatherOrSpouse, setFatherOrSpouse] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [nid, setNid] = useState('');
  const [profession, setProfession] = useState('');

  const [village, setVillage] = useState('');
  const [union, setUnion] = useState('');
  const [upazilaDistrict, setUpazilaDistrict] = useState('');

  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('ছেলে');
  const [nomineePhone, setNomineePhone] = useState('');

  const [area, setArea] = useState('');
  const [newAreaInput, setNewAreaInput] = useState('');
  const [isCustomArea, setIsCustomArea] = useState(false);
  const [joinedAt, setJoinedAt] = useState('');
  const [dailyAmount, setDailyAmount] = useState('50');

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Populate data when editing
  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setPhone(member.phone || '');
      setNid(member.nid || '');
      setArea(member.area || '');
      setDailyAmount(String(member.daily_amount || '50'));
      setJoinedAt(member.joined_at ? member.joined_at.split('T')[0] : '');
      setNomineeName(member.nominee_name || '');
      setNomineePhone(member.nominee_phone || '');

      // Parse address parts if stored as comma separated
      if (member.address) {
        const parts = member.address.split(',').map((s) => s.trim());
        setVillage(parts[0] || '');
        setUnion(parts[1] || '');
        setUpazilaDistrict(parts.slice(2).join(', ') || '');
      } else {
        setVillage('');
        setUnion('');
        setUpazilaDistrict('');
      }

      setPhotoPreview(member.photo_path || null);
    } else {
      // Defaults for new member
      resetForm();
      const today = new Date().toISOString().split('T')[0];
      setJoinedAt(today);
      if (areas.length > 0) setArea(areas[0]);
    }
  }, [member, isOpen, areas]);

  const resetForm = () => {
    setName('');
    setFatherOrSpouse('');
    setDob('');
    setPhone('');
    setNid('');
    setProfession('');
    setVillage('');
    setUnion('');
    setUpazilaDistrict('');
    setNomineeName('');
    setNomineeRelation('ছেলে');
    setNomineePhone('');
    setArea(areas[0] || 'পদ্মা মহিলা সমিতি');
    setIsCustomArea(false);
    setNewAreaInput('');
    setDailyAmount('50');
    setPhotoFile(null);
    setPhotoPreview(null);
    setError('');
    setSuccess('');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('ছবির আকার সর্বোচ্চ ২ মেগাবাইট (2MB) হতে পারবে।');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e, addAnother = false) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Normalize phone
    let cleanPhone = phone.trim().replace(/[\s-]/g, '');
    if (cleanPhone.startsWith('+88')) cleanPhone = cleanPhone.slice(3);
    if (cleanPhone.startsWith('88')) cleanPhone = cleanPhone.slice(2);

    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      setError('মোবাইল নম্বরটি সঠিক ১১ ডিজিটের বাংলাদেশি নম্বর হতে হবে (যেমন: 017xxxxxxxx)');
      return;
    }

    const selectedArea = isCustomArea ? newAreaInput.trim() : area;
    if (!selectedArea) {
      setError('অনুগ্রহ করে সমিতি বা এলাকা নির্ধারণ করুন');
      return;
    }

    // Build combined address
    const fullAddress = [village, union, upazilaDistrict].filter(Boolean).join(', ');

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('phone', cleanPhone);
    if (nid.trim()) formData.append('nid', nid.trim());
    formData.append('area', selectedArea);
    if (fullAddress) formData.append('address', fullAddress);
    if (nomineeName.trim()) formData.append('nominee_name', nomineeName.trim());
    if (nomineePhone.trim()) formData.append('nominee_phone', nomineePhone.trim());
    formData.append('daily_amount', dailyAmount || '0');
    formData.append('joined_at', joinedAt);

    if (photoFile) {
      formData.append('photo', photoFile);
    }

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/members/${member.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSuccess('সদস্যের তথ্য সফলভাবে হালনাগাদ হয়েছে!');
      } else {
        await api.post('/members', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSuccess('নতুন সদস্য সফলভাবে ভর্তি করা হয়েছে!');
      }

      onSaved();

      if (addAnother && !isEdit) {
        resetForm();
        setJoinedAt(new Date().toISOString().split('T')[0]);
      } else {
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'সদস্য সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-4xl bg-paper h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="bg-white border-b border-line px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-serif-bn text-xl font-bold text-ink">
              {isEdit ? 'সদস্য তথ্য সম্পাদনা' : 'নতুন সদস্য ভর্তি'}
            </h2>
            <p className="text-xs text-ink-light mt-0.5">
              তারকা (*) চিহ্নিত ঘরগুলো পূরণ করা বাধ্যতামূলক
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-btn px-4 border border-line text-ink-light hover:bg-paper rounded-btn text-xs font-medium"
            >
              বাতিল
            </button>
            {!isEdit && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={loading}
                className="h-btn px-4 bg-white border border-forest text-forest hover:bg-mint rounded-btn text-xs font-medium"
              >
                সংরক্ষণ করে আরেকটি
              </button>
            )}
            <button
              type="button"
              onClick={(e) => handleSubmit(e, false)}
              disabled={loading}
              className="h-btn px-5 bg-forest text-white hover:bg-forest-light rounded-btn text-xs font-medium flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-3.5 bg-brick-light text-brick border border-brick/20 rounded-btn text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-3.5 bg-ok-light text-ok border border-ok/20 rounded-btn text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form Sections */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1: ব্যক্তিগত তথ্য */}
              <div className="bg-white border border-line rounded-card p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-line text-forest font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-forest text-white text-xs flex items-center justify-center font-mono-num">
                    ১
                  </span>
                  <span>ব্যক্তিগত তথ্য</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-ink-light mb-1">
                      সদস্যের নাম <span className="text-brick">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="যেমন: শিউলি রানী"
                      className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-light mb-1">
                      পিতা / স্বামীর নাম
                    </label>
                    <input
                      type="text"
                      value={fatherOrSpouse}
                      onChange={(e) => setFatherOrSpouse(e.target.value)}
                      placeholder="যেমন: বিমল চন্দ্র দাস"
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
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017xxxxxxxx"
                      className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm font-mono-num text-ink focus:outline-none focus:border-forest"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-light mb-1">
                      NID নম্বর
                    </label>
                    <input
                      type="text"
                      value={nid}
                      onChange={(e) => setNid(e.target.value)}
                      placeholder="জাতীয় পরিচয়পত্র নম্বর"
                      className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm font-mono-num text-ink focus:outline-none focus:border-forest"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-light mb-1">
                      পেশা
                    </label>
                    <input
                      type="text"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="যেমন: দর্জি / গৃহিণী"
                      className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: ঠিকানা */}
              <div className="bg-white border border-line rounded-card p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-line text-forest font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-forest text-white text-xs flex items-center justify-center font-mono-num">
                    ২
                  </span>
                  <span>ঠিকানা</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-light mb-1">
                      গ্রাম / মহল্লা <span className="text-brick">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="যেমন: গোবিন্দপুর"
                      className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-light mb-1">
                      ইউনিয়ন / ডাকঘর
                    </label>
                    <input
                      type="text"
                      value={union}
                      onChange={(e) => setUnion(e.target.value)}
                      placeholder="যেমন: ধামরাই"
                      className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-light mb-1">
                      উপজেলা ও জেলা
                    </label>
                    <input
                      type="text"
                      value={upazilaDistrict}
                      onChange={(e) => setUpazilaDistrict(e.target.value)}
                      placeholder="যেমন: ধামরাই, ঢাকা"
                      className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: নমিনি */}
              <div className="bg-white border border-line rounded-card p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-line text-forest font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-forest text-white text-xs flex items-center justify-center font-mono-num">
                    ৩
                  </span>
                  <span>নমিনি (সদস্যের অবর্তমানে যিনি টাকা পাবেন)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-light mb-1">
                      নমিনির নাম
                    </label>
                    <input
                      type="text"
                      value={nomineeName}
                      onChange={(e) => setNomineeName(e.target.value)}
                      placeholder="যেমন: সুমন দাস"
                      className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-light mb-1">
                      সম্পর্ক
                    </label>
                    <select
                      value={nomineeRelation}
                      onChange={(e) => setNomineeRelation(e.target.value)}
                      className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                    >
                      <option value="ছেলে">ছেলে</option>
                      <option value="মেয়ে">মেয়ে</option>
                      <option value="স্বামী">স্বামী</option>
                      <option value="স্ত্রী">স্ত্রী</option>
                      <option value="মা">মা</option>
                      <option value="বাবা">বাবা</option>
                      <option value="ভাই">ভাই</option>
                      <option value="বোন">বোন</option>
                      <option value="অন্যান্য">অন্যান্য</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-light mb-1">
                      নমিনির মোবাইল
                    </label>
                    <input
                      type="tel"
                      value={nomineePhone}
                      onChange={(e) => setNomineePhone(e.target.value)}
                      placeholder="017xxxxxxxx"
                      className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm font-mono-num text-ink focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: সমিতি ও সদস্যপদ */}
              <div className="bg-white border border-line rounded-card p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-line text-forest font-bold text-sm">
                  <span className="w-5 h-5 rounded-full bg-forest text-white text-xs flex items-center justify-center font-mono-num">
                    ৪
                  </span>
                  <span>সমিতি ও সদস্যপদ</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-light mb-1">
                      সমিতি / এলাকা <span className="text-brick">*</span>
                    </label>
                    {!isCustomArea ? (
                      <div className="space-y-1.5">
                        <select
                          value={area}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setIsCustomArea(true);
                            } else {
                              setArea(e.target.value);
                            }
                          }}
                          className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                        >
                          {areas.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                          <option value="__custom__">+ নতুন সমিতি যোগ করুন...</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          required
                          value={newAreaInput}
                          onChange={(e) => setNewAreaInput(e.target.value)}
                          placeholder="নতুন সমিতির নাম লিখুন"
                          className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest"
                        />
                        <button
                          type="button"
                          onClick={() => setIsCustomArea(false)}
                          className="px-2 border border-line rounded-btn text-xs text-ink-muted hover:bg-paper"
                        >
                          তালিকা
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-light mb-1">
                      ভর্তির তারিখ <span className="text-brick">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={joinedAt}
                      onChange={(e) => setJoinedAt(e.target.value)}
                      className="w-full h-input px-3 bg-paper border border-line rounded-input text-sm text-ink focus:outline-none focus:border-forest font-mono-num"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-light mb-1">
                      দৈনিক সঞ্চয় (নির্ধারিত) <span className="text-brick">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                        ৳
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        required
                        value={dailyAmount}
                        onChange={(e) => setDailyAmount(e.target.value)}
                        className="w-full h-input pl-8 pr-3 bg-paper border border-line rounded-input text-sm font-mono-num font-semibold text-forest focus:outline-none focus:border-forest"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Photo & Info Sidebar (Matches design/11-member_form.png) */}
            <div className="space-y-6">
              {/* Photo Upload Box */}
              <div className="bg-white border border-line rounded-card p-5 text-center">
                <label className="block text-xs font-bold text-ink-light uppercase mb-3">
                  সদস্যের ছবি
                </label>

                <div className="border-2 border-dashed border-line rounded-xl p-4 flex flex-col items-center justify-center relative hover:border-forest transition-colors group cursor-pointer bg-paper/40">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handlePhotoChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />

                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="সদস্যের ছবি"
                        className="w-36 h-36 object-cover rounded-xl border border-line shadow-sm"
                      />
                      <span className="mt-2 block text-xs text-forest font-medium">
                        ছবি পরিবর্তন করতে ক্লিক করুন
                      </span>
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-mint text-forest flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-ink">ছবি আপলোড</span>
                      <span className="text-[11px] text-ink-muted mt-1 font-mono-num">
                        JPG / PNG, ২ MB পর্যন্ত
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-ink-muted mt-3">
                  মোবাইলে সরাসরি ক্যামেরা দিয়েও ছবি তোলা যাবে
                </p>
              </div>

              {/* Member Code Preview Card */}
              <div className="bg-white border border-line rounded-card p-5">
                <span className="text-xs font-semibold text-ink-muted uppercase block">
                  সদস্য কোড
                </span>
                <div className="text-2xl font-bold font-mono-num text-forest mt-1">
                  {isEdit ? member.member_code : 'স্বয়ংক্রিয় (Auto)'}
                </div>
                <p className="text-xs text-ink-light mt-1">
                  {isEdit
                    ? 'স্থায়ী ইউনিক সদস্য কোড'
                    : 'সংরক্ষণ করলে পরবর্তী ক্রমানুযায়ী কোড (যেমন: M-0011) তৈরি হবে।'}
                </p>
              </div>

              {/* Duplicate check info card */}
              <div className="bg-mint/40 border border-forest/20 rounded-card p-4 text-xs text-ink-light leading-relaxed">
                <strong className="text-forest block mb-1">ডুপ্লিকেট যাচাই:</strong>
                একই মোবাইল বা NID দিয়ে অন্য কোনো সদস্য ভর্তি থাকলে সিস্টেম স্বয়ংক্রিয়ভাবে সতর্ক করবে।
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
