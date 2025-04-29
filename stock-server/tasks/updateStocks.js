// 新版：自动抓取股票行情并生成快照 + 按行业拆分 + 热门榜单

// 引入定时任务调度、网络请求、编码转换、文件系统等依赖
const cron = require('node-cron')
const axios = require('axios')
const iconv = require('iconv-lite')
const fs = require('fs')
const path = require('path')
const appConfig = require('../config/appConfig')

// 引入缓存写入工具和全行业股票映射表
const { updateCache } = require('../cache/cacheManager')
const symbolsAll = require('../config/industry/symbols_all')
// 引入股票新闻提取器
const { getStockNews } = require('../services/stockNewsExtractor')

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

// ⬇️ 生成当前版本号（北京时间戳）
function getVersion() {
  const now = new Date()
  // 调整为北京时间 (UTC+8)
  now.setHours(now.getHours() + 8)
  
  // 手动格式化为 YYYY-MM-DD-HH-mm 格式
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const hours = String(now.getUTCHours()).padStart(2, '0')
  const minutes = String(now.getUTCMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}-${hours}-${minutes}`
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

// ⬇️ 更新热门股票的新闻 - 如果功能已启用
async function updateStockNews() {
  if (!appConfig.features.enableNewsFeature) {
    console.log('[新闻更新] ❌ 新闻功能已禁用，跳过更新');
    return;
  }
  
  try {
    // 读取热门股票列表
    const hotFile = path.join(__dirname, '../cache/hot.json')
    if (!fs.existsSync(hotFile)) {
      console.log('[新闻更新] ❓ 热门股票文件不存在，等待下次行情更新后再尝试')
      return
    }
    
    const hotStocks = JSON.parse(fs.readFileSync(hotFile, 'utf8')).data
    console.log(`[新闻更新] 🔍 开始获取${hotStocks.length}只热门股票的新闻...`)
    
    // 对每只热门股票获取新闻，并添加适当的延迟避免请求过于频繁
    for (let i = 0; i < hotStocks.length; i++) {
      const stock = hotStocks[i]
      try {
        console.log(`[新闻更新] 📰 正在获取 ${stock.code} ${stock.name} 的新闻 (${i+1}/${hotStocks.length})`)
        await getStockNews(stock.code, 7, 20) // 获取7天内最多20条新闻
        
        // 添加延迟，避免请求过于频繁
        if (i < hotStocks.length - 1) {
          const delay = 3000 + Math.random() * 2000
          console.log(`[新闻更新] ⏱️ 等待${Math.round(delay/1000)}秒后继续下一只股票...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        console.error(`[新闻更新] ❌ 获取${stock.code}新闻失败: ${error.message}`)
        // 继续处理下一只股票
      }
    }
    
    console.log('[新闻更新] ✅ 所有热门股票新闻更新完成')
  } catch (error) {
    console.error('[新闻更新] ❌ 更新股票新闻出错:', error.message)
  }
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

// ⬇️ 启动定时任务
function startUpdateJob() {
  console.log('[定时器] 🔁 每10分钟拉一次股票行情');
  cron.schedule(appConfig.schedule.stockUpdateInterval, updateNow);
  updateNow(); // 启动时立即拉一次

  // 根据配置决定是否启用新闻更新定时任务
  if (appConfig.features.enableNewsScheduledUpdate && appConfig.features.enableNewsFeature) {
    console.log('[定时器] 🔁 每天午夜12点更新一次热门股票新闻');
    cron.schedule(appConfig.schedule.newsUpdateCron, updateStockNews);
    
    // 启动时也执行一次新闻获取，但延迟30秒等待行情更新完成
    console.log('[定时器] ⏱️ 30秒后开始首次热门股票新闻更新');
    setTimeout(updateStockNews, 30000);
  } else {
    console.log('[定时器] ❌ 新闻定时更新已禁用');
  }
}

module.exports = startUpdateJob
