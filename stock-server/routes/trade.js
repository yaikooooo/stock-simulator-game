// routes/trade.js
const express = require('express')
const router = express.Router()
const tradeController = require('../controllers/tradeController')

// 买入
router.post('/buy', tradeController.buyStock)

// 卖出
router.post('/sell', tradeController.sellStock)

// 查询交易记录
router.get('/history', tradeController.getTradeHistory)

module.exports = router
