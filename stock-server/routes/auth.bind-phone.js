const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const mergeAccounts = require('../services/userMergeService')

router.post('/bind_phone', async (req, res) => {
  const { userId, phone, provider, metadata } = req.body

  if (!userId || !phone || !provider) {
    return res.status(400).json({ error: '参数缺失：userId / phone / provider' })
  }

  try {
    // ✅ 直接使用传入的 userId，不查 User 表

    // ✅ 查手机号是否绑定在其他账号
    const existingPhoneBinding = await prisma.authBinding.findFirst({
      where: {
        phone,
        userId: { not: userId }
      }
    })

    if (existingPhoneBinding) {
      // ✅ 执行合并：把当前账号合并到已有手机号绑定的主账号
      await mergeAccounts(existingPhoneBinding.userId, userId)

      // ✅ 合并后，更新当前 userId 的 register 记录成绑定渠道
      await prisma.authBinding.updateMany({
        where: {
          userId: existingPhoneBinding.userId,
          provider: 'register'
        },
        data: {
          provider,
          phone,
          externalId: phone,
          bindingType: 'converted',
          metadata: metadata || {}
        }
      })

      return res.json({
        success: true,
        message: '手机号已绑定其他账号，已自动合并',
        mergedTo: existingPhoneBinding.userId
      })
    }

    // ✅ 查当前账号是否已绑定当前渠道
    const hasSameChannel = await prisma.authBinding.findFirst({
      where: {
        userId: userId,
        provider
      }
    })

    if (hasSameChannel) {
      return res.status(400).json({ error: `该账号已绑定 ${provider} 渠道` })
    }

    // ✅ 正常首次绑定，更新 register 记录
    const registerBinding = await prisma.authBinding.findFirst({
      where: {
        userId: userId,
        provider: 'register'
      }
    })

    if (registerBinding) {
      await prisma.authBinding.update({
        where: { id: registerBinding.id },
        data: {
          provider,
          phone,
          externalId: phone,
          bindingType: 'converted',
          metadata: metadata || {}
        }
      })

      return res.json({
        success: true,
        message: '首次绑定成功（已更新 register 渠道）',
        userId: userId
      })
    }

    // ✅ fallback：新建绑定记录
    await prisma.authBinding.create({
      data: {
        userId: userId,
        provider,
        phone,
        externalId: phone,
        bindingType: 'converted',
        metadata: metadata || {}
      }
    })

    return res.json({
      success: true,
      message: '绑定成功（新建记录）',
      userId: userId
    })

  } catch (e) {
    console.error('绑定手机号失败:', e)
    return res.status(500).json({ error: '绑定失败', detail: e.message })
  }
})

module.exports = router