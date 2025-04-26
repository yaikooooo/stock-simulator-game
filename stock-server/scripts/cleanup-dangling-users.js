// scripts/cleanup-dangling-users.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 需要清理的 userId（不是 uniqueId，而是 User 表的 id 字段）
const userIdsToDelete = [
  '8KUQSKYE'  // 注册失败无账户
]

async function cleanup() {
  for (const uniqueId of userIdsToDelete) {
    console.log(`🔍 正在清理 uniqueId: ${uniqueId}`)

//    await prisma.authBinding.deleteMany({ where: { userId } })
//    await prisma.account.deleteMany({ where: { userId } })
//    await prisma.holding.deleteMany({ where: { userId } })
//    await prisma.trade.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { uniqueId } })

    console.log(`✅ 已删除与 ${userId} 相关的所有数据`)
  }
  await prisma.$disconnect()
  console.log('🎉 清理完成')
}

cleanup()