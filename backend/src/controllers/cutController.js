import Cut from '../models/Cut.js';
import { autoSaveMasterItem } from './masterDataController.js';

// Helper: Resolve date range from period or custom date
const resolveDateRange = (period, customDate) => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  if (period === 'custom' && customDate) {
    return { startDate: customDate, endDate: customDate };
  } else if (period === 'yesterday') {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
    return { startDate: yStr, endDate: yStr };
  } else if (period === 'thismonth') {
    const mStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    return { startDate: mStart, endDate: todayStr };
  } else if (period === 'today') {
    return { startDate: todayStr, endDate: todayStr };
  }
  return null; // 'all'
};

// @desc    Get all cut commission records with filtering
// @route   GET /api/cuts
// @access  Private
export const getCuts = async (req, res) => {
  try {
    const {
      period = 'all',
      date,
      centerName,
      category,
      status,
      from,
      to,
      search,
      limit = 500,
    } = req.query;
    const query = {};

    // Date range filtering: custom from/to or period
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    } else {
      const range = resolveDateRange(period, date);
      if (range) {
        query.date = { $gte: range.startDate, $lte: range.endDate };
      }
    }

    if (centerName && centerName.trim()) {
      query.centerName = new RegExp(centerName.trim(), 'i');
    }

    if (category && category.trim() && !category.toUpperCase().includes('ALL')) {
      query.category = new RegExp(category.trim(), 'i');
    }

    if (status && status.trim() && (status === 'Paid' || status === 'Unpaid')) {
      query.status = status;
    }

    if (search && search.trim()) {
      const s = search.trim();
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { centerName: regex },
        { patientName: regex },
        { category: regex },
        { reference: regex },
        { notes: regex },
      ];
    }

    const cuts = await Cut.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(Number(limit) || 500)
      .lean();

    // Compute KPI metrics matching layout
    const totalEntries = cuts.length;
    let paidAmount = 0;
    let unpaidAmount = 0;
    let totalAmount = 0;

    cuts.forEach((c) => {
      const amt = Number(c.amount) || 0;
      totalAmount += amt;
      if (c.status === 'Paid') {
        paidAmount += amt;
      } else {
        unpaidAmount += amt;
      }
    });

    return res.status(200).json({
      success: true,
      count: cuts.length,
      totalEntries,
      paidAmount,
      unpaidAmount,
      totalAmount,
      totalIncome: totalAmount,
      cuts,
    });
  } catch (error) {
    console.error('Error fetching cuts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cuts',
      error: error.message,
    });
  }
};

// @desc    Record a new referral cut commission entry
// @route   POST /api/cuts
// @access  Private
export const createCut = async (req, res) => {
  try {
    const {
      date,
      centerName,
      companyName,
      patientName = '',
      category = 'EXTRA INCOME',
      amount,
      status = 'Paid',
      paymentMode = 'Cash',
      reference = '',
      notes = '',
    } = req.body;

    const resolvedName = (companyName || centerName || '').trim();
    if (!resolvedName) {
      return res.status(400).json({
        success: false,
        message: 'Company / Source name is required',
      });
    }

    const numAmount = Math.max(0, Number(amount) || 0);
    if (numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid cut amount greater than 0 is required',
      });
    }

    const cleanCategory = (category || 'EXTRA INCOME').trim().toUpperCase();
    const cleanCenter = resolvedName.toUpperCase();
    const cleanStatus = status === 'Unpaid' ? 'Unpaid' : 'Paid';
    const todayStr = new Date().toISOString().split('T')[0];

    const cut = await Cut.create({
      date: date || todayStr,
      centerName: cleanCenter,
      patientName: patientName.trim(),
      category: cleanCategory,
      amount: numAmount,
      status: cleanStatus,
      paymentMode: (paymentMode || 'Cash').toUpperCase(),
      reference: reference.trim(),
      notes: notes.trim(),
    });

    // Auto-save category & center name in Master Data
    await autoSaveMasterItem('cut_category', cleanCategory);
    await autoSaveMasterItem('center', cleanCenter);

    return res.status(201).json({
      success: true,
      message: 'Cut income recorded successfully',
      cut,
    });
  } catch (error) {
    console.error('Error recording cut:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record cut income',
      error: error.message,
    });
  }
};

// @desc    Update a cut entry
// @route   PUT /api/cuts/:id
// @access  Private
export const updateCut = async (req, res) => {
  try {
    const {
      date,
      centerName,
      patientName,
      category,
      amount,
      status,
      paymentMode,
      reference,
      notes,
    } = req.body;

    const cut = await Cut.findById(req.params.id);

    if (!cut) {
      return res.status(404).json({
        success: false,
        message: 'Cut entry not found',
      });
    }

    if (date !== undefined) cut.date = date;
    if (centerName !== undefined && centerName.trim()) {
      cut.centerName = centerName.trim().toUpperCase();
      await autoSaveMasterItem('center', cut.centerName);
    }
    if (patientName !== undefined) cut.patientName = patientName.trim();
    if (category !== undefined && category.trim()) {
      cut.category = category.trim().toUpperCase();
      await autoSaveMasterItem('cut_category', cut.category);
    }
    if (amount !== undefined) {
      const num = Math.max(0, Number(amount) || 0);
      if (num > 0) cut.amount = num;
    }
    if (status !== undefined) {
      cut.status = status === 'Paid' ? 'Paid' : 'Unpaid';
    }
    if (paymentMode !== undefined) cut.paymentMode = (paymentMode || 'Cash').toUpperCase();
    if (reference !== undefined) cut.reference = reference.trim();
    if (notes !== undefined) cut.notes = notes.trim();

    await cut.save();

    return res.status(200).json({
      success: true,
      message: 'Cut entry updated successfully',
      cut,
    });
  } catch (error) {
    console.error('Error updating cut:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update cut entry',
      error: error.message,
    });
  }
};

// @desc    Delete a cut entry
// @route   DELETE /api/cuts/:id
// @access  Private
export const deleteCut = async (req, res) => {
  try {
    const cut = await Cut.findByIdAndDelete(req.params.id);
    if (!cut) {
      return res.status(404).json({
        success: false,
        message: 'Cut entry not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cut entry deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete cut entry',
      error: error.message,
    });
  }
};

// @desc    Get cut summary & analytics
// @route   GET /api/cuts/summary
// @access  Private
export const getCutSummary = async (req, res) => {
  try {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const mStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

    const [todayList, monthList, allCuts] = await Promise.all([
      Cut.find({ date: todayStr }).lean(),
      Cut.find({ date: { $gte: mStart, $lte: todayStr } }).lean(),
      Cut.find().lean(),
    ]);

    const todayTotal = todayList.reduce((acc, c) => acc + (c.amount || 0), 0);
    const monthTotal = monthList.reduce((acc, c) => acc + (c.amount || 0), 0);
    const overallTotal = allCuts.reduce((acc, c) => acc + (c.amount || 0), 0);

    const paidTotal = allCuts
      .filter((c) => c.status === 'Paid')
      .reduce((acc, c) => acc + (c.amount || 0), 0);

    const unpaidTotal = allCuts
      .filter((c) => c.status !== 'Paid')
      .reduce((acc, c) => acc + (c.amount || 0), 0);

    // Group by center
    const centerBreakdown = {};
    monthList.forEach((c) => {
      const center = c.centerName || 'OTHER';
      centerBreakdown[center] = (centerBreakdown[center] || 0) + (c.amount || 0);
    });

    return res.status(200).json({
      success: true,
      summary: {
        todayTotal,
        monthTotal,
        overallTotal,
        paidTotal,
        unpaidTotal,
        todayCount: todayList.length,
        monthCount: monthList.length,
        centerBreakdown,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate cut summary',
      error: error.message,
    });
  }
};
