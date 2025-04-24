// routes/account.js
const express = require('express')
const router = express.Router()
const { getAccountByUserId } = require('../services/accountService')

router.get('/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const account = await getAccountByUserId(userId)
    if (!account) return res.status(404).json({ error: '账户不存在' })
    res.json({ success: true, data: account })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
