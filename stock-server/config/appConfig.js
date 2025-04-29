/**
 * 应用全局配置
 * 所有全局参数、常量配置集中管理
 */
const appConfig = {
  // 功能开关
  features: {
    // 新闻功能开关
    enableNewsFeature: false,
    
    // 定时任务开关
    enableScheduledTasks: true,
    
    // 新闻定时更新开关
    enableNewsScheduledUpdate: false,
    
    // AI聊天功能开关
    enableAIChatFeature: true,
    
    // T+1交易限制开关（真实A股规则）
    enableT1TradingRule: true,
    
    // 买涨买跌游戏功能开关
    enableBattleGame: true,
    
    // 其他可能的功能开关
    enableLogging: true,
    enableCaching: true
  },
  
  // 定时任务配置
  schedule: {
    stockUpdateInterval: '*/10 * * * *', // 每10分钟
    newsUpdateCron: '0 0 * * *'  // 每天0点
  },
  
  // 缓存配置
  cache: {
    stockCacheTTL: 4,  // 股票缓存有效期(小时)
    newsCacheTTL: 24   // 新闻缓存有效期(小时)
  },
  
  // 交易相关
  trade: {
    feeRate: 0.0025,              // 手续费千分比（例如 0.0025 即为 0.25%）
    defaultCurrency: 'CNY',       // 默认货币（人民币）
  },

  // K线配置
  kline: {
    defaultPeriod: '1d',
    defaultRange: '1y',
  },

  // 热门榜单配置
  hotStocks: {
    limit: 20,            // 首页推荐最多展示的热门股票数
  }
};

module.exports = appConfig; 