// services/tradeService.js
// 执行买入与卖出逻辑：校验、修改账户与持仓、写入交易

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const { addOrUpdateHolding } = require('./holdingService')
const { decreaseBalance, increaseBalance } = require('./accountService')
const config = require('../config/index')
const { getSnapshotByCode } = require('../stockCache')

/**
 * 用户买入某支股票
 */
async function buy(userId, code, name, amount) {
  // 替换原本直接使用 price 的逻辑：
  const snapshot = getSnapshotByCode(code)
  if (!snapshot) throw new Error('无法获取当前股票价格')
  const price = snapshot.price

  const raw = price * amount
  const fee = Number((raw * config.feeRate).toFixed(2))
  const netIncome = Number((raw + fee).toFixed(2))
  console.log('[调试] netIncome =', netIncome, typeof netIncome)


  const account = await prisma.account.findFirst({ where: { userId } })
  console.log('🧾 账户数据:', account)
  
  if (!account || account.balanceCNY < netIncome) {
    throw new Error('余额不足')
  }

  const holding = await addOrUpdateHolding(userId, code, name, price, amount)
  await decreaseBalance(userId, netIncome)

  const trade = await prisma.trade.create({
    data: {
      userId,
      code,
      name,
      type: 'BUY',
      price,
      amount,
      fee,
    }
  })

  if (holding && typeof holding.amount === 'number' && typeof holding.price === 'number') {
    console.log(`[持仓] ${userId} ➕ 买入 ${code}：原数量 ${holding.amount}，新买入 ${amount}，新均价 ${holding.price.toFixed(2)}`)
  } else {
    console.log(`[持仓] ${userId} ➕ 买入 ${code}：成功，未能获取完整持仓信息`)
  }

    return trade
}

/**
 * 用户卖出某支股票
 */
async function sell(userId, code, name, amount) {
  const holding = await prisma.holding.findUnique({
    where: { userId_code: { userId, code } }
  })

  if (!holding || holding.amount < amount) {
    throw new Error('持仓不足')
  }

  // 替换原本直接使用 price 的逻辑：
  const snapshot = getSnapshotByCode(code)
  if (!snapshot) throw new Error('无法获取当前股票价格')
  const price = snapshot.price

  const raw = price * amount
  const fee = Number((raw * config.feeRate).toFixed(2))
  const netIncome = Number((raw - fee).toFixed(2))

  const remaining = holding.amount - amount

  if (remaining === 0) {
    await prisma.holding.delete({
      where: { userId_code: { userId, code } }
    })
  } else {
    await prisma.holding.update({
      where: { userId_code: { userId, code } },
      data: {
        amount: remaining,
        updatedAt: new Date()
      }
    })
  }

  await increaseBalance(userId, netIncome)

  const trade = await prisma.trade.create({
    data: {
      userId,
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
