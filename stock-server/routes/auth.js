// routes/auth.js - 所有认证相关路由
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 注册路由
router.post('/register', authController.register);
router.post('/bind_phone', authController.bindPhone);

module.exports = router; 