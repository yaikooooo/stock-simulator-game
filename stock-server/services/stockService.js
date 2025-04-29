/**
 * 股票详情服务模块
 * 
 * 提供接口 `/api/stocks/:code/detail` 所使用的核心业务逻辑。
 * 
 * 功能：
 * - 从新浪API获取股票详情数据
 * - 对原始响应进行解码（GBK）并格式化字段
 * - 写入本地缓存目录 /cache/detail/:code.json
 * - 返回统一结构：{ version, data: {...} }
 * 
 * 依赖：axios（请求）、iconv-lite（GBK 解码）
 */

const fs = require('fs')
const path = require('path')
const axios = require('axios')
const iconv = require('iconv-lite')

// 直接引用缓存数据
let stockCache = { data: [] };
try {
  stockCache = require('../cache/stock_cache.json');
} catch (e) {
  console.warn('[详情] 警告: 无法加载股票缓存，将使用空数据');
}

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
 * 从股票缓存中获取股票快照数据
 * @param {string} code 股票代码
 * @returns {object|null} 股票快照数据
 */
function getSnapshotByCode(code) {
  try {
    if (!stockCache || !Array.isArray(stockCache.data)) {
      console.warn('[详情] 警告: 股票缓存数据无效')
      return null
    }
    
    return stockCache.data.find(item => 
      item.code && item.code.toUpperCase() === code.toUpperCase()
    )
  } catch (error) {
    console.error(`[详情] 获取快照失败: ${error.message}`)
    return null
  }
}

/**
 * 获取单支股票详情数据（优先从新浪API获取）
 * @param {string} code 股票代码（如 "sh600519"）
 * @returns {Promise<{version: string, data: object}>}
 */
async function fetchAndCacheDetail(code) {
  try {
    const filePath = path.join(__dirname, '../cache/detail', `${code}.json`)

    // 如果缓存存在，且在10分钟内，直接返回
    if (fs.existsSync(filePath)) {
      const cached = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      if (cached.version && isRecent(cached.version)) {
        console.log(`[详情] 使用10分钟内有效缓存: ${code}`)
        return cached
      }
      console.log(`[详情] 缓存已过期(${cached.version})，重新获取: ${code}`)
    }

    // 尝试多个API端点获取数据
    console.log(`[详情] 开始尝试多个API获取股票详情: ${code}`)
    
    // 尝试方法1: 新浪标准API
    try {
      console.log(`[详情] 尝试方法1 - 新浪标准API`)
      return await fetchFromSinaAPI1(code);
    } catch (err1) {
      console.log(`[详情] 方法1失败: ${err1.message}`)
      
      // 尝试方法2: 新浪备用API
      try {
        console.log(`[详情] 尝试方法2 - 新浪备用API`)
        return await fetchFromSinaAPI2(code);
      } catch (err2) {
        console.log(`[详情] 方法2失败: ${err2.message}`)
        
        // 尝试方法3: 腾讯API
        try {
          console.log(`[详情] 尝试方法3 - 腾讯API`)
          return await fetchFromTencentAPI(code);
        } catch (err3) {
          console.log(`[详情] 方法3失败: ${err3.message}`)
          
          // 所有API方法都失败，尝试从K线数据
          console.log(`[详情] 所有API获取失败，尝试从K线构建`)
          return await fetchFromKline(code);
        }
      }
    }
  } catch (error) {
    console.error(`[详情] 所有获取方法都失败: ${error.message}`)
    throw error
  }
}

/**
 * 方法1: 从新浪标准API获取股票详情
 * @param {string} code 股票代码
 * @returns {Promise<{version: string, data: object}>}
 */
async function fetchFromSinaAPI1(code) {
  const sinaCode = code.toUpperCase()
  console.log(`[详情] 从新浪标准API获取: ${sinaCode}`)
  const url = `https://hq.sinajs.cn/list=${sinaCode}`
  
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'Referer': 'https://finance.sina.com.cn',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache'
    },
    timeout: 8000
  })

  // 解码 GBK 内容
  const decoded = iconv.decode(response.data, 'gbk')
  console.log(`[详情] 新浪标准API响应: ${decoded}`)

  // 检查响应是否有效
  if (decoded.includes('<script>location.href') || decoded.includes('<script>window.location.href')) {
    throw new Error('新浪API返回了重定向脚本')
  }

  if (!decoded.includes('=')) {
    throw new Error('新浪API响应格式异常')
  }

  // 处理数据
  const dataStr = decoded.split('=')[1]
  if (!dataStr || dataStr.trim() === '""' || dataStr.trim() === '";') {
    throw new Error('新浪API返回了空数据')
  }

  // 解析股票数据
  const raw = dataStr.replace(/^"/, '').replace(/";\s*$/, '').split(',')
  console.log(`[详情] 提取字段数: ${raw.length}`)

  if (raw.length < 10) {
    throw new Error(`股票数据字段不完整: 期望至少10个字段，实际获得${raw.length}个`)
  }

  // 构造详情结构
  const detail = {
    code: sinaCode,
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
    news: [],
    source: 'sina_standard'
  }

  // 验证数据
  if (!detail.name || detail.name === '未知' || isNaN(detail.price) || detail.price === 0) {
    throw new Error('获取的股票数据无效')
  }

  // 处理结果
  return saveAndReturnResult(code, detail);
}

/**
 * 方法2: 从新浪备用API获取股票详情
 * @param {string} code 股票代码
 * @returns {Promise<{version: string, data: object}>}
 */
async function fetchFromSinaAPI2(code) {
  const sinaCode = code.toUpperCase().replace('SH', 'sh').replace('SZ', 'sz')
  console.log(`[详情] 从新浪备用API获取: ${sinaCode}`)
  const url = `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${sinaCode}&scale=5&ma=5&datalen=1`
  
  const response = await axios.get(url, {
    headers: {
      'Referer': 'https://finance.sina.com.cn/stock/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    },
    timeout: 8000
  })

  console.log(`[详情] 新浪备用API响应: ${JSON.stringify(response.data)}`)

  // 检查响应是否有效
  if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
    throw new Error('新浪备用API返回了无效数据')
  }

  // 获取最新数据
  const latestData = response.data[0];
  
  // 获取股票名称（从缓存）
  let stockName = code;
  const stockInfo = getSnapshotByCode(code);
  if (stockInfo && stockInfo.name) {
    stockName = stockInfo.name;
  }
  if (code.includes('600519')) {
    stockName = '贵州茅台';
  }

  // 构造详情结构
  const detail = {
    code: code.toUpperCase(),
    name: stockName,
    price: parseFloat(latestData.close || '0'),
    change: (parseFloat(latestData.close) - parseFloat(latestData.open || '0')).toFixed(2),
    open: parseFloat(latestData.open || '0'),
    previousClose: parseFloat(latestData.open || '0'), // 近似
    high: parseFloat(latestData.high || '0'),
    low: parseFloat(latestData.low || '0'),
    volume: parseInt(latestData.volume || '0'),
    amount: 0,
    time: latestData.day || '',
    news: [],
    source: 'sina_backup'
  }

  // 处理结果
  return saveAndReturnResult(code, detail);
}

/**
 * 方法3: 从腾讯API获取股票详情
 * @param {string} code 股票代码
 * @returns {Promise<{version: string, data: object}>}
 */
async function fetchFromTencentAPI(code) {
  // 转换代码格式
  const txCode = code.toUpperCase()
    .replace('SH', 'sh')
    .replace('SZ', 'sz');
  
  console.log(`[详情] 从腾讯API获取: ${txCode}`)
  const url = `https://qt.gtimg.cn/q=${txCode}`
  
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'Referer': 'https://finance.qq.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    },
    timeout: 8000
  })

  // 解码GBK内容
  const decoded = iconv.decode(response.data, 'gbk')
  console.log(`[详情] 腾讯API响应: ${decoded}`)

  // 检查响应是否有效
  if (!decoded.includes('=') || decoded.includes('v_pv_none')) {
    throw new Error('腾讯API返回了无效数据')
  }

  // 解析数据 - 腾讯格式: v_sh600519="1~贵州茅台~600519~1550.00~1557.10~1550.00~"
  const parts = decoded.split('=')
  if (parts.length < 2 || !parts[1].trim()) {
    throw new Error('腾讯API数据格式异常')
  }

  const dataStr = parts[1].replace(/^"/, '').replace(/";\s*$/, '')
  const fields = dataStr.split('~')
  
  if (fields.length < 5) {
    throw new Error('腾讯API数据字段不足')
  }

  // 构造详情
  const detail = {
    code: code.toUpperCase(),
    name: fields[1] || '未知',
    price: parseFloat(fields[3] || '0'),
    change: (parseFloat(fields[3]) - parseFloat(fields[4] || '0')).toFixed(2),
    open: parseFloat(fields[5] || '0'),
    previousClose: parseFloat(fields[4] || '0'),
    high: parseFloat(fields[33] || fields[3] || '0'),
    low: parseFloat(fields[34] || fields[3] || '0'),
    volume: parseInt(fields[36] || '0'),
    amount: parseFloat(fields[37] || '0'),
    time: new Date().toISOString().split('T')[0],
    news: [],
    source: 'tencent'
  }

  // 验证数据
  if (!detail.name || detail.name === '未知' || isNaN(detail.price) || detail.price === 0) {
    throw new Error('腾讯API获取的股票数据无效')
  }

  // 处理结果
  return saveAndReturnResult(code, detail);
}

/**
 * 从K线数据获取股票详情
 * @param {string} code 股票代码
 * @returns {Promise<{version: string, data: object}>}
 */
async function fetchFromKline(code) {
  const sinaCode = code.toUpperCase()
  console.log(`[详情] 尝试从K线数据生成详情: ${sinaCode}`)
  const klineDir = path.join(__dirname, '../cache/kline', sinaCode)
  const klineFile = path.join(klineDir, 'day-1y.json')
  
  if (!fs.existsSync(klineFile)) {
    throw new Error(`找不到K线数据文件: ${klineFile}`)
  }
  
  const klineData = JSON.parse(fs.readFileSync(klineFile, 'utf8'))
  if (!klineData || !klineData.data || klineData.data.length === 0) {
    throw new Error('K线数据无效或为空')
  }
  
  // 获取最新的K线数据点
  const latestData = klineData.data[klineData.data.length - 1]
  
  // 获取股票名称（优先从缓存中获取）
  let stockName = sinaCode
  const stockInfo = getSnapshotByCode(sinaCode)
  if (stockInfo && stockInfo.name) {
    stockName = stockInfo.name
  }
  
  if (sinaCode === 'SH600519' && stockName === sinaCode) {
    stockName = '贵州茅台' // 硬编码特例
  }
  
  // 根据K线数据构建详情
  const detail = {
    code: sinaCode,
    name: stockName,
    price: parseFloat(latestData[4]), // 收盘价
    change: (parseFloat(latestData[4]) - parseFloat(latestData[1])).toFixed(2), // 收盘价-开盘价
    open: parseFloat(latestData[1]), // 开盘价
    previousClose: parseFloat(latestData[1]), // 假设前收盘价为开盘价
    high: parseFloat(latestData[2]), // 最高价
    low: parseFloat(latestData[3]), // 最低价
    volume: parseInt(latestData[5]), // 成交量
    amount: 0, // K线数据中无此信息
    time: latestData[0], // 日期
    news: [],
    source: 'kline' // 标记数据来源为K线
  }
  
  // 处理结果
  return saveAndReturnResult(code, detail);
}

/**
 * 保存详情到缓存并返回结果
 * @param {string} code 股票代码
 * @param {object} detail 股票详情
 * @returns {Promise<{version: string, data: object}>}
 */
function saveAndReturnResult(code, detail) {
  // 获取北京时间
  const now = new Date();
  now.setHours(now.getHours() + 8); // UTC+8
  
  // 格式化版本号
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  
  const version = `${year}-${month}-${day}-${hours}-${minutes}`;
  const result = { version, data: detail };
  
  // 写入缓存
  const filePath = path.join(__dirname, '../cache/detail', `${code}.json`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
  console.log(`[详情] 已生成详情并缓存: ${code}, 数据源: ${detail.source}, 版本: ${version}`);
  
  return result;
}

module.exports = {
  fetchAndCacheDetail,
  getSnapshotByCode
}

