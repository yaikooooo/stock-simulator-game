const express = require('express');
const router = express.Router();
const { createOrder, getOrders, cancelOrder, getConfig } = require('../controllers/battleController');
const appConfig = require('../config/appConfig');
const battleConfig = require('../config/battleConfig');

// 检查功能是否启用的中间件
function checkFeatureEnabled(req, res, next) {
  if (!appConfig.features.enableBattleGame || !battleConfig.enabled) {
    return res.status(403).json({
      success: false,
      error: '买涨买跌游戏功能未启用'
    });
  }
  next();
}

// 使用中间件检查功能是否启用
router.use(checkFeatureEnabled);

// 创建买涨买跌订单
router.post('/order', createOrder);

// 获取用户的买涨买跌订单列表
router.get('/orders', getOrders);

// 取消买涨买跌订单
router.post('/cancel', cancelOrder);

// 获取买涨买跌游戏配置
router.get('/config', getConfig);

module.exports = router; 