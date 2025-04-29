const cron = require('node-cron');
const appConfig = require('../config/appConfig');
const battleConfig = require('../config/battleConfig');
const { settleExpiredBattleOrders } = require('../services/battleSettlementService');

/**
 * 启动买涨买跌游戏结算定时任务
 */
function startBattleSettlementTask() {
  // 检查功能是否启用
  if (!appConfig.features.enableBattleGame || !battleConfig.enabled) {
    console.log('[定时任务] ❌ 买涨买跌游戏功能未启用，不启动结算任务');
    return;
  }
  
  console.log(`[定时任务] 🔁 启动买涨买跌游戏结算任务，调度: '${battleConfig.settlementCron}'`);
  
  // 注册定时任务
  cron.schedule(battleConfig.settlementCron, async () => {
    try {
      await settleExpiredBattleOrders();
    } catch (error) {
      console.error('[定时任务] ❌ 买涨买跌游戏结算任务执行失败:', error);
    }
  });
}

module.exports = startBattleSettlementTask; 