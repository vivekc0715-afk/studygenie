'use strict';

/** Central model registry so services can `require('../models')`. */

const user = require('./user');
const academic = require('./academic');
const learning = require('./learning');
const coding = require('./coding');
const assessment = require('./assessment');
const analytics = require('./analytics');
const planner = require('./planner');
const media = require('./media');
const system = require('./system');

module.exports = {
  ...user,
  ...academic,
  ...learning,
  ...coding,
  ...assessment,
  ...analytics,
  ...planner,
  ...media,
  ...system,
};
