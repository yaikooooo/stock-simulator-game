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
  console.log(`📊 externalId：${externalId}`)
  if (!externalId) {
    return res.status(400).json({ error: '缺少 externalId（如 openId）' })
  }

  // 检查是否已注册
  const existing = await prisma.authBinding.findUnique({
    where: {
      externalId_provider: {
        externalId,
        provider: 'register'
      }
    }
  })
  
  if (existing) {
    return res.status(200).json({
      success: false,
      code: 'ALREADY_REGISTERED',  // ✅ 自定义错误码
      message: '该 openId 已注册',
      userId: existing.userId
    })
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

  // ✅ 创建用户，并获取返回对象
  const user = await prisma.user.create({
    data: {
      uniqueId,
      nickname: externalId,
      avatar:''
    }
  })
  // 创建账户
  await prisma.account.create({
    data: {
      userId: user.id,
      balanceCNY: 100000,
      balanceUSD: 0,
      balanceEUR: 0,
      totalValue: 100000
    }
  })
  // 创建绑定记录（记录 openId）
  await prisma.authBinding.create({
    data: {
      userId: user.id,
      provider: 'register',
      externalId,
      phone: '',
      bindingType: 'auth',
      metadata: {}
    }
  })

  res.json({ success: true, uniqueId: uniqueId , userId: user.id})
})

module.exports = router