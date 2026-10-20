'use strict';

const { AuditLog } = require('../models');
const logger = require('../config/logger');

/**
 * Records an administrative or security-relevant action.
 * Never throws: audit failures must not break the main request.
 */
async function recordAudit({
  actor = null,
  action,
  entityType = '',
  entityId = '',
  description = '',
  before = null,
  after = null,
  severity = 'info',
  req = null,
}) {
  try {
    await AuditLog.create({
      actor: actor ? actor._id || actor : null,
      actorEmail: actor?.email || '',
      actorRole: actor?.role || '',
      action,
      entityType,
      entityId: entityId ? String(entityId) : '',
      description,
      before,
      after,
      severity,
      ip: req ? req.ip || '' : '',
      userAgent: req ? req.get('user-agent') || '' : '',
    });
  } catch (error) {
    logger.warn('Failed to write audit log', { action, message: error.message });
  }
}

module.exports = { recordAudit };
