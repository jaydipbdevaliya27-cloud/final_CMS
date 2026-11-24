import Expense from '../models/Expense.js';
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

// @desc    Get all clinic expenses with filtering
// @route   GET /api/expenses
// @access  Private
export const getExpenses = async (req, res) => {
  try {
    const {
      period = 'all',
      date,
      companyName,
      category,
      status,
      from,
      to,
      search,
      limit = 500,
    } = req.query;
    const query = {};

    // Date filtering: supports custom date range `from` and `to`
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

    if (companyName && companyName.trim()) {
      query.companyName = new RegExp(companyName.trim(), 'i');
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
        { companyName: regex },
        { category: regex },
        { paidTo: regex },
        { description: regex },
        { paymentMode: regex },
      ];
    }

    const expenses = await Expense.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(Number(limit) || 500)
      .lean();

    // Compute KPI card statistics
    const totalEntries = expenses.length;
    let paidAmount = 0;
    let unpaidAmount = 0;
    let totalExpense = 0;

    expenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      totalExpense += amt;
      if (e.status === 'Paid') {
        paidAmount += amt;
      } else {
        unpaidAmount += amt;
      }
    });

    return res.status(200).json({
      success: true,
      count: expenses.length,
      totalEntries,
      paidAmount,
      unpaidAmount,
      totalExpense,
      totalAmount: totalExpense,
      expenses,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses',
      error: error.message,
    });
  }
};

// @desc    Create a new expense entry
// @route   POST /api/expenses
// @access  Private
export const createExpense = async (req, res) => {
  try {
    const {
      date,
      companyName = '',
      category,
      amount,
      status = 'Unpaid',
      paymentMode = 'Cash',
      paidTo = '',
      description = '',
    } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Expense category is required',
      });
    }

    const numAmount = Math.max(0, Number(amount) || 0);
    if (numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid expense amount greater than 0 is required',
      });
    }

    const cleanCategory = category.trim().toUpperCase();
    const cleanCompany = (companyName || paidTo || '').trim().toUpperCase();
    const cleanStatus = status === 'Paid' ? 'Paid' : 'Unpaid';
    const todayStr = new Date().toISOString().split('T')[0];

    const expense = await Expense.create({
      date: date || todayStr,
      companyName: cleanCompany,
      category: cleanCategory,
      amount: numAmount,
      status: cleanStatus,
      paymentMode: (paymentMode || 'Cash').toUpperCase(),
      paidTo: cleanCompany || paidTo.trim(),
      description: description.trim(),
    });

    // Auto-save category & company in Master Data
    if (cleanCategory) {
      await autoSaveMasterItem('expense_category', cleanCategory);
    }
    if (cleanCompany) {
      await autoSaveMasterItem('company', cleanCompany);
    }

    return res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      expense,
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record expense',
      error: error.message,
    });
  }
};

// @desc    Update an expense entry
// @route   PUT /api/expenses/:id
// @access  Private
export const updateExpense = async (req, res) => {
  try {
    const {
      date,
      companyName,
      category,
      amount,
      status,
      paymentMode,
      paidTo,
      description,
    } = req.body;

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense entry not found',
      });
    }

    if (date !== undefined) expense.date = date;
    if (companyName !== undefined) {
      expense.companyName = companyName.trim().toUpperCase();
      if (expense.companyName) {
        await autoSaveMasterItem('company', expense.companyName);
      }
    }
    if (category !== undefined && category.trim()) {
      expense.category = category.trim().toUpperCase();
      await autoSaveMasterItem('expense_category', expense.category);
    }
    if (amount !== undefined) {
      const num = Math.max(0, Number(amount) || 0);
      if (num > 0) expense.amount = num;
    }
    if (status !== undefined) {
      expense.status = status === 'Paid' ? 'Paid' : 'Unpaid';
    }
    if (paymentMode !== undefined) expense.paymentMode = (paymentMode || 'Cash').toUpperCase();
    if (paidTo !== undefined) expense.paidTo = paidTo.trim();
    if (description !== undefined) expense.description = description.trim();

    await expense.save();

    return res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      expense,
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update expense',
      error: error.message,
    });
  }
};

// @desc    Delete an expense entry
// @route   DELETE /api/expenses/:id
// @access  Private
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense entry not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Expense entry deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete expense',
      error: error.message,
    });
  }
};

// @desc    Get expense analytics & summary
// @route   GET /api/expenses/summary
// @access  Private
export const getExpenseSummary = async (req, res) => {
  try {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const mStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

    const [todayList, monthList, allExpenses] = await Promise.all([
      Expense.find({ date: todayStr }).lean(),
      Expense.find({ date: { $gte: mStart, $lte: todayStr } }).lean(),
      Expense.find().lean(),
    ]);

    const todayTotal = todayList.reduce((acc, e) => acc + (e.amount || 0), 0);
    const monthTotal = monthList.reduce((acc, e) => acc + (e.amount || 0), 0);
    const overallTotal = allExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    const paidTotal = allExpenses
      .filter((e) => e.status === 'Paid')
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    const unpaidTotal = allExpenses
      .filter((e) => e.status !== 'Paid')
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    // Group by category
    const categoryBreakdown = {};
    monthList.forEach((e) => {
      const cat = e.category || 'OTHER';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (e.amount || 0);
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
        categoryBreakdown,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate expense summary',
      error: error.message,
    });
  }
};
