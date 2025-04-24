
// stockCache.js
// 股票快照缓存模块：加载一次性缓存，所有接口访问走内存

const fs = require('fs')
const path = require('path')

let cache = {
  version: '',
  data: []
}

// 启动时加载一次 JSON 到内存
function loadCacheFromFile() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, './cache/stock_cache.json'), 'utf-8')
    const json = JSON.parse(raw)
    cache = json
    console.log('[缓存] ✅ 已加载 stock_cache.json 快照，共', json.data.length, '条')
  } catch (e) {
    console.error('[缓存] ❌ 加载失败', e.message)
  }
}

// 提供外部调用读取快照的方法
function getSnapshotByCode(code) {
  return cache.data.find(item => item.code === code)
}

// 提供外部写入新快照的能力（用于定时更新）
function updateCache(newCache) {
  cache = newCache
  console.log('[缓存] ✅ stockCache 已被更新，当前版本：', cache.version)
}

module.exports = {
  loadCacheFromFile,
  getSnapshotByCode,
  updateCache,
}
