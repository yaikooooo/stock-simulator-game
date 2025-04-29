const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const battleConfig = require('../config/battleConfig');
const { getSnapshotByCode } = require('../stockCache');

/**
 * 批量结算到期的买涨买跌订单
 * @returns {Promise<Object>} 结算结果统计
 */
async function settleExpiredBattleOrders() {
  // 获取当前时间
  const now = new Date();
  console.log(`[买涨买跌结算] 开始执行订单结算任务: ${now.toISOString()}`);
  
  // 查找所有待结算且已到结算时间的订单
  const expiredOrders = await prisma.battleOrder.findMany({
    where: {
      status: 'pending',
      settleTime: { lte: now }
    },
    take: battleConfig.batchSize // 限制批处理大小
  });
  
  if (expiredOrders.length === 0) {
    console.log('[买涨买跌结算] 没有待结算的订单');
    return { processed: 0 };
  }
  
  console.log(`[买涨买跌结算] 找到${expiredOrders.length}笔待结算订单`);
  
  // 提取所有不同的股票代码
  const stockCodes = [...new Set(expiredOrders.map(order => order.stockCode))];
  console.log(`[买涨买跌结算] 涉及${stockCodes.length}只股票: ${stockCodes.join(', ')}`);
  
  // 批量获取当前股价
  const stockPrices = {};
  for (const code of stockCodes) {
    const snapshot = getSnapshotByCode(code);
    if (snapshot && snapshot.price) {
      stockPrices[code] = snapshot.price;
    } else {
      console.error(`[买涨买跌结算] 无法获取股票${code}的当前价格`);
    }
  }
  
  // 统计结果
  const stats = {
    processed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    failed: 0,
    totalProfit: 0
  };
  
  // 分批处理订单
  for (let i = 0; i < expiredOrders.length; i += 100) {
    const batch = expiredOrders.slice(i, i + 100);
    const settlements = [];
    
    // 处理每个订单
    for (const order of batch) {
      try {
        const currentPrice = stockPrices[order.stockCode];
        if (!currentPrice) {
          console.error(`[买涨买跌结算] 跳过订单${order.id}，无法获取股票价格`);
          stats.failed++;
          continue;
        }
        
        // 计算结果
        let result;
        if (currentPrice > order.startPrice) {
          result = order.direction === 'buy_up' ? 'win' : 'lose';
        } else if (currentPrice < order.startPrice) {
          result = order.direction === 'buy_down' ? 'win' : 'lose';
        } else {
          result = 'draw'; // 平局
        }
        
        // 计算盈亏
        let profitAmount;
        if (result === 'win') {
          profitAmount = Number(order.betAmount) * (battleConfig.rewardMultiplier - 1); // 净利润
          stats.wins++;
        } else if (result === 'lose') {
          profitAmount = -Number(order.betAmount); // 全亏
          stats.losses++;
        } else {
          profitAmount = 0; // 平局退回本金
          stats.draws++;
        }
        
        // 添加到结算批次
        settlements.push({
          orderId: order.id,
          userId: order.userId,
          result,
          profitAmount,
          endPrice: currentPrice,
          betAmount: order.betAmount
        });
        
        stats.totalProfit += profitAmount;
        stats.processed++;
      } catch (error) {
        console.error(`[买涨买跌结算] 处理订单${order.id}时出错:`, error);
        stats.failed++;
      }
    }
    
    // 批量更新数据库
    await processBatchSettlements(settlements);
  }
  
  console.log(`[买涨买跌结算] 结算完成: 处理${stats.processed}单, 赢${stats.wins}单, 输${stats.losses}单, 平${stats.draws}单, 失败${stats.failed}单`);
  return stats;
}

/**
 * 批量处理结算结果
 * @param {Array} settlements 结算结果数组
 */
async function processBatchSettlements(settlements) {
  if (settlements.length === 0) return;
  
  // 使用事务批量更新
  await prisma.$transaction(async (tx) => {
    // 更新每个订单状态
    for (const settlement of settlements) {
      // 更新订单
      await tx.battleOrder.update({
        where: { id: settlement.orderId },
        data: {
          endPrice: settlement.endPrice,
          settlementResult: settlement.result,
          profitAmount: settlement.profitAmount,
          status: 'settled'
        }
      });
      
      // 查找账户记录
      const account = await tx.account.findFirst({
        where: { userId: settlement.userId }
      });
      
      if (!account) {
        console.error(`[买涨买跌结算] 找不到用户账户: ${settlement.userId}`);
        continue;
      }
      
      // 更新用户余额
      const balanceChange = Number(settlement.profitAmount) + 
                           (settlement.result === 'draw' ? Number(settlement.betAmount) : 0);
      
      if (balanceChange !== 0) {
        await tx.account.update({
          where: { id: account.id }, // 使用account.id
          data: {
            balanceCNY: { increment: balanceChange }
          }
        });
      }
    }
    
    console.log(`[买涨买跌结算] 成功批量结算${settlements.length}笔订单`);
  });
}

module.exports = {
  settleExpiredBattleOrders
}; 