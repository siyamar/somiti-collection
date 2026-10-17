import * as reportService from '../services/reportService.js';

export async function getDailyReport(req, res, next) {
  try {
    const { date, format } = req.query;
    const result = await reportService.getDailyReport({ date, format });
    if (result.isFile) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.buffer);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMonthlyReport(req, res, next) {
  try {
    const { month, format } = req.query;
    const result = await reportService.getMonthlyReport({ month, format });
    if (result.isFile) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.buffer);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDuesReport(req, res, next) {
  try {
    const { min_days, area, format } = req.query;
    const result = await reportService.getDuesReport({ min_days, area, format });
    if (result.isFile) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.buffer);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMemberStatement(req, res, next) {
  try {
    const { memberId } = req.params;
    const { from, to, format } = req.query;
    const result = await reportService.getMemberStatement({ memberId, from, to, format });
    if (result.isFile) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.buffer);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}
