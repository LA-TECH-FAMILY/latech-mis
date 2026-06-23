const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const wrap = require('../../middleware/asyncHandler');
const c = require('./marks.controller');

router.use(authenticate);

router.post('/enter', requireRole('admin', 'lecturer'), wrap(c.enterMarks));
router.post('/submit', requireRole('admin', 'lecturer'), wrap(c.submitMarks));
router.post('/hod-approve', requireRole('admin', 'hod'), wrap(c.hodApprove));
router.post('/registrar-approve', requireRole('admin', 'registrar'), wrap(c.registrarApprove));
router.post('/publish', requireRole('admin', 'registrar'), wrap(c.publishMarks));

router.get('/students/:student_id', authenticate, wrap(c.getStudentResults));
router.get('/courses', requireRole('admin', 'registrar', 'hod', 'dean', 'lecturer'), wrap(c.getCourseMarks));

module.exports = router;
