import express from 'express';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
} from '../controllers/expenseController.js';
import { protectDoctor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protectDoctor); // Doctor auth required

router.get('/summary', getExpenseSummary);
router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;

