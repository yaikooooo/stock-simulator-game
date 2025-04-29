# 📈 股票模块 API 接口文档

接口前缀：`/api/stocks`

---

## 1️⃣ 获取全量股票快照

**GET** `/api/stocks`

**说明：** 获取全市场所有股票快照（用于大盘刷新、缓存比对）

**请求参数：**

| 参数 | 类型 | 是否必传 | 说明 |
|------|------|----------|------|
| version | string | 否 | 客户端缓存版本，服务端如一致则返回 `updated: false` |

**返回示例：**

```json
{
  "updated": true,
  "version": "2025-04-23-16:10",
  "data": [
    { "code": "sh600519", "name": "贵州茅台", "price": 1888.33, "change": "3.15" }
  ]
}
```

---

## 2️⃣ 获取热门推荐股票

**GET** `/api/stocks/hot`

**说明：** 获取当前涨幅前 20 的热门股票，用于首页推荐、榜单展示

**返回示例：**

```json
{
  "version": "2025-04-23-16:10",
  "data": [
    { "code": "sh600519", "name": "贵州茅台", "price": 1888.33, "change": "3.15" }
  ]
}
```

---

## 3️⃣ 获取行业板块股票列表

**GET** `/api/stocks/industry/:name`

**说明：** 获取某个行业下的所有股票快照（按板块分类）

**路径参数：**

| 参数 | 类型 | 示例 | 说明 |
|------|------|------|------|
| name | string | tech, finance | 行业英文 key（symbols_all.js 中定义） |

**返回示例：**

```json
{
  "version": "2025-04-23-16:10",
  "data": [
    { "code": "sz000001", "name": "平安银行", "price": 10.23, "change": "-0.03" }
  ]
}
```

---

## 4️⃣ 获取单个股票详情

**GET** `/api/stocks/:code/detail`

**说明：** 获取某只股票的当前快照详情。首次访问将触发实时抓取并缓存，后续 10 分钟内命中本地缓存文件，无需再次请求数据源。

**路径参数：**

| 参数 | 类型 | 示例 | 说明 |
|------|------|------|------|
| code | string | sh600519 | 股票代码（A股/港股/美股） |

**返回示例：**

```json
{
  "version": "2025-04-23-16:05",
  "data": {
    "code": "sh600519",
    "name": "贵州茅台",
    "price": 1888.33,
    "change": "3.15",
    "open": 1865.00,
    "previousClose": 1855.12,
    "high": 1899.00,
    "low": 1855.50,
    "volume": 421000,
    "amount": 7894300.00,
    "time": "15:00:03",
    "news": []
  }
}
```

---

## 5️⃣ 获取股票 K 线图数据

**GET** `/api/stocks/:code/kline`

**说明：** 获取某支股票的历史K线图数据。首次请求会拉取并缓存数据文件，后续命中本地缓存（按 `code-period-range` 文件分隔）。

**路径参数：**

| 参数 | 类型 | 示例 | 说明 |
|------|------|------|------|
| code | string | sh600519 | 股票代码 |

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| period | string | day | 可选：day/week/month |
| range | string | 1y | 可选：1y/6m/3m 等 |

**返回示例：**

```json
{
  "code": "sh600519",
  "period": "day",
  "range": "1y",
  "data": [
    ["2025-04-01", 1850, 1860, 1830, 1880, 320000]
  ]
}
```

---

## 6️⃣股票相关新闻（预留）

### `GET /api/stocks/:code/news`

当前版本返回空数组，后续接入新闻搜索接口。

---
```
## 🔹 7. 用户资产查询

### `GET /api/account/:userId`

获取指定用户的账户余额（人民币、美元、欧元）与总资产。

---

## 🔹 8. 用户交易模块

包含用户的股票买入、卖出、交易记录查询等操作。

---

### ✅ 8.1 买入股票

- **接口地址**：`POST /api/trade/buy`
- **接口说明**：提交买入交易请求，服务器根据股票代码获取当前快照中的价格，完成资金校验后进行买入。
- **请求方式**：POST
- **请求头部**：
  - `Content-Type: application/json`

#### 📥 请求体参数

| 参数名 | 类型   | 是否必填 | 示例值       | 说明                 |
|--------|--------|----------|--------------|----------------------|
| userId | string | ✅       | cm9wmnsmr0000uir8xxeebcia | 用户唯一 ID          |
| code   | string | ✅       | sh600519      | 股票代码             |
| name   | string | ✅       | 贵州茅台      | 股票名称             |
| amount | number | ✅       | 2             | 买入股数（整数）     |

#### 📤 返回结果示例

```json
{
  "success": true,
  "data": {
    "userId": "cm9wpy4j4000cuibghskg6cfb",
    "code": "sh600519",
    "name": "贵州茅台",
    "type": "BUY",
    "price": 1552.25,
    "amount": 2,
    "fee": 3.1,
    "createdAt": "2025-04-24T10:03:45.000Z"
  }
}
```

#### ⚙️ 特别说明
- 当前价格由后端从 `stockCache` 中获取，前端不能提交价格。
- 后端将按照 `config/index.js` 中配置的 `feeRate` 计算手续费。
- 若账户余额不足，将返回错误提示。

---

### ✅ 8.2 卖出股票

- **接口地址**：`POST /api/trade/sell`
- **接口说明**：提交卖出交易请求，系统校验持仓数量和当前行情价格，完成交易并返还资金。
- **请求方式**：POST
- **请求头部**：
  - `Content-Type: application/json`

#### 📥 请求体参数

| 参数名 | 类型   | 是否必填 | 示例值       | 说明                 |
|--------|--------|----------|--------------|----------------------|
| userId | string | ✅       | cm9wmnsmr0000uir8xxeebcia | 用户唯一 ID          |
| code   | string | ✅       | sh600519      | 股票代码             |
| name   | string | ✅       | 贵州茅台      | 股票名称             |
| amount | number | ✅       | 1             | 卖出股数（整数）     |

#### 📤 返回结果示例

```json
{
  "success": true,
  "data": {
    "userId": "cm9wpy4j4000cuibghskg6cfb",
    "code": "sh600519",
    "name": "贵州茅台",
    "type": "SELL",
    "price": 1552.25,
    "amount": 1,
    "fee": 1.55,
    "createdAt": "2025-04-24T10:04:20.000Z"
  }
}
```

#### ⚙️ 特别说明
- 当前价格由后端行情缓存提供，禁止由客户端传入。
- 后端自动校验持仓是否充足。
- 卖出后按成交金额扣除手续费，剩余部分加入账户余额。

---

### ✅ 8.3 查询交易历史记录

- **接口地址**：`GET /api/trade/history`
- **接口说明**：获取当前用户的交易记录列表，默认返回最近 100 条。
- **请求方式**：GET
- **请求参数**：

| 参数名 | 类型   | 是否必填 | 示例值       | 说明       |
|--------|--------|----------|--------------|------------|
| userId | string | ✅       | user_test_001 | 用户唯一 ID |

#### 📤 返回结果示例

```json
{
  "success": true,
  "data": [
    {
      "type": "BUY",
      "code": "sh600519",
      "name": "贵州茅台",
      "price": 1552.25,
      "amount": 2,
      "fee": 3.1,
      "createdAt": "2025-04-24T10:03:45.000Z"
    },
    {
      "type": "SELL",
      "code": "sh600519",
      "name": "贵州茅台",
      "price": 1552.25,
      "amount": 1,
      "fee": 1.55,
      "createdAt": "2025-04-24T10:04:20.000Z"
    }
  ]
}
```

## 🛡️ 缓存机制说明（用户访问触发懒加载 + 本地缓存）

| 接口 | 缓存路径 | 缓存机制 |
|------|-----------|-----------|
| 全量快照 | `cache/stock_cache.json` | 定时更新，每10分钟由任务写入 |
| 行业快照 | `cache/industry/:name.json` | 定时更新，由任务管理 |
| 热门榜单 | `cache/hot.json` | 定时更新，由任务管理 |
| 股票详情 | `cache/detail/:code.json` | 首次访问时拉取并缓存，有效期10分钟 |
| K线图 | `cache/kline/:code-period-range.json` | 首次访问拉取并缓存，无需重复拉 |
| 新闻流 |当前版本返回空数组，后续接入新闻搜索接口。
- 所有买入 / 卖出请求均依赖 `stockCache` 中缓存的行情快照价格。
- 服务端负责计算手续费、校验账户与持仓、更新资产与交易记录。
- 所有价格、金额数据保留两位小数。
- 当前交易仅支持 A 股（人民币结算），后续将支持港股/美股。
---

## 🔐 用户注册与身份绑定接口

### ✅ 1. 注册账号

- **接口路径**：`POST /api/auth/register`
- **请求参数**：

  | 参数名     | 类型   | 是否必填 | 示例值           | 说明                     |
  |------------|--------|----------|------------------|--------------------------|
  | externalId | string | ✅       | douyin_abc_001    | 平台唯一身份（如 openId）|

- **说明**：
  - 系统将自动生成 uniqueId，创建账户、初始资金和绑定关系。
  - provider 不由前端传入，默认由服务端代码自动赋值（如 open / wechat / douyin）。

- **响应示例**：
```json
{
    "success": true,
    "uniqueId": "NB9AG26G",
    "userId": "cm9wr601j0000uiqkrec6f26t"
}
```

---

### ✅ 2. 绑定手机号（可能触发合并）

- **接口路径**：`POST /api/auth/bind_phone`
- **请求参数**：

  | 参数名     | 类型   | 是否必填 | 示例值        | 说明                     |
  |------------|--------|----------|---------------|--------------------------|
  | userId     | string | ✅       | cma1tgtoa0000ui3cdjow691g   | 当前账号的 userId     |
  | phone      | string | ✅       | 13800138000    | 手机号                   |
  | provider   | string | ✅       | phone          | 渠道标识（写 "phone"）   |
  | metadata   | JSON   | ❌       | { "source": "H5" } | 附加信息（渠道来源等）|

- **说明**：
  - 若该手机号已绑定其他账号，将触发合并逻辑（合并资金、股票、绑定信息）。

- **响应示例**：
```json
{
  "success": true,
  "message": "手机号绑定成功",
  "userId": "cm9wmnsmr0000uir8xxeebcia"
}
```

---

### ⚙️ 3. 合并逻辑说明（自动触发，前端无需调用）

- **触发场景**：当某手机号重复绑定至不同账号时自动合并。
- **调用方式**：服务端内部执行 `mergeAccounts(primaryId, secondaryId)`。
- **合并内容**：
  1. 合并账户余额（balance）
  2. 合并持仓（加权平均价格）
  3. 合并交易记录（Trade）
  4. 合并绑定关系（AuthBinding）
  5. 删除被合并账号（User）


## 7️⃣ AI 股票分析接口

### ✅ 1.1 获取AI股票分析

- **接口地址**：`POST /api/ai-chat/analyze`
- **接口说明**：基于股票K线数据和相关新闻，由AI角色提供专业分析和建议
- **请求方式**：POST
- **请求头部**：
  - `Content-Type: application/json`

#### 📥 请求体参数

| 参数名    | 类型   | 是否必填 | 示例值       | 说明                 |
|-----------|--------|----------|--------------|----------------------|
| userId    | string | ✅       | user123      | 用户唯一 ID          |
| stockCode | string | ✅       | SH600519     | 股票代码             |
| personaId | string | ❌       | buffett      | AI角色ID（默认为巴菲特）|

#### 📤 返回结果示例

```json
{
  "success": true,
  "data": {
    "response": "作为一名价值投资者，我总是关注企业的竞争优势和长期盈利能力。贵州茅台拥有强大的品牌价值和稳定的现金流，最近几个季度营收持续增长...",
    "persona": {
      "id": "buffett",
      "name": "沃伦·巴菲特",
      "title": "投资大师",
      "avatar": "/avatars/buffett.png"
    }
  }
}
```

#### ⚙️ 特别说明
- 系统会根据stockCode自动获取该股票的K线数据和相关新闻
- 当前支持的角色包括：巴菲特(buffett)、量化交易专家(quantTrader)
- AI分析结果由DeepSeek模型生成，仅供参考，不构成投资建议

### ✅ 1.2 获取可用的AI角色列表

- **接口地址**：`GET /api/ai-chat/personas`
- **接口说明**：获取系统支持的所有AI分析师角色信息
- **请求方式**：GET

#### 📤 返回结果示例

```json
{
  "success": true,
  "data": [
    {
      "id": "buffett",
      "name": "沃伦·巴菲特",
      "title": "投资大师",
      "avatar": "/avatars/buffett.png"
    },
    {
      "id": "quantTrader",
      "name": "林默",
      "title": "量化交易专家",
      "avatar": "/avatars/quant.png"
    }
  ]
}
```

##  查询接口
### 查询资产接口
/api/account?userId=xxx
查询账户资产（Account 表）
支持传 User.id 或 uniqueId
如果账户不存在 ➜ 返回 404

### 查询持仓账户
/api/account/holdings?userId=xxx
查询当前持仓（Holding 表）
支持 userId / uniqueId
默认按 updatedAt 倒序排序

### 查询交易记录
/api/account/trades?userId=xxx
查询历史交易记录（Trade 表）
同样支持双字段
按 createdAt 倒序展示

## 8️⃣ 买涨买跌游戏接口

提供简易版买涨买跌游戏功能，用户可选择股票、方向、金额和时间周期，进行涨跌预测交易。

### ✅ 8.1 创建买涨买跌订单

- **接口地址**：`POST /api/battle/order`
- **接口说明**：创建一个新的买涨买跌游戏订单
- **请求方式**：POST
- **请求头部**：
  - `Content-Type: application/json`

#### 📥 请求体参数

| 参数名      | 类型   | 是否必填 | 示例值       | 说明                         |
|-------------|--------|----------|--------------|------------------------------|
| userId      | string | ✅       | user123      | 用户唯一ID                   |
| stockCode   | string | ✅       | sh600519     | 股票代码                     |
| direction   | string | ✅       | buy_up       | 方向：buy_up/buy_down        |
| betAmount   | number | ✅       | 1000         | 下注金额                     |
| holdMinutes | number | ✅       | 30           | 持有周期(分钟)               |

#### 📤 返回结果示例

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user123",
    "stockCode": "sh600519",
    "direction": "buy_up",
    "betAmount": 1000,
    "startPrice": 1550.75,
    "holdMinutes": 30,
    "settleTime": "2025-04-28T10:30:00Z",
    "status": "pending",
    "createdAt": "2025-04-28T10:00:00Z",
    "updatedAt": "2025-04-28T10:00:00Z"
  }
}
```

#### ⚙️ 特别说明
- 系统使用下单时的股票价格作为起始价格
- 持有周期必须是系统配置的有效时间（如5分钟/10分钟/30分钟/1小时等）
- 下注金额有最低和最高限制
- 用户余额不足将返回错误

---

### ✅ 8.2 获取用户的买涨买跌订单列表

- **接口地址**：`GET /api/battle/orders`
- **接口说明**：获取用户的买涨买跌订单列表，支持分页和状态筛选
- **请求方式**：GET

#### 📥 请求参数

| 参数名   | 类型   | 是否必填 | 示例值     | 说明                                   |
|----------|--------|----------|------------|---------------------------------------|
| userId   | string | ✅       | user123    | 用户唯一ID                             |
| status   | string | ❌       | pending    | 状态筛选(all/pending/settled/canceled) |
| page     | number | ❌       | 1          | 页码，默认1                            |
| pageSize | number | ❌       | 20         | 每页数量，默认20                       |

#### 📤 返回结果示例

```json
{
  "success": true,
  "data": {
    "total": 15,
    "page": 1,
    "pageSize": 20,
    "data": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "userId": "user123",
        "stockCode": "sh600519",
        "direction": "buy_up",
        "betAmount": 1000,
        "startPrice": 1550.75,
        "holdMinutes": 30,
        "settleTime": "2025-04-28T10:30:00Z",
        "endPrice": 1555.80,
        "settlementResult": "win",
        "profitAmount": 800,
        "status": "settled",
        "createdAt": "2025-04-28T10:00:00Z",
        "updatedAt": "2025-04-28T10:30:05Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "userId": "user123",
        "stockCode": "sh601318",
        "direction": "buy_down",
        "betAmount": 500,
        "startPrice": 38.55,
        "holdMinutes": 60,
        "settleTime": "2025-04-28T11:00:00Z",
        "status": "pending",
        "createdAt": "2025-04-28T10:00:00Z",
        "updatedAt": "2025-04-28T10:00:00Z"
      }
    ]
  }
}
```

---

### ✅ 8.3 取消买涨买跌订单

- **接口地址**：`POST /api/battle/cancel`
- **接口说明**：取消未结算的买涨买跌订单并返还资金
- **请求方式**：POST
- **请求头部**：
  - `Content-Type: application/json`

#### 📥 请求体参数

| 参数名  | 类型   | 是否必填 | 示例值                              | 说明       |
|---------|--------|----------|------------------------------------|------------|
| orderId | string | ✅       | 550e8400-e29b-41d4-a716-446655440001 | 订单ID     |
| userId  | string | ✅       | user123                           | 用户唯一ID |

#### 📤 返回结果示例

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "userId": "user123",
    "stockCode": "sh601318",
    "direction": "buy_down",
    "betAmount": 500,
    "startPrice": 38.55,
    "holdMinutes": 60,
    "settleTime": "2025-04-28T11:00:00Z",
    "status": "canceled",
    "createdAt": "2025-04-28T10:00:00Z",
    "updatedAt": "2025-04-28T10:05:30Z"
  }
}
```

#### ⚙️ 特别说明
- 只能取消状态为pending的订单
- 接近结算时间（如5分钟内）可能无法取消
- 取消后将退还全部下注金额

---

### ✅ 8.4 获取买涨买跌游戏配置

- **接口地址**：`GET /api/battle/config`
- **接口说明**：获取买涨买跌游戏的配置参数，包括最低/最高下注金额、奖励倍数等
- **请求方式**：GET

#### 📤 返回结果示例

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "minBetAmount": 100,
    "maxBetAmount": 10000,
    "rewardMultiplier": 1.8,
    "availableHoldMinutes": [5, 10, 30, 60, 120, 240]
  }
}
```

#### ⚙️ 特别说明
- 后台可调整游戏参数，客户端需要根据此接口返回值动态调整UI
- enabled为false时表示功能暂时关闭