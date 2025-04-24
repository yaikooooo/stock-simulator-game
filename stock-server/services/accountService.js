// services/accountService.js
// 用于修改账户余额（人民币余额）

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * 扣减用户人民币余额
 */
async function decreaseBalance(userId, amount) {
  const account = await prisma.account.findFirst({ where: { userId } })
  if (!account || account.balanceCNY < amount) {
    throw new Error('余额不足')
  }

  return await prisma.account.update({
    where: { id: account.id },
    data: {
      balanceCNY: { decrement: amount },
      totalValue: { decrement: amount }
    }
  })
}

/**
 * 增加用户人民币余额
 */
async function increaseBalance(userId, amount) {
  const account = await prisma.account.findFirst({ where: { userId } })
  if (!account) throw new Error('账户不存在')

  return await prisma.account.update({
    where: { id: account.id },
    data: {
      balanceCNY: { increment: amount },
      totalValue: { increment: amount }
    }
  })
}

async function getAccountByUserId(userId) {
  return await prisma.account.findFirst({ where: { userId } })
}

module.exports = {
  decreaseBalance,
  increaseBalance,
  getAccountByUserId
}
