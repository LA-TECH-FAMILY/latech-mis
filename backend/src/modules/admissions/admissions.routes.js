const router = require('express').Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const c = require('./admissions.controller');

router.use(authenticate);

const admissions = requireRole('admin', 'registrar', 'admissions_officer');

router.get('/', admissions, c.listApplicants);
router.get('/:id', admissions, c.getApplicant);
router.post('/', admissions, c.createApplicant);
router.put('/:id/status', admissions, c.updateStatus);
router.post('/offers', admissions, c.makeOffer);
router.put('/offers/:offer_id/accept', admissions, c.acceptOffer);

module.exports = router;
