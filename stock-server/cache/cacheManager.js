const fs = require('fs')
const path = './cache/stock_cache.json'

// 内存中缓存对象
let stockCache = {
  version: '',
  data: []
}

// ⬇️ 生成当前版本号（北京时间戳）
function getBeijingVersion() {
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

// 写入缓存 + 保存 JSON 文件
function updateCache(data) {
  stockCache = {
    version: data.version || getBeijingVersion(),
    data: data.data || data
  }
  fs.writeFileSync(path, JSON.stringify(stockCache, null, 2))
}

// 获取当前缓存
function getCache() {
  return stockCache
}

// 启动时加载上次的缓存
function loadCache() {
  try {
    const raw = fs.readFileSync(path)
    stockCache = JSON.parse(raw)
  } catch {
    console.log('[缓存加载] 空缓存或第一次运行')
  }
}

module.exports = { updateCache, getCache, loadCache, getBeijingVersion }
