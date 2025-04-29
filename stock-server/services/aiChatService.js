const axios = require('axios');
const fs = require('fs');
const path = require('path');
const appConfig = require('../config/appConfig');
const aiConfig = require('../config/aiConfig');

/**
 * 获取股票K线数据
 * @param {string} stockCode 股票代码
 * @returns {Object} K线数据
 */
async function getStockKlineData(stockCode) {
  try {
    // 规范化股票代码为大写
    const normalizedCode = stockCode.toUpperCase();
    
    // 引入K线服务
    const { fetchKlineData } = require('./klineService');
    
    // 调用klineService获取K线数据（如果不存在会自动生成）
    const klineData = await fetchKlineData(normalizedCode, 'day', '1y');
    
    // 只取最近一周的数据
    if (klineData && klineData.data && Array.isArray(klineData.data)) {
      if (aiConfig.debug) {
        console.log(`[AI聊天] 原始K线数据点数量: ${klineData.data.length}`);
      }
      
      // 只保留最近7天的数据
      const recentData = klineData.data.slice(-7);
      if (aiConfig.debug) {
        console.log(`[AI聊天] 筛选后K线数据点数量: ${recentData.length}`);
      }
      
      // 创建新的对象，避免修改原数据
      return {
        code: klineData.code,
        period: klineData.period,
        range: '1w', // 改为1周
        data: recentData
      };
    }
    
    return klineData;
  } catch (error) {
    console.error('获取K线数据失败:', error);
    return null;
  }
}

/**
 * 获取股票新闻数据
 * @param {string} stockCode 股票代码
 * @returns {Object} 新闻数据
 */
async function getStockNewsData(stockCode) {
  try {
    const normalizedCode = stockCode.toLowerCase();
    const newsPath = path.join(__dirname, '../cache/news', `${normalizedCode}.json`);
    if (fs.existsSync(newsPath)) {
      const newsFile = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
      if (aiConfig.debug) {
        console.log(`[AI聊天] 读取新闻数据成功: ${stockCode}, ${newsFile.data ? newsFile.data.length : 0}条`);
      }
      return newsFile.data || [];
    }
    if (aiConfig.debug) {
      console.log(`[AI聊天] 找不到新闻文件: ${newsPath}`);
    }
    return [];
  } catch (error) {
    console.error(`[AI聊天] 获取新闻数据失败 ${stockCode}:`, error);
    return [];
  }
}

/**
 * 调用DeepSeek AI接口
 * @param {string} prompt 提示词
 * @param {Object} stockData 股票数据
 * @returns {string} AI回复
 */
async function callDeepSeekAI(prompt, stockData) {
  try {
    // 格式化K线数据，使其更易读
    const formattedKline = formatKlineData(stockData.kline);
    
    // 格式化新闻数据，只保留关键字段
    const formattedNews = formatNewsData(stockData.news);
    
    // 构建完整的发送内容
    const userContent = `请分析这只股票。以下是最近一周的K线数据和相关新闻：\n\n股票K线数据：${JSON.stringify(formattedKline)}\n\n相关新闻：${JSON.stringify(formattedNews)}`;
    
    // 只在调试模式下打印详细信息
    if (aiConfig.debug) {
      console.log(`[AI聊天] 使用的角色提示词: ${prompt.substring(0, 100)}...`);
      console.log(`[AI聊天] 发送给AI的数据:\n${userContent}`);
    }
    
    const response = await axios.post(
      aiConfig.apiEndpoint,
      {
        model: aiConfig.model,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: userContent
          }
        ],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI接口调用失败:', error.response?.data || error.message);
    throw new Error('AI分析失败，请稍后再试');
  }
}

/**
 * 格式化K线数据，使其更易读
 */
function formatKlineData(klineData) {
  if (!klineData || !klineData.data) return {};
  
  // 创建带有可读字段名的数据
  const formattedData = klineData.data.map(item => ({
    date: item[0],
    open: item[1],
    high: item[2],
    low: item[3],
    close: item[4],
    volume: item[5]
  }));
  
  return {
    code: klineData.code,
    period: klineData.period,
    range: klineData.range,
    data: formattedData
  };
}

/**
 * 格式化新闻数据，只保留关键字段
 */
function formatNewsData(newsData) {
  if (!newsData || !Array.isArray(newsData)) return [];
  
  // 只取最近5条新闻
  const recentNews = newsData.slice(0, 5);
  
  // 只保留关键字段
  return recentNews.map(news => ({
    title: news.title,
    time: news.time,
    content: news.content ? news.content.substring(0, 200) + '...' : '' // 只取前200字
  }));
}

/**
 * 获取AI聊天回复
 * @param {string} userId 用户ID
 * @param {string} stockCode 股票代码
 * @param {string} personaId 角色ID
 * @returns {Object} AI回复及角色信息
 */
async function getAIChatResponse(userId, stockCode, personaId = 'buffett') {
  try {
    // 检查角色是否存在
    if (!aiConfig.personas[personaId]) {
      throw new Error('指定的分析师角色不存在');
    }
    
    // 获取角色信息
    const persona = aiConfig.personas[personaId];
    if (aiConfig.debug) {
      console.log(`[AI聊天] 使用角色: ${personaId} (${persona.name} - ${persona.title})`);
    }
    
    // 获取股票数据
    const klineData = await getStockKlineData(stockCode);
    if (!klineData) {
      throw new Error('找不到该股票的K线数据');
    }
    
    const newsData = await getStockNewsData(stockCode);
    
    // 准备AI分析的数据
    const stockData = {
      kline: klineData,
      news: newsData || []
    };
    
    // 调用AI接口
    const aiResponse = await callDeepSeekAI(persona.prompt, stockData);
    
    return {
      success: true,
      data: {
        response: aiResponse,
        persona: {
          id: personaId,
          name: persona.name,
          title: persona.title,
          avatar: persona.avatar
        }
      }
    };
  } catch (error) {
    console.error('AI聊天服务错误:', error);
    return {
      success: false,
      error: error.message || '分析失败，请稍后再试'
    };
  }
}

module.exports = {
  getAIChatResponse
}; 