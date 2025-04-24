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
async function buy(userId, code, name, price, amount) {
  // 替换原本直接使用 price 的逻辑：
  const snapshot = getSnapshotByCode(code)
  if (!snapshot) throw new Error('无法获取当前股票价格')
  const price = snapshot.price

  const cost = price * amount

  const account = await prisma.account.findFirst({ where: { userId } })
  if (!account || account.balanceCNY < cost) {
    throw new Error('余额不足')
  }

  await addOrUpdateHolding(userId, code, name, price, amount)
  await decreaseBalance(userId, cost)

  const trade = await prisma.trade.create({
    data: {
      userId,
      code,
      name,
      type: 'BUY',
      price,
      amount,
    }
  })

  return trade
}

/**
 * 用户卖出某支股票
 */
async function sell(userId, code, name, price, amount) {
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

  const totalValue = price * amount * config.feeRate
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

  await increaseBalance(userId, totalValue)

  const trade = await prisma.trade.create({
    data: {
      userId,
      code,
      name,
      type: 'SELL',
      price,
      amount,
    }
  })

  return trade
}

module.exports = {
  buy,
  sell
}
