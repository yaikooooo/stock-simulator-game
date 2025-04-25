const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 将 secondaryId 的所有数据合并到 primaryId 下，并删除 secondaryId 账号
async function mergeAccounts(primaryId, secondaryId) {
  if (primaryId === secondaryId) return

  console.log(`🔁 正在合并账号：${secondaryId} → ${primaryId}`)

  // 1. 合并账户余额
  const pAcc = await prisma.account.findFirst({ where: { userId: primaryId } })
  const sAcc = await prisma.account.findFirst({ where: { userId: secondaryId } })
  if (sAcc) {
    await prisma.account.update({
      where: { userId: primaryId },
      data: {
        balanceCNY: pAcc.balanceCNY + sAcc.balanceCNY,
        balanceUSD: pAcc.balanceUSD + sAcc.balanceUSD,
        balanceEUR: pAcc.balanceEUR + sAcc.balanceEUR
      }
    })
    await prisma.account.delete({ where: { userId: secondaryId } })
  }

  // 2. 合并持仓
  const sHoldings = await prisma.holding.findMany({ where: { userId: secondaryId } })
  for (const h of sHoldings) {
    const existing = await prisma.holding.findUnique({
      where: { userId_code: { userId: primaryId, code: h.code } }
    })

    if (!existing) {
      await prisma.holding.create({
        data: {
          userId: primaryId,
          code: h.code,
          name: h.name,
          price: h.price,
          amount: h.amount
        }
      })
    } else {
      const total = existing.amount + h.amount
      const newAvg = ((existing.price * existing.amount) + (h.price * h.amount)) / total
      await prisma.holding.update({
        where: { userId_code: { userId: primaryId, code: h.code } },
        data: {
          amount: total,
          price: Number(newAvg.toFixed(2)),
          updatedAt: new Date()
        }
      })
    }

    await prisma.holding.delete({ where: { id: h.id } })
  }

  // 3. 转移交易记录
  await prisma.trade.updateMany({
    where: { userId: secondaryId },
    data: { userId: primaryId }
  })

  // 4. 转移身份绑定
  await prisma.authBinding.updateMany({
    where: { userId: secondaryId },
    data: { userId: primaryId }
  })

  // 5. 删除次账号
  await prisma.user.delete({ where: { id: secondaryId } })

  console.log(`✅ 账号合并完成：${secondaryId} → ${primaryId}`)
}

module.exports = mergeAccounts