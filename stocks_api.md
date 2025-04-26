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
  | uniqueId   | string | ✅       | X8JY7A2K       | 当前账号的 uniqueId     |
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