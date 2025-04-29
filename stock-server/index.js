// 引入依赖
const express = require('express')
const cors = require('cors')

// 引入缓存管理和定时任务
const { loadCache } = require('./cache/cacheManager')
const startUpdateJob = require('./tasks/updateStocks')
const startBattleSettlementTask = require('./tasks/battleSettlementTask')

const app = express()
app.use(cors())               // 允许跨域请求
app.use(express.json())       // 支持 JSON 请求体

loadCache()                   // 启动时读取本地快照
startUpdateJob()              // 每10分钟拉取一次最新数据
startBattleSettlementTask()    // 启动买涨买跌游戏结算任务

// 注册所有路由 (前缀 /api)
app.use('/api', require('./routes'))

// 启动服务
app.listen(3000, () => {
  console.log('✅ Server running at http://localhost:3000')
})
