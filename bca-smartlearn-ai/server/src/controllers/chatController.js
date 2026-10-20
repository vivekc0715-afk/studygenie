'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const chatbotService = require('../services/ai/chatbotService');

/**
 * Returns the list of all prebuilt topics, questions, and categories.
 */
const getPrebuiltAnswers = asyncHandler(async (_req, res) => {
  return ok(res, chatbotService.PREBUILT_ANSWERS);
});

/**
 * Handles student chat query and returns instant prebuilt or AI answer.
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { message, conversationHistory = [] } = req.body;
  const result = await chatbotService.answerChatQuestion({ message, conversationHistory });
  return ok(res, result);
});

module.exports = {
  getPrebuiltAnswers,
  sendMessage,
};
