const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const stocksController = require('../controllers/stocksController')
const appConfig = require('../config/appConfig')

// ✅ 行业分类接口：/api/stocks/industry/:name
router.get('/industry/:name', stocksController.getIndustryStocks)

// ✅ 热门推荐榜接口：/api/stocks/hot
router.get('/hot', stocksController.getHotStocks)

// ✅ 全量快照接口：/api/stocks
router.get('/', stocksController.getAllStocks)

// ✅ 股票详情接口：/api/stocks/:code/detail
router.get('/:code/detail', stocksController.getStockDetail)

// ✅ K线图接口：/api/stocks/:code/kline
router.get('/:code/kline', stocksController.getStockKline)

// ✅ 新闻接口：/api/stocks/:code/news
if (appConfig.features.enableNewsFeature) {
  router.get('/:code/news', stocksController.getStockNewsController)
  console.log('[路由] ✅ 股票新闻接口已启用')
} else {
  console.log('[路由] ❌ 股票新闻接口已禁用')
}

module.exports = router
