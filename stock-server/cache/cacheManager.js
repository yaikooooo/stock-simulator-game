const fs = require('fs')
const path = './cache/stock_cache.json'

// 内存中缓存对象
let stockCache = {
  version: '',
  data: []
}

// 写入缓存 + 保存 JSON 文件
function updateCache(data) {
  stockCache = {
    version: new Date().toISOString().slice(0, 16).replace('T', '-'),
    data
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

module.exports = { updateCache, getCache, loadCache }
