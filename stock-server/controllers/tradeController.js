const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { buy, sell } = require('../services/tradeService');

// 买入股票
async function buyStock(req, res) {
  const { userId, code, name, amount } = req.body;

  if (!userId || !code || !amount) {
    return res.status(400).json({ error: '参数缺失' });
  }

  try {
    const result = await buy(userId, code, name, amount);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// 卖出股票
async function sellStock(req, res) {
  const { userId, code, name, amount } = req.body;
  
  if (!userId || !code || !amount) {
    return res.status(400).json({ error: '参数缺失' });
  }
  
  try {
    const result = await sell(userId, code, name, amount);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// 获取交易历史
async function getTradeHistory(req, res) {
  const { userId } = req.query;
  
  if (!userId) return res.status(400).json({ error: '缺少 userId' });

  const history = await prisma.trade.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  
  res.json({ success: true, data: history });
}

module.exports = {
  buyStock,
  sellStock,
  getTradeHistory
}; 