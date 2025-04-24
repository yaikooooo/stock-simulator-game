// scripts/seed-user.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const userId = 'user_test_001'

  await prisma.user.create({
    data: {
      id: userId,
      nickname: '测试账户',
      avatar: null
    }
  })

  await prisma.account.create({
    data: {
      userId,
      balanceCNY: 100000,
      balanceUSD: 0,
      balanceEUR: 0,
      totalValue: 100000
    }
  })

  console.log('[测试数据] ✅ 已成功添加用户和账户')
}

main().then(() => process.exit()).catch((e) => {
  console.error(e)
  process.exit(1)
})
