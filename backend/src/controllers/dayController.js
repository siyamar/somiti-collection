import { z } from 'zod';
import * as dayService from '../services/dayService.js';

export const updateCollectionsSchema = z.object({
  collections: z.array(
    z.object({
      member_id: z.number(),
      amount: z.coerce.number().min(0, { message: 'টাকার পরিমাণ ০ বা তার বেশি হতে হবে' }),
      note: z.string().optional().nullable(),
    })
  ),
});

export const correctCollectionSchema = z.object({
  new_amount: z.coerce.number().min(0, { message: 'সংশোধিত পরিমাণ ০ বা তার বেশি হতে হবে' }),
  reason: z.string().min(2, { message: 'সংশোধনের সঠিক কারণ উল্লেখ করা আবশ্যক' }),
});

/**
 * GET /api/days/:date
 */
export async function getDayByDate(req, res, next) {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        error: { message: 'তারিখ অবশ্যই YYYY-MM-DD ফরম্যাটে হতে হবে।' },
      });
    }

    const data = await dayService.getDayByDate(date, req.user);
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/days/:id/collections
 */
export async function updateCollections(req, res, next) {
  try {
    const dayId = parseInt(req.params.id, 10);
    const { collections } = updateCollectionsSchema.parse(req.body);
    const result = await dayService.updateCollections(dayId, collections, req.user.id);
    return res.json({ ...result, message: 'খসড়া কালেকশন সংরক্ষিত হয়েছে।' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/days/:id/add-new-members
 */
export async function addNewMembers(req, res, next) {
  try {
    const dayId = parseInt(req.params.id, 10);
    const result = await dayService.addNewMembers(dayId, req.user.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/days/:id/confirm
 */
export async function confirmDay(req, res, next) {
  try {
    const dayId = parseInt(req.params.id, 10);
    const result = await dayService.confirmDay(dayId, req.user.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/days/:id/retry-sms (Admin only)
 */
export async function retryDaySms(req, res, next) {
  try {
    const dayId = parseInt(req.params.id, 10);
    const result = await dayService.retryDaySms(dayId);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/collections/:id/correct (Admin only)
 */
export async function correctCollection(req, res, next) {
  try {
    const collectionId = parseInt(req.params.id, 10);
    const { new_amount, reason } = correctCollectionSchema.parse(req.body);
    const result = await dayService.correctCollection(
      collectionId,
      new_amount,
      reason,
      req.user.id
    );
    return res.json(result);
  } catch (err) {
    next(err);
  }
}
