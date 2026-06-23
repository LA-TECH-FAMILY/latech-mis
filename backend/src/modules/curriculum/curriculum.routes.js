const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const wrap = require('../../middleware/asyncHandler');
const c = require('./curriculum.controller');

router.use(authenticate);
const academic = requireRole('admin', 'registrar', 'hod', 'dean');

router.get('/courses', wrap(c.listCourses));
router.post('/courses', academic, wrap(c.createCourse));
router.put('/courses/:id', academic, wrap(c.updateCourse));

router.get('/programmes/:programme_id/years/:academic_year_id', wrap(c.getProgrammeCurriculum));
router.put('/programmes/:programme_id/years/:academic_year_id', academic, wrap(c.setProgrammeCurriculum));

module.exports = router;
