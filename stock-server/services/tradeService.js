// services/tradeService.js
// 执行买入与卖出逻辑：校验、修改账户与持仓、写入交易

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const { addOrUpdateHolding } = require('./holdingService')
const { decreaseBalance, increaseBalance } = require('./accountService')
const appConfig = require('../config/appConfig')
const { getSnapshotByCode } = require('../stockCache')

/**
 * 用户买入某支股票
 */
async function buy(userId, code, name, amount) {
  // 首先检查用户是否存在
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: userId },
        { uniqueId: userId }
      ]
    }
  });
  
  if (!user) {
    throw new Error('用户不存在');
  }
  
  // 替换原本直接使用 price 的逻辑：
  const snapshot = getSnapshotByCode(code)
  if (!snapshot) throw new Error('无法获取当前股票价格')
  const price = snapshot.price

  const raw = price * amount
  const fee = Number((raw * appConfig.trade.feeRate).toFixed(2))
  const netIncome = Number((raw + fee).toFixed(2))
  console.log('[调试] netIncome =', netIncome, typeof netIncome)

  // 检查账户是否存在
  const account = await prisma.account.findFirst({ where: { userId: user.id } })
  console.log('🧾 账户数据:', account)
  
  if (!account) {
    throw new Error('账户不存在');
  }
  
  // 检查余额是否足够
  if (account.balanceCNY < netIncome) {
    throw new Error('余额不足');
  }

  const holding = await addOrUpdateHolding(user.id, code, name, price, amount)
  await decreaseBalance(user.id, netIncome)

  const trade = await prisma.trade.create({
    data: {
      userId: user.id,
      code,
      name,
      type: 'BUY',
      price,
      amount,
      fee,
    }
  })

  if (holding && typeof holding.amount === 'number' && typeof holding.price === 'number') {
    console.log(`[持仓] ${user.id} ➕ 买入 ${code}：原数量 ${holding.amount}，新买入 ${amount}，新均价 ${holding.price.toFixed(2)}`)
  } else {
    console.log(`[持仓] ${user.id} ➕ 买入 ${code}：成功，未能获取完整持仓信息`)
  }

  return trade
}

/**
 * 用户卖出某支股票
 */
async function sell(userId, code, name, amount) {
  // 首先检查用户是否存在
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: userId },
        { uniqueId: userId }
      ]
    }
  });
  
  if (!user) {
    throw new Error('用户不存在');
  }
  
  const holding = await prisma.holding.findUnique({
    where: { userId_code: { userId: user.id, code } }
  })

  if (!holding) {
    throw new Error('没有该股票的持仓');
  }
  
  if (holding.amount < amount) {
    throw new Error('持仓不足');
  }
  
  // 检查T+1限制
  if (appConfig.features.enableT1TradingRule) {
    // 查询最近一次买入该股票的交易记录
    const latestBuyTrade = await prisma.trade.findFirst({
      where: {
        userId: user.id,
        code,
        type: 'BUY'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // 如果有买入记录，检查是否是今天买入的
    if (latestBuyTrade) {
      const now = new Date();
      const buyDate = new Date(latestBuyTrade.createdAt);
      
      // 检查是否同一天
      const isSameDay = 
        now.getFullYear() === buyDate.getFullYear() &&
        now.getMonth() === buyDate.getMonth() &&
        now.getDate() === buyDate.getDate();
      
      // 如果是同一天买入的，不允许卖出
      if (isSameDay) {
        throw new Error('根据T+1规则，当天买入的股票不能在当天卖出');
      }
    }
  }

  // 替换原本直接使用 price 的逻辑：
  const snapshot = getSnapshotByCode(code)
  if (!snapshot) throw new Error('无法获取当前股票价格')
  const price = snapshot.price

  const raw = price * amount
  const fee = Number((raw * appConfig.trade.feeRate).toFixed(2))
  const netIncome = Number((raw - fee).toFixed(2))

  const remaining = holding.amount - amount

  if (remaining === 0) {
    await prisma.holding.delete({
      where: { userId_code: { userId: user.id, code } }
    })
  } else {
    await prisma.holding.update({
      where: { userId_code: { userId: user.id, code } },
      data: {
        amount: remaining,
        updatedAt: new Date()
      }
    })
  }

  await increaseBalance(user.id, netIncome)

  const trade = await prisma.trade.create({
    data: {
      userId: user.id,
      code,
      name,
      type: 'SELL',
      price,
      amount,
      fee,
    }
  })

  console.log('===== 🧾 卖出调试信息 =====')
  console.log(`📌 股票：${code} - ${name}`)
  console.log(`📈 卖出价格：${price}`)
  console.log(`💰 原始持仓均价：${holding.price}`)
  console.log(`📊 本次交易股数：${amount}`)
  console.log(`🧾 总金额（未扣费）：${raw}`)
  console.log(`💸 手续费：${fee}`)
  console.log(`💳 到账金额：${netIncome}`)
  console.log(`📈 盈亏/每股：${(price - holding.price).toFixed(2)}`)
  console.log(`📊 本次总盈利：${((price - holding.price) * amount).toFixed(2)}`)
  console.log('=============================')
  return trade
}

module.exports = {
  buy,
  sell
}
