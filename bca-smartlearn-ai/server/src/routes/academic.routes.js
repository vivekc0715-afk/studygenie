'use strict';

const express = require('express');
const controller = require('../controllers/academicController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Publicly browsable, but `optionalAuth` lets a signed-in student also see
// the custom subjects they own and their own saved notes in search results.
router.use(optionalAuth);

router.get('/catalogue', controller.catalogue);
router.get('/semesters', controller.listSemesters);
router.get('/subjects', controller.listSubjects);
router.get('/subjects/:id', controller.getSubject);
router.get('/subjects/:id/units', controller.listUnits);
router.get('/units', controller.listUnits);
router.get('/topics', controller.listTopics);
router.get('/search', controller.search);

module.exports = router;
