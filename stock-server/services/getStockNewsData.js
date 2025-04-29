/**
 * 获取股票新闻数据
 * @param {string} stockCode 股票代码
 * @returns {Object} 新闻数据
 */
async function getStockNewsData(stockCode) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const normalizedCode = stockCode.toLowerCase();
    const newsPath = path.join(__dirname, '../cache/news', `${normalizedCode}.json`);
    
    console.log(`[AI聊天] 尝试读取新闻文件: ${newsPath}`);
    
    if (fs.existsSync(newsPath)) {
      const fileContent = fs.readFileSync(newsPath, 'utf8');
      console.log(`[AI聊天] 新闻文件原始内容: ${fileContent}`);
      
      const newsFile = JSON.parse(fileContent);
      
      // 打印文件结构，帮助分析问题
      console.log(`[AI聊天] 新闻文件结构: ${Object.keys(newsFile).join(', ')}`);
      
      // 检查newsFile.data是否存在且是数组
      if (newsFile.data && Array.isArray(newsFile.data)) {
        console.log(`[AI聊天] 读取新闻数据成功: ${stockCode}, ${newsFile.data.length}条`);
        
        // 打印每条新闻的标题，帮助检查
        for (let i = 0; i < Math.min(3, newsFile.data.length); i++) {
          console.log(`[AI聊天] 新闻${i+1}标题: ${newsFile.data[i].title}`);
        }
        
        return newsFile.data;
      } else {
        console.log(`[AI聊天] 新闻文件格式不正确，缺少data数组`);
        return [];
      }
    }
    
    console.log(`[AI聊天] 找不到新闻文件: ${newsPath}`);
    return [];
  } catch (error) {
    console.error(`[AI聊天] 获取新闻数据失败 ${stockCode}:`, error);
    return [];
  }
} 