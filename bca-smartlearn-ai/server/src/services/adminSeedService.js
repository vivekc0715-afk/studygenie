'use strict';

const { User } = require('../models');
const { ROLES, ACCOUNT_STATUS } = require('../config/constants');
const { env } = require('../config/env');
const logger = require('../config/logger');

async function ensureAdminUser() {
  try {
    const adminEmail = env.SUPER_ADMIN_EMAIL || 'owner@bcasmartlearn.local';
    let admin = await User.findOne({
      $or: [
        { role: ROLES.SUPER_ADMIN },
        { email: adminEmail },
      ],
    });

    if (!admin) {
      admin = new User({
        name: env.SUPER_ADMIN_NAME || 'Platform Owner',
        email: adminEmail,
        role: ROLES.SUPER_ADMIN,
        status: ACCOUNT_STATUS.ACTIVE,
        emailVerified: true,
      });
      await admin.setPassword(env.SUPER_ADMIN_PASSWORD || 'ChangeThisOwner123');
      await admin.save();
      logger.info('Created default Super Admin user', { email: admin.email });
    } else {
      let needsSave = false;
      if (admin.role !== ROLES.SUPER_ADMIN) {
        admin.role = ROLES.SUPER_ADMIN;
        needsSave = true;
      }
      if (admin.status !== ACCOUNT_STATUS.ACTIVE) {
        admin.status = ACCOUNT_STATUS.ACTIVE;
        needsSave = true;
      }
      if (!admin.emailVerified) {
        admin.emailVerified = true;
        needsSave = true;
      }
      if (needsSave) {
        await admin.save();
        logger.info('Updated Super Admin user status/role to active/super_admin', { email: admin.email });
      }
    }
    return admin;
  } catch (error) {
    logger.warn('Could not ensure admin user exists', { message: error.message });
  }
}

module.exports = {
  ensureAdminUser,
};
