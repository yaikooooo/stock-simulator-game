const { createBattleOrder, getUserBattleOrders, cancelBattleOrder } = require('../services/battleService');
const battleConfig = require('../config/battleConfig');
const appConfig = require('../config/appConfig');

/**
 * 创建买涨买跌订单
 */
async function createOrder(req, res) {
  try {
    // 检查功能是否启用
    if (!appConfig.features.enableBattleGame || !battleConfig.enabled) {
      return res.status(403).json({
        success: false,
        error: '买涨买跌游戏功能未启用'
      });
    }
    
    const { userId, stockCode, direction, betAmount, holdMinutes } = req.body;
    
    // 验证参数
    if (!userId || !stockCode || !direction || !betAmount || !holdMinutes) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    // 创建订单
    const order = await createBattleOrder(userId, stockCode, direction, betAmount, holdMinutes);
    
    return res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('创建买涨买跌订单失败:', error);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 获取用户的买涨买跌订单列表
 */
async function getOrders(req, res) {
  try {
    const { userId, status = 'all', page = 1, pageSize = 20 } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '缺少用户ID'
      });
    }
    
    // 获取订单列表
    const orders = await getUserBattleOrders(
      userId, 
      status, 
      parseInt(page, 10), 
      parseInt(pageSize, 10)
    );
    
    return res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('获取买涨买跌订单列表失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取订单失败'
    });
  }
}

/**
 * 取消买涨买跌订单
 */
async function cancelOrder(req, res) {
  try {
    const { orderId, userId } = req.body;
    
    if (!orderId || !userId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }
    
    // 取消订单
    const order = await cancelBattleOrder(orderId, userId);
    
    return res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('取消买涨买跌订单失败:', error);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * 获取买涨买跌游戏配置
 */
function getConfig(req, res) {
  try {
    // 返回客户端需要的配置
    return res.json({
      success: true,
      data: {
        enabled: appConfig.features.enableBattleGame && battleConfig.enabled,
        minBetAmount: battleConfig.minBetAmount,
        maxBetAmount: battleConfig.maxBetAmount,
        rewardMultiplier: battleConfig.rewardMultiplier,
        availableHoldMinutes: battleConfig.availableHoldMinutes
      }
    });
  } catch (error) {
    console.error('获取买涨买跌游戏配置失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取配置失败'
    });
  }
}

module.exports = {
  createOrder,
  getOrders,
  cancelOrder,
  getConfig
}; 