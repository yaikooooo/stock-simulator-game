/**
 * 股票详情服务模块
 * 
 * 提供接口 `/api/stocks/:code/detail` 所使用的核心业务逻辑。
 * 
 * 功能：
 * - 判断某支股票是否已有 10 分钟内的本地快照；
 * - 如果无，则实时抓取新浪股票详情接口；
 * - 对原始响应进行解码（GBK）并格式化字段；
 * - 写入本地缓存目录 /cache/detail/:code.json；
 * - 返回统一结构：{ version, data: {...} }
 * 
 * 依赖：axios（请求）、iconv-lite（GBK 解码）
 */

const fs = require('fs')
const path = require('path')
const axios = require('axios')
const iconv = require('iconv-lite')
const cache = require('../cache/stock_cache.json')
/**
 * 判断一个版本时间戳是否在 10 分钟以内
 * @param {string} version 形如 "2025-04-23-14:20"
 * @returns {boolean}
 */
function isRecent(version) {
  const last = new Date(version.replace('-', 'T'))
  return Date.now() - last.getTime() < 10 * 60 * 1000
}

/**
 * 获取单支股票详情数据（缓存或拉新浪），并写入本地
 * @param {string} code 股票代码（如 "sh600519"）
 * @returns {Promise<{version: string, data: object}>}
 */
async function fetchAndCacheDetail(code) {
  const filePath = path.join(__dirname, '../cache/detail', `${code}.json`)

  // ✅ 如果缓存存在，且在10分钟内，直接返回
  if (fs.existsSync(filePath)) {
    const cached = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    if (cached.version && isRecent(cached.version)) return cached
  }

  // ✅ 拉取新浪股票接口（单支）
  const url = `https://hq.sinajs.cn/list=${code}`
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      Referer: 'https://finance.sina.com.cn',
      'User-Agent': 'Mozilla/5.0'
    }
  })

  // 解码 GBK 内容
  const decoded = iconv.decode(response.data, 'gbk')
  const raw = decoded.split('="')[1]?.split(',') || []

  // 构造详情结构
  const detail = {
    code,
    name: raw[0] || '未知',
    price: parseFloat(raw[3] || '0'),
    change: (parseFloat(raw[3]) - parseFloat(raw[2] || '0')).toFixed(2),
    open: parseFloat(raw[1] || '0'),
    previousClose: parseFloat(raw[2] || '0'),
    high: parseFloat(raw[4] || '0'),
    low: parseFloat(raw[5] || '0'),
    volume: parseInt(raw[8] || '0'),
    amount: parseFloat(raw[9] || '0'),
    time: raw[30] || '',
    news: [] // 🔮 为 AI 新闻/分析预留
  }

  const version = new Date().toISOString().slice(0, 16).replace('T', '-')
  const result = { version, data: detail }

  // ✅ 写入缓存文件（自动创建文件夹）
  fs.mkdirSync(path.join(__dirname, '../cache/detail'), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2))

  return result
}


function getSnapshotByCode(code) {
    return cache.data.find(item => item.code === code)
  }
  
  module.exports = {
    getSnapshotByCode,
    fetchAndCacheDetail
  }

