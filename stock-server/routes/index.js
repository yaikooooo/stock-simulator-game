// routes/index.js - 统一注册所有路由
const express = require('express');
const router = express.Router();

// 导入各个路由模块
const stocksRouter = require('./stocks');
const tradeRouter = require('./trade');
const accountRouter = require('./account');
const authRouter = require('./auth');
const userRouter = require('./user');
const appConfig = require('../config/appConfig');

// 注册路由
router.use('/stocks', stocksRouter);
router.use('/trade', tradeRouter);
router.use('/account', accountRouter);
router.use('/auth', authRouter);
router.use('/user', userRouter);

// 如果AI聊天功能启用，添加AI聊天路由
if (appConfig.features && appConfig.features.enableAIChatFeature) {
  const aiChatRouter = require('./aiChat');
  router.use('/ai-chat', aiChatRouter);
  console.log('[路由] ✅ AI聊天接口已启用');
} else {
  console.log('[路由] ❌ AI聊天接口已禁用');
}

// 如果买涨买跌游戏功能启用，添加battle路由
if (appConfig.features && appConfig.features.enableBattleGame) {
  const battleRouter = require('./battle');
  router.use('/battle', battleRouter);
  console.log('[路由] ✅ 买涨买跌游戏接口已启用');
} else {
  console.log('[路由] ❌ 买涨买跌游戏接口已禁用');
}

module.exports = router; 