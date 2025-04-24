/**
 * K线数据服务模块
 * - 支持从新浪拉取 K 线数据（CSV 格式或结构化模拟）
 * - 缓存路径：/cache/kline/:code-day-1y.json
 * - 支持 period 和 range 参数（默认仅模拟 day + 1y）
 */

const fs = require('fs')
const path = require('path')

/**
 * 获取 K 线数据（当前使用模拟数据）
 * @param {string} code 股票代码
 * @param {string} period day/week/month
 * @param {string} range 数据区间，如 1y
 * @returns {Promise<object>} 返回 K 线结构
 */
async function fetchKlineData(code, period = 'day', range = '1y') {
  const file = path.join(__dirname, '../cache/kline', `${code}-${period}-${range}.json`)
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  }

  const now = new Date()
  const mockData = Array.from({ length: 60 }).map((_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const date = d.toISOString().split('T')[0]
    const open = 1800 + Math.random() * 50
    const close = open + (Math.random() - 0.5) * 20
    const high = Math.max(open, close) + Math.random() * 10
    const low = Math.min(open, close) - Math.random() * 10
    const volume = Math.floor(Math.random() * 500000)
    return [date, open, close, low, high, volume]
  }).reverse()

  const result = {
    code,
    period,
    range,
    data: mockData
  }

  fs.mkdirSync(path.join(__dirname, '../cache/kline'), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(result, null, 2))
  return result
}

module.exports = { fetchKlineData }