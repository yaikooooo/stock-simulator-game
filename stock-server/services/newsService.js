/**
 * 新闻服务模块（默认空结构）
 * - 保留结构接口，未来用于接入 AI 或主动触发解析
 * - 当前版本直接返回空数组
 */

async function fetchNews(code) {
  return []  // 返回结构为空，供接口联调使用
}

module.exports = { fetchNews }