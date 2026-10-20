'use strict';

const express = require('express');
const controller = require('../controllers/studentController');
const { validate } = require('../middleware/validate');
const { requireAuth, requireStudent } = require('../middleware/auth');
const { enrollmentCreateSchema, enrollmentUpdateSchema, studentProfileUpdateSchema } = require('../validators/entity.validators');

const router = express.Router();

router.use(requireAuth, requireStudent);

/* ----------------------------------------------------------------- profile --- */

router.get('/profile', controller.getProfile);
router.patch('/profile', validate({ body: studentProfileUpdateSchema }), controller.updateProfile);
router.post('/onboarding/complete', controller.completeOnboarding);

/* -------------------------------------------------------------- enrolments --- */

router.get('/enrollments', controller.listEnrollments);
router.post('/enrollments', validate({ body: enrollmentCreateSchema }), controller.addEnrollments);
router.patch('/enrollments/:id', validate({ body: enrollmentUpdateSchema }), controller.updateEnrollment);
router.delete('/enrollments/:id', controller.removeEnrollment);

/* ----------------------------------------------------------- subject tree --- */

router.get('/subjects', controller.mySubjects);
router.post('/topics/:topicId/completion', controller.setTopicCompletion);

module.exports = router;
