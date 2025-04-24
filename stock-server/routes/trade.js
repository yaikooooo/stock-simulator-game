// routes/trade.js
const express = require('express')
const router = express.Router()
const { buy, sell } = require('../services/tradeService')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 买入
router.post('/buy', async (req, res) => {
  const { userId, code, name, amount } = req.body

  if (!userId || !code || !amount) {
    return res.status(400).json({ error: '参数缺失' })
  }

  try {
    const result = await buy(userId, code, name, amount)
    res.json({ success: true, data: result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 卖出
router.post('/sell', async (req, res) => {
    const { userId, code, name, amount } = req.body
    if (!userId || !code || !amount) {
      return res.status(400).json({ error: '参数缺失' })
    }
    try {
      const result = await sell(userId, code, name, amount)
      res.json({ success: true, data: result })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })
  
  // 查询交易记录（可选分页）
  router.get('/history', async (req, res) => {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: '缺少 userId' })
  
    const history = await prisma.trade.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    res.json({ success: true, data: history })
  })


module.exports = router
