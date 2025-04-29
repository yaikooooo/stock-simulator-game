// stockNewsExtractor.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

// 缓存目录
const CACHE_DIR = path.join(__dirname, '../cache/news');
fs.mkdirSync(CACHE_DIR, { recursive: true });

// 随机延迟
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// 随机UA
function getRandomUA() {
  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
  ];
  return uas[Math.floor(Math.random() * uas.length)];
}

/**
 * 主函数：获取股票相关新闻
 * @param {string} stockCode 股票代码 (如 sh600519)
 * @param {number} days 获取多少天内的新闻 (默认7天)
 * @param {number} maxCount 最多获取多少条新闻 (默认15条)
 */
async function getStockNews(stockCode, days = 7, maxCount = 15) {
  console.log(`开始获取 ${stockCode} 的近 ${days} 天新闻...`);
  
  // 尝试从缓存加载
  const cacheFile = path.join(CACHE_DIR, `${stockCode}.json`);
  if (fs.existsSync(cacheFile)) {
    const stats = fs.statSync(cacheFile);
    const cacheAgeHours = (Date.now() - stats.mtimeMs) / 1000 / 60 / 60;
    
    // 4小时内的缓存有效
    if (cacheAgeHours < 4) {
      try {
        const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        console.log(`使用缓存: ${stockCode}, ${cache.data.length}条新闻`);
        return cache;
      } catch (e) {
        console.log(`缓存读取失败: ${e.message}`);
      }
    }
  }
  
  // 第一步：搜索并获取有效新闻URL
  let validUrls = await findRecentNewsUrls(stockCode, days, maxCount);
  
  // 过滤掉相对URL或无效URL
  validUrls = validUrls.filter(item => {
    // 确保URL是绝对路径且有效
    return item.url && (
      item.url.startsWith('http') || 
      item.url.startsWith('https') ||
      item.url.startsWith('/')  // 相对URL也保留，但会在提取前转换
    );
  });
  
  console.log(`找到 ${validUrls.length} 条有效新闻链接`);
  
  // 第二步：提取每个URL的正文内容
  const newsItems = [];
  for (const item of validUrls) {
    try {
      console.log(`提取正文: ${item.title} (${item.url})`);
      const content = await extractArticleContent(item.url);
      
      if (content && content.length > 100) {
        newsItems.push({
          ...item,
          content
        });
        console.log(`✅ 成功提取 ${content.length} 字符`);
      } else {
        console.log(`❌ 提取内容过短或失败`);
        // 保留原始条目但不包含正文
        newsItems.push(item);
      }
      
      // 避免请求过快
      await sleep(1000 + Math.random() * 2000);
    } catch (error) {
      console.error(`提取失败: ${error.message}`);
      newsItems.push(item); // 保留原始条目
    }
  }
  
  // 获取北京时间
  const beijingTime = new Date();
  beijingTime.setHours(beijingTime.getHours() + 8); // UTC+8
  
  // 构造结果并缓存
  const result = {
    stockCode,
    version: beijingTime.toISOString().replace('T', ' ').substring(0, 19),
    data: newsItems
  };
  
  // 写入缓存
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
    console.log(`✅ 已缓存 ${newsItems.length} 条新闻`);
  } catch (e) {
    console.error(`缓存写入失败: ${e.message}`);
  }
  
  return result;
}

/**
 * 第一步：搜索并筛选有效期内的新闻URL
 * @returns {Promise<Array>} 有效新闻列表
 */
async function findRecentNewsUrls(stockCode, days, maxCount) {
  // 尝试获取股票名称，以提高搜索精度
  let stockName = '';
  try {
    stockName = await getStockName(stockCode);
  } catch (e) {
    console.log(`获取股票名称失败，使用代码: ${e.message}`);
    stockName = stockCode.replace(/^[a-z]+/, '');
  }
  
  // 搜索来源列表
  const validUrls = [];
  
  // 新浪财经搜索
  try {
    const sinaNews = await searchSinaFinance(stockCode, stockName, days);
    validUrls.push(...sinaNews);
    console.log(`新浪财经: 找到 ${sinaNews.length} 条新闻`);
  } catch (e) {
    console.error(`新浪财经搜索失败: ${e.message}`);
  }
  
  /* 暂时注释掉其他来源
  // 避免并发请求
  await sleep(1500);
  
  // 东方财富搜索
  try {
    const eastMoneyNews = await searchEastMoney(stockCode, stockName, days);
    validUrls.push(...eastMoneyNews);
    console.log(`东方财富: 找到 ${eastMoneyNews.length} 条新闻`);
  } catch (e) {
    console.error(`东方财富搜索失败: ${e.message}`);
  }
  
  // 避免并发请求
  await sleep(1500);
  
  // 网易财经搜索
  try {
    const netEaseNews = await search163Finance(stockCode, stockName, days);
    validUrls.push(...netEaseNews);
    console.log(`网易财经: 找到 ${netEaseNews.length} 条新闻`);
  } catch (e) {
    console.error(`网易财经搜索失败: ${e.message}`);
  }
  
  // 避免并发请求
  await sleep(1500);
  
  // 腾讯财经搜索
  try {
    const tencentNews = await searchTencentFinance(stockCode, stockName, days);
    validUrls.push(...tencentNews);
    console.log(`腾讯财经: 找到 ${tencentNews.length} 条新闻`);
  } catch (e) {
    console.error(`腾讯财经搜索失败: ${e.message}`);
  }
  
  // 避免并发请求
  await sleep(1500);
  
  // 同花顺财经搜索
  try {
    const tHSNews = await search10jqka(stockCode, stockName, days);
    validUrls.push(...tHSNews);
    console.log(`同花顺财经: 找到 ${tHSNews.length} 条新闻`);
  } catch (e) {
    console.error(`同花顺财经搜索失败: ${e.message}`);
  }
  */
  
  // 避免重复，按时间排序
  const uniqueUrls = [];
  const urlSet = new Set();
  
  for (const item of validUrls) {
    if (!urlSet.has(item.url)) {
      urlSet.add(item.url);
      uniqueUrls.push(item);
    }
  }
  
  // 按时间排序（最新的在前）
  uniqueUrls.sort((a, b) => new Date(b.time) - new Date(a.time));
  
  // 返回所有结果，不限制数量
  return uniqueUrls;
}

/**
 * 从新浪财经搜索新闻
 */
async function searchSinaFinance(stockCode, stockName, days) {
  const keyword = stockName || stockCode;
  const url = `https://search.sina.com.cn/?q=${encodeURIComponent(keyword)}&c=news&sort=time&range=all&ie=utf-8`;
  
  const response = await axios.get(url, {
    headers: {
      'User-Agent': getRandomUA(),
      'Referer': 'https://www.sina.com.cn/',
      'Accept': 'text/html,application/xhtml+xml,application/xml'
    },
    timeout: 10000
  });
  
  const $ = cheerio.load(response.data);
  const validNews = [];
  
  $('.result .box-result').each((i, el) => {
    const title = $(el).find('h2 a').text().trim();
    const url = $(el).find('h2 a').attr('href');
    const timeStr = $(el).find('.fgray_time').text().trim();
    
    // 解析日期 (通常格式为 "2023年12月01日 08:05")
    let date = new Date();
    try {
      console.log(`原始时间字符串: "${timeStr}"`);
      
      const matched = timeStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{1,2})/);
      if (matched) {
        const [_, year, month, day, hour, minute] = matched;
        // 使用ISO格式字符串创建日期，避免Date构造函数的问题
        date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`);
        
        // 检查日期是否合理（不应是未来日期）
        if (date > new Date()) {
          console.log(`检测到未来日期，重置为当前时间: ${date.toISOString()}`);
          date = new Date();
        }
      }
    } catch (e) {
      console.error(`日期解析错误: ${e.message}`);
      date = new Date();
    }
    
    // 检查是否在指定天数内
    const isRecent = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24) <= days;
    
    if (title && url && isRecent && url.includes('sina.com.cn')) {
      // 格式化日期时间（北京时间）
      const beijingTime = new Date(date.getTime());
      beijingTime.setHours(beijingTime.getHours() + 8); // UTC+8
      
      validNews.push({
        title,
        url,
        source: '新浪财经',
        time: beijingTime.toISOString().replace('T', ' ').substring(0, 19),
        publishDate: timeStr // 保留原始发布日期字符串以便调试
      });
    }
  });
  
  return validNews;
}

/* 暂时注释掉其他搜索函数
async function searchEastMoney(stockCode, stockName, days) {
  // 函数实现
}

async function search163Finance(stockCode, stockName, days) {
  // 函数实现
}

async function searchTencentFinance(stockCode, stockName, days) {
  // 函数实现
}

async function search10jqka(stockCode, stockName, days) {
  // 函数实现
}
*/

/**
 * 第二步：提取文章正文
 * @param {string} url 文章URL
 * @returns {Promise<string>} 提取的正文
 */
async function extractArticleContent(url) {
  try {
    // 处理相对URL
    let fullUrl = url;
    if (url.startsWith('/')) {
      // 推断域名
      if (url.includes('link?url=')) {
        // 这是搜狗重定向链接，可以直接访问
        fullUrl = `https://www.sogou.com${url}`;
      }
    }
    
    // 下载页面
    const response = await axios.get(fullUrl, {
      headers: {
        'User-Agent': getRandomUA(),
        'Referer': new URL(fullUrl).origin,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      responseType: 'arraybuffer',
      timeout: 15000
    });
    
    // 尝试检测并解码内容
    let html = '';
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('charset=') && contentType.includes('gb')) {
      html = iconv.decode(response.data, 'gbk');
    } else {
      html = iconv.decode(response.data, 'utf-8');
    }
    
    const $ = cheerio.load(html, { decodeEntities: false });
    
    // 1. 根据不同站点使用特定选择器
    let content = '';
    
    // 新浪财经
    if (fullUrl.includes('sina.com.cn')) {
      if ($('#artibody').length) {
        $('#artibody p').each((i, el) => {
          content += $(el).text().trim() + '\n\n';
        });
      } else if ($('.article-content').length) {
        $('.article-content p').each((i, el) => {
          content += $(el).text().trim() + '\n\n';
        });
      }
    }
    
    // 2. 如果特定提取失败，使用通用方法提取
    if (!content || content.length < 200) {
      console.log(`特定选择器提取失败，使用通用密度算法: ${fullUrl}`);
      content = extractContentByDensity($);
    }
    
    return cleanText(content);
  } catch (error) {
    console.error(`提取内容失败: ${error.message}`);
    return '';
  }
}

/**
 * 基于文本密度提取正文
 */
function extractContentByDensity($) {
  // 首先移除干扰元素
  $('script, style, iframe, img, svg, nav, header, footer, form, aside, .comment, .ad, .advertisement').remove();
  
  // 常见文章容器选择器
  const containers = [
    'article', '.article', '.content', '.article-content', '.post-content',
    '.entry-content', '.body', '.main-content', '.text', '.post-text',
    '.news-content', '.news-text', '.news', '.story-body',
    '#content', '#article', '#main-content', '#text', '#articleContent'
  ];
  
  // 尝试所有常见容器
  for (const selector of containers) {
    if ($(selector).length) {
      const text = $(selector).text().trim();
      if (text.length > 200) {
        return text;
      }
    }
  }
  
  // 计算段落密度，找到最可能的正文区域
  const paragraphs = {};
  const densities = [];
  
  $('div').each((i, el) => {
    // 计算上下文密度
    const text = $(el).text().trim();
    const childrenCount = $(el).children().length || 1;
    const density = text.length / childrenCount;
    
    if (text.length > 100) {  // 忽略过短的段落
      paragraphs[i] = { text, density };
      densities.push(density);
    }
  });
  
  // 如果没找到有意义的段落，尝试p标签集合
  if (Object.keys(paragraphs).length === 0) {
    const pTexts = [];
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 30) {  // 忽略过短的段落
        pTexts.push(text);
      }
    });
    
    if (pTexts.length > 0) {
      return pTexts.join('\n\n');
    }
    
    // 最后的尝试 - 返回body
    return $('body').text().trim();
  }
  
  // 找出密度最大的段落
  densities.sort((a, b) => b - a);
  const medianDensity = densities[Math.floor(densities.length / 2)];
  
  // 收集密度高于中位数的段落
  const contentParts = [];
  for (const id in paragraphs) {
    if (paragraphs[id].density >= medianDensity) {
      contentParts.push(paragraphs[id].text);
    }
  }
  
  return contentParts.join('\n\n');
}

/**
 * 清理文本内容
 */
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .replace(/\t/g, '')
    .trim();
}

/**
 * 获取股票名称
 */
async function getStockName(stockCode) {
  // 从新浪行情API获取名称
  const code = stockCode.replace(/^[a-z]+/, '');
  const market = stockCode.startsWith('sh') ? 1 : (stockCode.startsWith('sz') ? 2 : 0);
  
  const url = `https://hq.sinajs.cn/list=${stockCode}`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': getRandomUA(),
      'Referer': 'https://finance.sina.com.cn/',
    },
    responseType: 'arraybuffer'
  });
  
  const text = iconv.decode(response.data, 'gbk');
  const match = text.match(/"([^"]+)"/);
  
  if (match && match[1]) {
    const parts = match[1].split(',');
    if (parts.length > 0 && parts[0]) {
      return parts[0];
    }
  }
  
  return code;
}

// 测试函数
async function test() {
  try {
    const result = await getStockNews('sh600519', 7, 10);
    
    console.log(`\n获取 ${result.stockCode} 相关新闻 ${result.data.length} 条：`);
    result.data.forEach((news, i) => {
      console.log(`\n${i+1}. [${news.source}] ${news.title}`);
      console.log(`   时间: ${news.time}`);
      console.log(`   链接: ${news.url}`);
      console.log(`   内容长度: ${news.content ? news.content.length : 0} 字符`);
      if (news.content) {
        const preview = news.content.length > 100 ? 
          news.content.substring(0, 100) + '...' : news.content;
        console.log(`   预览: ${preview}`);
      }
    });
  } catch (error) {
    console.error(`测试失败: ${error}`);
  }
}

// 导出
module.exports = { getStockNews };

// 直接运行测试
if (require.main === module) {
  test();
}