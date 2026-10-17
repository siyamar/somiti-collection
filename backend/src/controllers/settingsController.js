import * as settingsService from '../services/settingsService.js';

export async function getSettings(req, res, next) {
  try {
    const settings = await settingsService.getSettings(true);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const updated = await settingsService.updateSettings(req.body);
    res.json({
      settings: updated,
      message: 'সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে।',
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadLogo(req, res, next) {
  try {
    if (!req.file || !req.file.savedPath) {
      return res.status(400).json({
        error: { message: 'কোনো লোগো ছবি আপলোড করা হয়নি।' },
      });
    }

    const result = await settingsService.updateLogoPath(req.file.savedPath);
    res.json({
      logo_path: result.logo_path,
      message: 'প্রতিষ্ঠানের লোগো সফলভাবে পরিবর্তন করা হয়েছে।',
    });
  } catch (err) {
    next(err);
  }
}

export async function sendTestSms(req, res, next) {
  try {
    const { phone, message } = req.body;
    if (!phone) {
      return res.status(400).json({
        error: { message: 'মোবাইল নম্বর দেওয়া আবশ্যক।' },
      });
    }

    const result = await settingsService.queueTestSms({ phone, customMessage: message });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
