// routes/account.js
const express = require('express')
const router = express.Router()
const accountController = require('../controllers/accountController')

/**
 * 查询账户基本信息（支持传 id 或 uniqueId）
 * GET /api/account?userId=xxxx
 */
router.get('/', accountController.getAccountInfo)

/**
 * 查询账户持仓信息（GET /api/account/holdings?userId=xxxx）
 */
router.get('/holdings', accountController.getAccountHoldings)

/**
 * 查询账户交易记录（GET /api/account/trades?userId=xxxx）
 */
router.get('/trades', accountController.getAccountTrades)

module.exports = router