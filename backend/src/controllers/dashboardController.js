import * as dashboardService from '../services/dashboardService.js';

export async function getDashboard(req, res, next) {
  try {
    const { date } = req.query;
    const data = await dashboardService.getDashboardData(date);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
