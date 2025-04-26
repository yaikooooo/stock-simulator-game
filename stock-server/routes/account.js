// routes/account.js
const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * 查询账户基本信息（支持传 id 或 uniqueId）
 * GET /api/account?userId=xxxx
 */
router.get('/', async (req, res) => {
  const { userId } = req.query

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { uniqueId: userId }
        ]
      }
    })
    if (!user) return res.status(404).json({ error: '用户不存在' })

    const account = await prisma.account.findFirst({
      where: { userId: user.id }
    })

    if (!account) return res.status(404).json({ error: '账户不存在' })

    res.json({ success: true, data: account })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/**
 * 查询账户持仓信息（GET /api/account/holdings?userId=xxxx）
 */
router.get('/holdings', async (req, res) => {
  const { userId } = req.query

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { uniqueId: userId }
        ]
      }
    })

    if (!user) return res.status(404).json({ error: '用户不存在' })

    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' }
    })

    res.json({ success: true, data: holdings })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

/**
 * 查询账户交易记录（GET /api/account/trades?userId=xxxx）
 */
router.get('/trades', async (req, res) => {
  const { userId } = req.query

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { uniqueId: userId }
        ]
      }
    })

    if (!user) return res.status(404).json({ error: '用户不存在' })

    const trades = await prisma.trade.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ success: true, data: trades })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router