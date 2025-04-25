const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

router.post('/bind-phone', async (req, res) => {
  const { uniqueId, phone, provider } = req.body

  if (!uniqueId || !phone || !provider) {
    return res.status(400).json({ error: '参数缺失：uniqueId / phone / provider' })
  }

  const user = await prisma.user.findUnique({
    where: { uniqueId }
  })

  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }

  const existing = await prisma.authBinding.findFirst({
    where: {
      provider,
      phone
    }
  })

  if (existing) {
    return res.status(400).json({ error: '该手机号已绑定其他账号' })
  }

  await prisma.authBinding.create({
    data: {
      userId: uniqueId,
      provider,
      phone,
      externalId: '',
      bindingType: 'converted',
      metadata: {},
      createdAt: new Date()
    }
  })

  res.json({ success: true, message: '手机号绑定成功' })
})

module.exports = router