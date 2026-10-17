import * as smsService from '../services/smsService.js';

export async function getSmsLogs(req, res, next) {
  try {
    const { status, page, limit } = req.query;
    const result = await smsService.getSmsLogs({ status, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function retrySms(req, res, next) {
  try {
    const smsId = parseInt(req.params.id, 10);
    const result = await smsService.retrySms(smsId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function sendReminders(req, res, next) {
  try {
    const { member_ids } = req.body;
    const result = await smsService.queueReminders({ memberIds: member_ids });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
