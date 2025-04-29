// controllers/authController.js - 认证相关业务逻辑
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mergeAccounts = require('../services/userMergeService');

// 生成唯一ID
function generateUniqueId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// 注册控制器
async function register(req, res) {
  const { externalId } = req.body;
  console.log(`📊 externalId：${externalId}`);
  if (!externalId) {
    return res.status(400).json({ error: '缺少 externalId（如 openId）' });
  }

  // 检查是否已注册
  const existing = await prisma.authBinding.findUnique({
    where: {
      externalId_provider: {
        externalId,
        provider: 'register'
      }
    }
  });
  
  if (existing) {
    return res.status(200).json({
      success: false,
      code: 'ALREADY_REGISTERED',
      message: '该 openId 已注册',
      userId: existing.userId
    });
  }
  
  // 生成唯一ID
  let uniqueId;
  while (true) {
    const candidate = generateUniqueId();
    const exists = await prisma.user.findUnique({ where: { uniqueId: candidate } });
    if (!exists) {
      uniqueId = candidate;
      break;
    }
  }

  // 创建用户
  const user = await prisma.user.create({
    data: {
      uniqueId,
      nickname: externalId,
      avatar: ''
    }
  });
  
  // 创建账户
  await prisma.account.create({
    data: {
      userId: user.id,
      balanceCNY: 100000,
      balanceUSD: 0,
      balanceEUR: 0,
      totalValue: 100000
    }
  });
  
  // 创建绑定记录
  await prisma.authBinding.create({
    data: {
      userId: user.id,
      provider: 'register',
      externalId,
      phone: '',
      bindingType: 'auth',
      metadata: {}
    }
  });

  res.json({ success: true, uniqueId: uniqueId, userId: user.id });
}

// 绑定手机号控制器
async function bindPhone(req, res) {
  const { userId, phone, provider, metadata } = req.body;

  if (!userId || !phone || !provider) {
    return res.status(400).json({ error: '参数缺失：userId / phone / provider' });
  }

  try {
    // 查手机号是否绑定在其他账号
    const existingPhoneBinding = await prisma.authBinding.findFirst({
      where: {
        phone,
        userId: { not: userId }
      }
    });

    if (existingPhoneBinding) {
      // 执行合并
      await mergeAccounts(existingPhoneBinding.userId, userId);

      // 更新绑定记录
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
      });

      return res.json({
        success: true,
        message: '手机号已绑定其他账号，已自动合并',
        mergedTo: existingPhoneBinding.userId
      });
    }

    // 查当前账号是否已绑定当前渠道
    const hasSameChannel = await prisma.authBinding.findFirst({
      where: {
        userId: userId,
        provider
      }
    });

    if (hasSameChannel) {
      return res.status(400).json({ error: `该账号已绑定 ${provider} 渠道` });
    }

    // 正常首次绑定
    const registerBinding = await prisma.authBinding.findFirst({
      where: {
        userId: userId,
        provider: 'register'
      }
    });

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
      });

      return res.json({
        success: true,
        message: '首次绑定成功（已更新 register 渠道）',
        userId: userId
      });
    }

    // 新建绑定记录
    await prisma.authBinding.create({
      data: {
        userId: userId,
        provider,
        phone,
        externalId: phone,
        bindingType: 'converted',
        metadata: metadata || {}
      }
    });

    return res.json({
      success: true,
      message: '绑定成功（新建记录）',
      userId: userId
    });

  } catch (e) {
    console.error('绑定手机号失败:', e);
    return res.status(500).json({ error: '绑定失败', detail: e.message });
  }
}

module.exports = {
  register,
  bindPhone
}; 