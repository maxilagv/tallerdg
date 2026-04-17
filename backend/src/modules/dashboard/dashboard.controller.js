const DashboardService = require("./dashboard.service");

const DashboardController = {
  async hoy(req, res) {
    const data = await DashboardService.hoy();
    return res.json({ ok: true, data });
  },
};

module.exports = DashboardController;
