const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const wrap = require('../../middleware/asyncHandler');
const c = require('./finance.controller');

router.use(authenticate);

const finance = requireRole('admin', 'registrar', 'finance_officer');

// Fee items
router.get('/fee-items', finance, wrap(c.listFeeItems));
router.post('/fee-items', requireRole('admin', 'finance_officer'), wrap(c.createFeeItem));
router.put('/fee-items/:id', requireRole('admin', 'finance_officer'), wrap(c.updateFeeItem));

// Fee structures
router.get('/fee-structures', finance, wrap(c.listFeeStructures));
router.get('/fee-structures/stats', finance, wrap(c.getFeeStructureStats));
router.post('/fee-structures', requireRole('admin', 'finance_officer'), wrap(c.createFeeStructure));
router.put('/fee-structures/:id', requireRole('admin', 'finance_officer'), wrap(c.updateFeeStructure));
router.post('/fee-structures/:id/approve', requireRole('admin', 'finance_officer'), wrap(c.approveFeeStructure));
router.delete('/fee-structures/:id', requireRole('admin', 'finance_officer'), wrap(c.deleteFeeStructure));

// Invoices
router.get('/invoices', finance, wrap(c.listInvoices));
router.get('/invoices/:id', finance, wrap(c.getInvoice));
router.post('/invoices', finance, wrap(c.createInvoice));

// Payments
router.get('/payments', finance, wrap(c.listPayments));
router.post('/payments', finance, wrap(c.recordPayment));

// Tuition fees
router.get('/tuition-fees', finance, wrap(c.listTuitionFees));
router.post('/tuition-fees', requireRole('admin', 'finance_officer'), wrap(c.upsertTuitionFee));
router.put('/tuition-fees/:id', requireRole('admin', 'finance_officer'), wrap(c.updateTuitionFee));
router.delete('/tuition-fees/:id', requireRole('admin', 'finance_officer'), wrap(c.deleteTuitionFee));

// Student financials summary
router.get('/students/:student_id', finance, wrap(c.getStudentFinancials));

module.exports = router;
