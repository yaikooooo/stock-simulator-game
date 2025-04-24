// services/holdingService.js
// 处理用户持仓数据：买入时更新股数与加权均价

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * 更新或插入用户持仓（加股数，重算加权均价）
 */
async function addOrUpdateHolding(userId, code, name, price, amount) {
  const existing = await prisma.holding.findFirst({
    where: { userId, code }
  })

  if (!existing) {
    // 新建持仓
    return await prisma.holding.create({
      data: {
        userId,
        code,
        name,
        amount,
        price
      }
    })
  }

  // 计算新的加权平均价格
  const totalShares = existing.amount + amount
  const totalCost = existing.price * existing.amount + price * amount
  const newAvgPrice = totalCost / totalShares

  return await prisma.holding.update({
    where: { id: existing.id },
    data: {
      amount: totalShares,
      price: newAvgPrice
    }
  })
}

module.exports = { addOrUpdateHolding }