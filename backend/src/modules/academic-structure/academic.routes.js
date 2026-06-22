const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const c = require('./academic.controller');

router.use(authenticate);

const admin = requireRole('admin', 'registrar');

// Faculties
router.get('/faculties', c.listFaculties);
router.post('/faculties', admin, c.createFaculty);
router.put('/faculties/:id', admin, c.updateFaculty);

// Departments
router.get('/departments', c.listDepartments);
router.post('/departments', admin, c.createDepartment);
router.put('/departments/:id', admin, c.updateDepartment);

// Programmes
router.get('/programmes', c.listProgrammes);
router.post('/programmes', admin, c.createProgramme);
router.put('/programmes/:id', admin, c.updateProgramme);

// Academic Years
router.get('/years', c.listAcademicYears);
router.post('/years', admin, c.createAcademicYear);
router.put('/years/:id/set-current', admin, c.setCurrentYear);

// Intakes
router.get('/intakes', c.listIntakes);
router.post('/intakes', admin, c.createIntake);

module.exports = router;
