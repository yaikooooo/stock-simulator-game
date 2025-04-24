
// config/index.js
// 所有全局参数、常量配置集中管理

module.exports = {
  // 交易相关
  feeRate: 0.0025,              // 手续费千分比（例如 0.0025 即为 0.25%）
  defaultCurrency: 'CNY',       // 默认货币（人民币）

  // K线默认配置
  klineDefaultPeriod: '1d',
  klineDefaultRange: '1y',

  // 热门榜单配置
  hotStockLimit: 20,            // 首页推荐最多展示的热门股票数
}
