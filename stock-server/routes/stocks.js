const express = require('express')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const { fetchAndCacheDetail } = require('../services/stockService')
const { fetchKlineData } = require('../services/klineService')
const { fetchNews } = require('../services/newsService')


// ✅ 行业分类接口：/api/stocks/industry/:name
router.get('/industry/:name', (req, res) => {
  const file = path.join(__dirname, '../cache/industry', `${req.params.name}.json`)
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'invalid industry' })
  res.json(JSON.parse(fs.readFileSync(file)))
})

// ✅ 热门推荐榜接口：/api/stocks/hot
router.get('/hot', (req, res) => {
  const file = path.join(__dirname, '../cache/hot.json')
  res.json(JSON.parse(fs.readFileSync(file)))
})

// ✅ 全量快照接口：/api/stocks
router.get('/', (req, res) => {
  const version = req.query.version
  const file = path.join(__dirname, '../cache/stock_cache.json')
  const data = JSON.parse(fs.readFileSync(file))
  if (data.version === version) return res.json({ updated: false })
  res.json({ updated: true, ...data })
})

// ✅ 股票详情接口：/api/stocks/:code/detail
router.get('/:code/detail', async (req, res) => {
    try {
      const result = await fetchAndCacheDetail(req.params.code)
      res.json(result)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

// ✅ K线图接口：/api/stocks/:code/kline
router.get('/:code/kline', async (req, res) => {
    const { code } = req.params
    const { period = 'day', range = '1y' } = req.query
    try {
      const result = await fetchKlineData(code, period, range)
      res.json(result)
    } catch (err) {
      res.status(500).json({ error: 'K线图获取失败', detail: err.message })
    }
  })
  
// ✅ 新闻接口：/api/stocks/:code/news
router.get('/:code/news', async (req, res) => {
    try {
        const result = await fetchNews(req.params.code)
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: '新闻获取失败', detail: err.message })
    }
})
  

module.exports = router
