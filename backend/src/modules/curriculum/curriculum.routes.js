const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const c = require('./curriculum.controller');

router.use(authenticate);
const academic = requireRole('admin', 'registrar', 'hod', 'dean');

router.get('/courses', c.listCourses);
router.post('/courses', academic, c.createCourse);
router.put('/courses/:id', academic, c.updateCourse);

router.get('/programmes/:programme_id/years/:academic_year_id', c.getProgrammeCurriculum);
router.put('/programmes/:programme_id/years/:academic_year_id', academic, c.setProgrammeCurriculum);

module.exports = router;
