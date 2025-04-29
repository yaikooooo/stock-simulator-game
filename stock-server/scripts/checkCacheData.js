// 检查全量缓存数据
const fs = require('fs');
const path = require('path');

// 读取股票缓存
const cacheFile = path.join(__dirname, '../cache/stock_cache.json');

if (fs.existsSync(cacheFile)) {
  const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
  
  console.log(`股票缓存版本: ${cache.version}`);
  console.log(`股票总数: ${cache.data ? cache.data.length : 0}`);
  
  // 检查特定股票
  if (cache.data && cache.data.length > 0) {
    const maotai = cache.data.find(stock => stock.code === 'sh600519' || stock.code === 'SH600519');
    console.log('贵州茅台数据:', maotai);
    
    // 列出前10只股票
    console.log('前10只股票:');
    cache.data.slice(0, 10).forEach(stock => {
      console.log(`${stock.code} ${stock.name} ${stock.price} ${stock.change}`);
    });
  } else {
    console.log('警告: 缓存中没有股票数据!');
  }
} else {
  console.log('错误: 股票缓存文件不存在!');
}

// 检查是否有贵州茅台的K线缓存
const klineDir = path.join(__dirname, '../cache/kline/SH600519');
if (fs.existsSync(klineDir)) {
  console.log(`K线目录存在: ${klineDir}`);
  const files = fs.readdirSync(klineDir);
  console.log(`K线文件: ${files.join(', ')}`);
} else {
  console.log(`K线目录不存在: ${klineDir}`);
} 