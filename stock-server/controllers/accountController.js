const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 获取账户信息
async function getAccountInfo(req, res) {
  const { userId } = req.query;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { uniqueId: userId }
        ]
      }
    });
    
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const account = await prisma.account.findFirst({
      where: { userId: user.id }
    });

    if (!account) return res.status(404).json({ error: '账户不存在' });

    res.json({ success: true, data: account });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// 获取持仓信息
async function getAccountHoldings(req, res) {
  const { userId } = req.query;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { uniqueId: userId }
        ]
      }
    });

    if (!user) return res.status(404).json({ error: '用户不存在' });

    const holdings = await prisma.holding.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ success: true, data: holdings });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// 获取交易记录
async function getAccountTrades(req, res) {
  const { userId } = req.query;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { uniqueId: userId }
        ]
      }
    });

    if (!user) return res.status(404).json({ error: '用户不存在' });

    const trades = await prisma.trade.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: trades });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = {
  getAccountInfo,
  getAccountHoldings,
  getAccountTrades
}; 