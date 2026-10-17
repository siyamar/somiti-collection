import { z } from 'zod';
import * as memberService from '../services/memberService.js';

export const createMemberSchema = z.object({
  name: z.string().min(2, { message: 'সদস্যের নাম কমপক্ষে ২ অক্ষরের হতে হবে' }),
  phone: z.string().regex(/^01[3-9]\d{8}$/, { message: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017xxxxxxxx)' }),
  nid: z.string().optional().nullable().transform((val) => (val && val.trim() ? val.trim() : null)),
  area: z.string().min(1, { message: 'সমিতি / এলাকা নির্বাচন বা প্রদান করুন' }),
  address: z.string().optional().nullable(),
  nominee_name: z.string().optional().nullable(),
  nominee_phone: z.string().optional().nullable().transform((val) => {
    if (!val || !val.trim()) return null;
    return val.trim();
  }),
  daily_amount: z.coerce.number().min(0, { message: 'দৈনিক সঞ্চয়ের পরিমাণ ০ বা তার বেশি হতে হবে' }),
  joined_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'ভর্তির তারিখ YYYY-MM-DD ফরম্যাটে দিন' }),
});

export const updateMemberSchema = z.object({
  name: z.string().min(2, { message: 'সদস্যের নাম কমপক্ষে ২ অক্ষরের হতে হবে' }),
  phone: z.string().regex(/^01[3-9]\d{8}$/, { message: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন' }),
  nid: z.string().optional().nullable().transform((val) => (val && val.trim() ? val.trim() : null)),
  area: z.string().min(1, { message: 'সমিতি / এলাকা দিন' }),
  address: z.string().optional().nullable(),
  nominee_name: z.string().optional().nullable(),
  nominee_phone: z.string().optional().nullable(),
  daily_amount: z.coerce.number().min(0, { message: 'দৈনিক সঞ্চয়ের পরিমাণ ০ বা তার বেশি হতে হবে' }),
  joined_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'ভর্তির তারিখ সঠিক ফরম্যাটে দিন' }),
});

export const updateStatusSchema = z.object({
  status: z.enum(['active', 'inactive'], { message: 'স্ট্যাটাস active বা inactive হতে হবে' }),
});

/**
 * GET /api/members
 */
export async function getMembers(req, res, next) {
  try {
    const { q, area, status, page, limit } = req.query;
    const result = await memberService.getMembers({ q, area, status, page, limit });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/members/areas
 */
export async function getAreas(req, res, next) {
  try {
    const areas = await memberService.getAreas();
    return res.json({ areas });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/members
 */
export async function createMember(req, res, next) {
  try {
    const validatedData = createMemberSchema.parse(req.body);
    if (req.file?.savedPath) {
      validatedData.photo_path = req.file.savedPath;
    }

    const member = await memberService.createMember(validatedData, req.user.id);
    return res.status(201).json({
      member,
      message: 'নতুন সদস্য সফলভাবে ভর্তি করা হয়েছে।',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/members/:id
 */
export async function getMemberById(req, res, next) {
  try {
    const member = await memberService.getMemberById(parseInt(req.params.id, 10));
    return res.json({ member });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/members/:id
 */
export async function updateMember(req, res, next) {
  try {
    const validatedData = updateMemberSchema.parse(req.body);
    if (req.file?.savedPath) {
      validatedData.photo_path = req.file.savedPath;
    }

    const member = await memberService.updateMember(
      parseInt(req.params.id, 10),
      validatedData
    );
    return res.json({
      member,
      message: 'সদস্যের তথ্য সফলভাবে হালনাগাদ করা হয়েছে।',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/members/:id/status
 */
export async function updateMemberStatus(req, res, next) {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const result = await memberService.updateMemberStatus(
      parseInt(req.params.id, 10),
      status
    );
    return res.json({
      ...result,
      message: status === 'active' ? 'সদস্যকে সক্রিয় করা হয়েছে।' : 'সদস্যকে নিষ্ক্রিয় করা হয়েছে।',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/members/:id/transactions?from=&to=
 */
export async function getMemberTransactions(req, res, next) {
  try {
    const { from, to } = req.query;
    const transactions = await memberService.getMemberTransactions(
      parseInt(req.params.id, 10),
      from,
      to
    );
    return res.json({ transactions });
  } catch (err) {
    next(err);
  }
}
