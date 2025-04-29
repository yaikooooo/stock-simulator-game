const express = require('express');
const router = express.Router();
const { getStockAnalysis, getAvailablePersonas } = require('../controllers/aiChatController');
const appConfig = require('../config/appConfig');

// 检查功能是否启用的中间件
function checkFeatureEnabled(req, res, next) {
  if (!appConfig.features.enableAIChatFeature) {
    return res.status(403).json({
      success: false,
      error: 'AI聊天功能未启用'
    });
  }
  next();
}

// 使用中间件检查功能是否启用
router.use(checkFeatureEnabled);

// 获取AI分析回复
router.post('/analyze', getStockAnalysis);

// 获取可用的AI角色列表
router.get('/personas', getAvailablePersonas);

module.exports = router; 