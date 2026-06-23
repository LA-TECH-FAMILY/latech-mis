const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const wrap = require('../../middleware/asyncHandler');
const c = require('./registration.controller');

router.use(authenticate);

router.get('/windows', wrap(c.listWindows));
router.post('/windows', requireRole('admin', 'registrar'), wrap(c.createWindow));
router.post('/register', requireRole('admin', 'registrar', 'student'), wrap(c.registerStudent));
router.get('/students/:student_id/years/:academic_year_id/semesters/:semester', wrap(c.getStudentRegistration));

module.exports = router;
