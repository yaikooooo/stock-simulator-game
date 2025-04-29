/**
 * 买涨买跌游戏配置
 */
const battleConfig = {
  // 功能开关
  enabled: true,
  
  // 奖励倍数 (赢了获得下注金额 × rewardMultiplier)
  rewardMultiplier: 1.8,
  
  // 最低下注金额
  minBetAmount: 100,
  
  // 最高下注金额
  maxBetAmount: 10000,
  
  // 可选持有时间（分钟）
  availableHoldMinutes: [5, 10, 30, 60, 120, 240],
  
  // 批处理大小
  batchSize: 5000,
  
  // 结算定时任务执行频率 (cron 表达式)
  settlementCron: '* * * * *', // 每分钟执行一次
};

module.exports = battleConfig; 