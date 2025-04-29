const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const battleConfig = require('../config/battleConfig');
const appConfig = require('../config/appConfig');
const { getSnapshotByCode } = require('../stockCache');
const { decreaseBalance, increaseBalance } = require('./accountService');

/**
 * 创建买涨买跌订单
 * @param {string} userId 用户ID
 * @param {string} stockCode 股票代码
 * @param {string} direction 方向 'buy_up' 或 'buy_down'
 * @param {number} betAmount 下注金额
 * @param {number} holdMinutes 持有时间（分钟）
 * @returns {Promise<Object>} 创建的订单
 */
async function createBattleOrder(userId, stockCode, direction, betAmount, holdMinutes) {
  // 检查功能是否启用
  if (!appConfig.features.enableBattleGame || !battleConfig.enabled) {
    throw new Error('买涨买跌游戏功能未启用');
  }
  
  // 校验下注金额
  betAmount = Number(betAmount);
  if (isNaN(betAmount) || betAmount < battleConfig.minBetAmount || betAmount > battleConfig.maxBetAmount) {
    throw new Error(`下注金额必须在${battleConfig.minBetAmount}到${battleConfig.maxBetAmount}之间`);
  }
  
  // 校验持有时间
  if (!battleConfig.availableHoldMinutes.includes(Number(holdMinutes))) {
    throw new Error('无效的持有时间');
  }
  
  // 校验方向
  if (direction !== 'buy_up' && direction !== 'buy_down') {
    throw new Error('无效的交易方向');
  }
  
  // 检查股票代码是否有效
  const snapshot = getSnapshotByCode(stockCode);
  if (!snapshot) {
    throw new Error('无法获取该股票的当前价格信息');
  }
  
  // 获取当前价格
  const currentPrice = snapshot.price;
  if (!currentPrice || currentPrice <= 0) {
    throw new Error('无效的股票价格');
  }
  
  // 获取账户 - 先确认是否存在
  const account = await prisma.account.findFirst({ where: { userId } });
  if (!account) {
    throw new Error('账户不存在');
  }
  
  // 检查余额
  if (account.balanceCNY < betAmount) {
    throw new Error('账户余额不足');
  }
  
  // 计算结算时间
  const now = new Date();
  const settleTime = new Date(now.getTime() + holdMinutes * 60 * 1000);
  
  // 事务处理：创建订单并扣除余额
  return await prisma.$transaction(async (tx) => {
    // 创建订单
    const order = await tx.battleOrder.create({
      data: {
        userId,
        stockCode,
        direction,
        betAmount,
        startPrice: currentPrice,
        holdMinutes,
        settleTime,
        status: 'pending'
      }
    });
    
    // 扣除用户余额 - 这里要使用account.id作为唯一标识
    await tx.account.update({
      where: { id: account.id }, // 修改这里，使用account.id而不是userId
      data: { 
        balanceCNY: { decrement: betAmount }
      }
    });
    
    console.log(`[买涨买跌] 用户${userId}创建了订单: ${direction} ${stockCode}, 金额: ${betAmount}, 持有: ${holdMinutes}分钟`);
    return order;
  });
}

/**
 * 获取用户的买涨买跌订单列表
 * @param {string} userId 用户ID
 * @param {string} status 状态筛选 ('all', 'pending', 'settled')
 * @param {number} page 页码
 * @param {number} pageSize 每页数量
 * @returns {Promise<Object>} 分页订单列表
 */
async function getUserBattleOrders(userId, status = 'all', page = 1, pageSize = 20) {
  const where = { userId };
  
  // 根据状态筛选
  if (status !== 'all') {
    where.status = status;
  }
  
  // 查询订单总数
  const total = await prisma.battleOrder.count({ where });
  
  // 分页查询订单
  const orders = await prisma.battleOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize
  });
  
  return {
    total,
    page,
    pageSize,
    data: orders
  };
}

/**
 * 取消未结算的订单
 * @param {string} orderId 订单ID
 * @param {string} userId 用户ID（校验所有权）
 * @returns {Promise<Object>} 取消的订单
 */
async function cancelBattleOrder(orderId, userId) {
  // 查找订单
  const order = await prisma.battleOrder.findUnique({
    where: { id: orderId }
  });
  
  // 校验订单
  if (!order) {
    throw new Error('订单不存在');
  }
  
  if (order.userId !== userId) {
    throw new Error('无权操作此订单');
  }
  
  if (order.status !== 'pending') {
    throw new Error('只能取消待结算的订单');
  }
  
  // 检查是否在结算窗口期（例如最后5分钟不能取消）
  const now = new Date();
  const remainingMinutes = (order.settleTime.getTime() - now.getTime()) / (60 * 1000);
  if (remainingMinutes < 5) {
    throw new Error('结算前5分钟内不能取消订单');
  }
  
  // 获取账户信息
  const account = await prisma.account.findFirst({ 
    where: { userId: order.userId }
  });
  
  if (!account) {
    throw new Error('账户不存在');
  }
  
  // 事务处理：取消订单并返还余额
  return await prisma.$transaction(async (tx) => {
    // 更新订单状态
    const updatedOrder = await tx.battleOrder.update({
      where: { id: orderId },
      data: { status: 'canceled' }
    });
    
    // 返还用户余额 - 使用account.id
    await tx.account.update({
      where: { id: account.id }, // 修改这里，使用account.id
      data: { 
        balanceCNY: { increment: order.betAmount }
      }
    });
    
    console.log(`[买涨买跌] 用户${userId}取消了订单: ${orderId}, 返还金额: ${order.betAmount}`);
    return updatedOrder;
  });
}

module.exports = {
  createBattleOrder,
  getUserBattleOrders,
  cancelBattleOrder
}; 