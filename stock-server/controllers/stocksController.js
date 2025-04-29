const fs = require('fs');
const path = require('path');
const { fetchAndCacheDetail } = require('../services/stockService');
const { fetchKlineData } = require('../services/klineService');
const appConfig = require('../config/appConfig');

// 如果新闻功能启用，才导入新闻服务
// 注意：重命名导入的函数为 fetchStockNews 避免命名冲突
let fetchStockNews;
if (appConfig.features.enableNewsFeature) {
  const newsService = require('../services/stockNewsExtractor');
  fetchStockNews = newsService.getStockNews; // 将导入的函数重命名为 fetchStockNews
}

// 获取行业股票
function getIndustryStocks(req, res) {
  const file = path.join(__dirname, '../cache/industry', `${req.params.name}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'invalid industry' });
  res.json(JSON.parse(fs.readFileSync(file)));
}

// 获取热门股票
function getHotStocks(req, res) {
  const file = path.join(__dirname, '../cache/hot.json');
  res.json(JSON.parse(fs.readFileSync(file)));
}

// 获取所有股票
function getAllStocks(req, res) {
  const version = req.query.version;
  const file = path.join(__dirname, '../cache/stock_cache.json');
  const data = JSON.parse(fs.readFileSync(file));
  if (data.version === version) return res.json({ updated: false });
  res.json({ updated: true, ...data });
}

// 获取股票详情
async function getStockDetail(req, res) {
  try {
    const result = await fetchAndCacheDetail(req.params.code);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// 获取K线数据
async function getStockKline(req, res) {
  const { code } = req.params;
  const { period = 'day', range = '1y' } = req.query;
  try {
    const result = await fetchKlineData(code, period, range);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'K线图获取失败', detail: err.message });
  }
}

// 新闻接口控制器方法 - 注意名称为 getStockNewsController 避免冲突
async function getStockNewsController(req, res) {
  if (!appConfig.features.enableNewsFeature) {
    return res.status(404).json({ 
      error: '新闻功能已禁用', 
      message: '当前服务器配置已禁用新闻功能'
    });
  }
  
  try {
    // 调用重命名后的导入函数
    const result = await fetchStockNews(req.params.code);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '新闻获取失败', detail: err.message });
  }
}

module.exports = {
  getIndustryStocks,
  getHotStocks,
  getAllStocks,
  getStockDetail,
  getStockKline,
  getStockNewsController  // 导出重命名的控制器方法
}; 