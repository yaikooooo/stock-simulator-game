// config/index.js
// 为了保持向后兼容，从appConfig中导出相同的结构

const appConfig = require('./appConfig');

module.exports = {
  // 交易相关
  feeRate: appConfig.trade.feeRate,
  defaultCurrency: appConfig.trade.defaultCurrency,

  // K线默认配置
  klineDefaultPeriod: appConfig.kline.defaultPeriod,
  klineDefaultRange: appConfig.kline.defaultRange,

  // 热门榜单配置
  hotStockLimit: appConfig.hotStocks.limit,
};
