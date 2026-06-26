const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const wrap = require('../../middleware/asyncHandler');
const c = require('./registration.controller');

router.use(authenticate);

// Windows
router.get('/windows', wrap(c.listWindows));
router.post('/windows', requireRole('admin', 'registrar'), wrap(c.createWindow));

// Stats for header cards
router.get('/stats', wrap(c.getSemesterStats));

// Clearance list
router.get('/', wrap(c.listRegistrations));

// Pipeline actions
router.post('/initiate', requireRole('admin', 'registrar', 'student'), wrap(c.initiateRegistration));
router.post('/:id/clear-stage', requireRole('admin', 'registrar', 'finance_officer'), wrap(c.clearStage));
router.post('/:id/waiver', requireRole('admin', 'registrar', 'finance_officer'), wrap(c.grantWaiver));
router.put('/:id/courses', requireRole('admin', 'registrar'), wrap(c.registerCourses));

// Student view
router.get('/students/:student_id/years/:academic_year_id/semesters/:semester', wrap(c.getStudentRegistration));

// Legacy
router.post('/register', requireRole('admin', 'registrar', 'student'), wrap(c.registerStudent));

module.exports = router;
