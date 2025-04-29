const { getAIChatResponse } = require('../services/aiChatService');
const appConfig = require('../config/appConfig');
const aiConfig = require('../config/aiConfig');

/**
 * 获取AI分析回复
 */
async function getStockAnalysis(req, res) {
  // 检查AI聊天功能是否启用
  if (!appConfig.features.enableAIChatFeature) {
    return res.status(403).json({
      success: false,
      error: 'AI聊天功能未启用'
    });
  }

  try {
    const { userId, stockCode, personaId } = req.body;
    
    // 参数验证
    if (!userId) {
      return res.status(400).json({ success: false, error: '缺少用户ID' });
    }
    
    if (!stockCode) {
      return res.status(400).json({ success: false, error: '缺少股票代码' });
    }
    
    // 获取AI回复
    const result = await getAIChatResponse(userId, stockCode, personaId);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('AI聊天控制器错误:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
}

/**
 * 获取可用的AI角色列表
 */
function getAvailablePersonas(req, res) {
  try {
    const personas = Object.entries(aiConfig.personas).map(([id, persona]) => ({
      id,
      name: persona.name,
      title: persona.title,
      avatar: persona.avatar
    }));
    
    return res.json({
      success: true,
      data: personas
    });
  } catch (error) {
    console.error('获取AI角色列表错误:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
}

module.exports = {
  getStockAnalysis,
  getAvailablePersonas
}; 