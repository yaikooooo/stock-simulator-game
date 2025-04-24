// 新版：自动抓取股票行情并生成快照 + 按行业拆分 + 热门榜单

// 引入定时任务调度、网络请求、编码转换、文件系统等依赖
const cron = require('node-cron')
const axios = require('axios')
const iconv = require('iconv-lite')
const fs = require('fs')
const path = require('path')

// 引入缓存写入工具和全行业股票映射表
const { updateCache } = require('../cache/cacheManager')
const symbolsAll = require('../config/industry/symbols_all')

// 将 symbols_all.js 中的股票全部展开成一个大列表（用于统一拉取行情）
const allStocks = Object.values(symbolsAll).flat()
const symbolCodes = allStocks.map(s => s.code)
// 👇 同时写入 stock_cache.json（磁盘） 和 stockCache.js（内存）
const { updateCache: updateMemoryCache } = require('../stockCache')

// ⬇️ 抓取新浪财经行情数据
async function fetchRealStocks(symbols) {
  const url = `https://hq.sinajs.cn/list=${symbols.join(',')}`
  const res = await axios.get(url, {
    responseType: 'arraybuffer', // 获取原始字节流，防乱码
    headers: {
      'Referer': 'https://finance.sina.com.cn', // 伪造来源防止403
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // 模拟浏览器请求
    }
  })

  const decoded = iconv.decode(res.data, 'gbk') // 新浪返回GBK编码
  const lines = decoded.split('\n')

  // 解析每一行的行情数据（格式为字符串）
  return symbols.map((symbol, i) => {
    const raw = lines[i]?.split('="')[1]?.split(',') || []
    return {
      code: symbol,
      name: raw[0] || '未知',
      price: parseFloat(raw[3] || '0'),
      change: (parseFloat(raw[3]) - parseFloat(raw[2] || '0')).toFixed(2),
    }
  }).filter(item => !isNaN(item.price) && item.name !== '未知') // 过滤无效股票
}

// ⬇️ 生成当前版本号（时间戳）
function getVersion() {
  const now = new Date()
  return now.toISOString().slice(0, 16).replace('T', '-')
}

// ⬇️ 按行业拆分数据并写入到 cache/industry/*.json，并加入 version 字段
function writeIndustryJson(data, version) {
  const grouped = {}
  for (const stock of data) {
    const meta = allStocks.find(s => s.code === stock.code) // 查原始元数据
    const industry = Object.entries(symbolsAll).find(([key, list]) =>
      list.some(item => item.code === stock.code))?.[0] || 'unknown'
    grouped[industry] = grouped[industry] || []
    grouped[industry].push({ ...stock, name: meta?.name || stock.name })
  }

  fs.mkdirSync(path.join(__dirname, '../cache/industry'), { recursive: true })

  for (const [industry, list] of Object.entries(grouped)) {
    const file = path.join(__dirname, '../cache/industry', `${industry}.json`)
    fs.writeFileSync(file, JSON.stringify({ version, data: list }, null, 2))
  }
}

// ⬇️ 从快照中筛出涨幅前20的热门股票，写入 cache/hot.json，并加入 version
function writeHotStocks(data, version) {
  const top = [...data]
    .filter(d => !isNaN(d.price))
    .sort((a, b) => parseFloat(b.change) - parseFloat(a.change)) // 按涨幅降序
    .slice(0, 20)
  fs.writeFileSync(path.join(__dirname, '../cache/hot.json'), JSON.stringify({ version, data: top }, null, 2))
}

// ⬇️ 核心更新流程：抓取行情 → 写入全量缓存 → 写入行业分类 → 写入热门榜
async function updateNow() {
  try {
    const data = await fetchRealStocks(symbolCodes)
    const version = getVersion()
    updateCache({ version, data })  // 写入 stock_cache.json
    writeIndustryJson(data, version)  // 拆分行业 JSON
    writeHotStocks(data, version)     // 热门榜单 JSON
    updateMemoryCache({ version, data })   // ✅ 写入内存缓存
    console.log('[定时器] ✅ 股票快照和缓存已更新')
  } catch (e) {
    console.error('[定时器] ❌ 拉取失败:', e.message)
  }
}

// ⬇️ 启动定时任务，每10分钟执行一次行情更新
function startUpdateJob() {
  console.log('[定时器] 🔁 每10分钟拉一次股票行情')
  cron.schedule('*/10 * * * *', updateNow)
  updateNow() // 启动时立即拉一次
}

module.exports = startUpdateJob
