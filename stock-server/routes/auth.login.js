const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function generateUniqueId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ✅ 注册接口：/api/auth/register
router.post('/register', async (req, res) => {
  const { externalId } = req.body

  if (!externalId) {
    return res.status(400).json({ error: '缺少 externalId（如 openId）' })
  }

  // 检查是否已注册
  const existing = await prisma.authBinding.findFirst({
    where: {
      externalId,
      provider: 'open'
    }
  })

  if (existing) {
    return res.json({ success: true, userId: existing.userId })
  }

  // 生成唯一ID
  let uniqueId
  while (true) {
    const candidate = generateUniqueId()
    const exists = await prisma.user.findUnique({ where: { uniqueId: candidate } })
    if (!exists) {
      uniqueId = candidate
      break
    }
  }

  // 创建用户记录
  await prisma.user.create({
    data: {
      uniqueId,
      nickname: externalId,
      avatar: ''
    }
  })

  // 创建账户
  await prisma.account.create({
    data: {
      userId: uniqueId,
      balanceCNY: 100000,
      balanceUSD: 0,
      balanceEUR: 0
    }
  })
  // 创建绑定记录（记录 openId）
  await prisma.authBinding.create({
    data: {
      userId: uniqueId,
      provider: 'open',
      externalId,
      phone: '',
      bindingType: 'auth',
      metadata: {}
    }
  })

  res.json({ success: true, userId: uniqueId })
})

module.exports = router