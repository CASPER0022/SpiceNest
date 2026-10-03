// ==========================================
// GST REPORT (ADMIN ONLY)
//   GET /api/tax/report?year=2026&month=9          -> JSON for the dashboard
//   GET /api/tax/report?year=2026&month=9&format=xlsx -> Excel file in the monthly sheet format
// ==========================================
import express from 'express';
import ExcelJS from 'exceljs';
import prisma from '../db.js';
import { verifyToken } from './auth.js';
import { buildTaxReport, istMonthRange } from '../utils/tax.js';

const router = express.Router();

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const RUPEES = '"₹"#,##0.00';

async function requireAdmin(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied: Admins only' });
    return false;
  }
  return true;
}

export async function buildExcel(report, title) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Idukki Origins';

  // Sheet 1: same layout as the monthly tax sheets (Tax | Tax amount, then Total)
  const summary = workbook.addWorksheet('Tax');
  summary.columns = [
    { header: 'Tax', key: 'label', width: 26 },
    { header: 'Tax amount', key: 'amount', width: 18, style: { numFmt: RUPEES } }
  ];
  for (const line of report.lines) summary.addRow({ label: line.label, amount: line.amount });
  const totalRow = summary.addRow({ label: 'Total', amount: report.totals.tax });
  summary.getRow(1).font = { bold: true };
  totalRow.font = { bold: true };

  // Sheet 2: breakdown per state, for filing
  const details = workbook.addWorksheet('By state');
  details.columns = [
    { header: 'State / UT', key: 'state', width: 34 },
    { header: 'Code', key: 'code', width: 8 },
    { header: 'Orders', key: 'orders', width: 9 },
    { header: 'Sales (incl. GST)', key: 'sales', width: 18, style: { numFmt: RUPEES } },
    { header: 'Taxable value', key: 'taxable', width: 16, style: { numFmt: RUPEES } },
    { header: 'CGST 2.5% (goods)', key: 'goodsCgst', width: 17, style: { numFmt: RUPEES } },
    { header: 'SGST 2.5% (goods)', key: 'goodsSgst', width: 17, style: { numFmt: RUPEES } },
    { header: 'IGST 5% (goods)', key: 'goodsIgst', width: 16, style: { numFmt: RUPEES } },
    { header: 'CGST 9% (shipping)', key: 'shippingCgst', width: 18, style: { numFmt: RUPEES } },
    { header: 'SGST 9% (shipping)', key: 'shippingSgst', width: 18, style: { numFmt: RUPEES } },
    { header: 'IGST 18% (shipping)', key: 'shippingIgst', width: 19, style: { numFmt: RUPEES } },
    { header: 'Total GST', key: 'tax', width: 14, style: { numFmt: RUPEES } }
  ];
  for (const row of report.states) details.addRow(row);
  const detailsTotal = details.addRow({ state: 'Total', ...report.totals });
  details.getRow(1).font = { bold: true };
  detailsTotal.font = { bold: true };
  details.addRow({});
  details.addRow({ state: title });

  return workbook.xlsx.writeBuffer();
}

router.get('/report', verifyToken, async (req, res) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Choose a valid month and year.' });
    }

    const { start, end } = istMonthRange(year, month);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end } },
      // Items are needed to tell the shipping charge (18% GST) apart from the goods (5%)
      select: { id: true, totalAmount: true, status: true, address: true, items: { select: { price: true, quantity: true } } }
    });
    const report = buildTaxReport(orders);
    const period = `${MONTH_NAMES[month - 1]} ${year}`;

    if (req.query.format === 'xlsx') {
      const buffer = await buildExcel(report, `GST report for ${period} (prices include GST: 5% on goods, 18% on shipping; Kerala: CGST + SGST, other states: IGST)`);
      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.set('Content-Disposition', `attachment; filename="${MONTH_NAMES[month - 1]} ${year} Tax.xlsx"`);
      return res.send(Buffer.from(buffer));
    }

    res.json({ year, month, period, ...report });
  } catch (error) {
    console.error('Tax report error:', error);
    res.status(500).json({ error: 'Failed to build tax report' });
  }
});

export default router;
