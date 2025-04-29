/**
 * K线数据服务模块
 * - 支持从新浪拉取 K 线数据
 * - 缓存路径：/cache/kline/:code/:period-:range.json
 */

const fs = require('fs')
const path = require('path')
const axios = require('axios')

/**
 * 获取 K 线数据（从新浪API获取真实数据）
 * @param {string} code 股票代码
 * @param {string} period day/week/month
 * @param {string} range 数据区间，如 1y
 * @returns {Promise<object>} 返回 K 线结构
 */
async function fetchKlineData(code, period = 'day', range = '1y') {
  try {
    // 规范化股票代码为大写
    const stockCode = code.toUpperCase();
    
    // 创建股票专属目录
    const stockDir = path.join(__dirname, '../cache/kline', stockCode);
    if (!fs.existsSync(stockDir)) {
      fs.mkdirSync(stockDir, { recursive: true });
    }
    
    // 缓存文件路径
    const cacheFile = path.join(stockDir, `${period}-${range}.json`);
    
    // 检查缓存是否存在且未过期（7天内的缓存视为有效）
    if (fs.existsSync(cacheFile)) {
      const stats = fs.statSync(cacheFile);
      const cacheAge = Date.now() - stats.mtimeMs;
      const cacheValid = cacheAge < 7 * 24 * 60 * 60 * 1000; // 7天
      
      if (cacheValid) {
        console.log(`[K线缓存] 命中 ${stockCode} ${period}-${range}`);
        return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      }
    }
    
    console.log(`[K线] 从API获取 ${stockCode} ${period}-${range}`);
    
    // 转换参数到新浪API格式
    const scale = periodToScale(period);
    const apiCode = convertToSinaCode(stockCode);
    
    // 计算范围对应的数据点数量
    const count = rangeToCount(range);
    
    // 拉取新浪K线接口
    const url = `https://quotes.sina.cn/cn/api/jsonp_v2.php/var%20_=${stockCode}_${period}_${range}/CN_MarketDataService.getKLineData?symbol=${apiCode}&scale=${scale}&ma=no&datalen=${count}`;
    console.log(`[K线] 请求URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Referer': 'https://finance.sina.com.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    
    console.log(`[K线] 原始响应: ${response.data.substring(0, 100)}...`);
    
    // 解析JSONP响应
    const data = parseJsonp(response.data);
    
    if (!data || !Array.isArray(data)) {
      throw new Error('API返回格式错误');
    }
    
    // 检查API是否返回了空数据
    if (data.length === 0) {
      throw new Error('API返回空数据');
    }
    
    // 转换数据格式到我们的标准格式
    const klineData = data.map(item => [
      item.day,
      parseFloat(item.open),
      parseFloat(item.high),
      parseFloat(item.low),
      parseFloat(item.close),
      parseInt(item.volume)
    ]);
    
    const result = {
      code: stockCode,
      period,
      range,
      data: klineData
    };
    
    // 保存到新的文件路径
    fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
    console.log(`[K线] 已保存 ${stockCode} ${period}-${range}`);
    
    return result;
  } catch (err) {
    console.error(`[K线] 获取失败 ${code}:`, err.message);
    
    // 如果API获取失败但缓存存在，则返回过期缓存
    const stockDir = path.join(__dirname, '../cache/kline', code.toUpperCase());
    const cacheFile = path.join(stockDir, `${period}-${range}.json`);
    
    if (fs.existsSync(cacheFile)) {
      console.warn(`[K线] 使用过期缓存 ${code}`);
      return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    }
    
    // 不再使用模拟数据，直接抛出错误
    throw new Error(`获取K线数据失败: ${err.message}`);
  }
}

/**
 * 转换K线周期到新浪API参数
 */
function periodToScale(period) {
  switch (period) {
    case 'day': return 240;
    case 'week': return 1200;
    case 'month': return 1680;
    default: return 240;
  }
}

/**
 * 转换时间范围到数据点数量
 */
function rangeToCount(range) {
  switch (range) {
    case '1m': return 30;
    case '3m': return 90;
    case '6m': return 180;
    case '1y': return 365;
    default: return 365;
  }
}

/**
 * 转换股票代码为新浪API格式
 */
function convertToSinaCode(code) {
  return code.toLowerCase();
}

/**
 * 解析JSONP响应
 */
function parseJsonp(jsonp) {
  try {
    // 处理可能的反爬虫脚本
    let cleanResponse = jsonp;
    
    // 去除可能的脚本标签
    if (cleanResponse.includes('/*<script>')) {
      cleanResponse = cleanResponse.replace(/\/\*<script>.*?<\/script>\*\//, '');
    }
    
    // 提取变量名和JSON数据
    const varNameMatch = cleanResponse.match(/var\s+(.+?)=(.+)$/);
    
    if (varNameMatch && varNameMatch[2]) {
      // 提取括号内的JSON内容
      const jsonMatch = varNameMatch[2].match(/\((.+)\);?$/);
      
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
    }
    
    // 尝试直接按旧格式提取
    const directMatch = cleanResponse.match(/=\((.+)\);?$/);
    if (directMatch && directMatch[1]) {
      return JSON.parse(directMatch[1]);
    }
    
    console.error('无法解析JSONP结构:', cleanResponse.substring(0, 100));
    throw new Error('JSONP格式不符合预期');
  } catch (err) {
    console.error('解析JSONP失败:', err);
    console.error('原始JSONP前100字符:', jsonp.substring(0, 100));
    throw new Error(`解析JSONP响应失败: ${err.message}`);
  }
}

module.exports = { fetchKlineData }