// deleteAllData.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllData() {
  try {
    // 删除所有关联表数据的顺序应先从外键约束较弱的表开始
    console.log('删除所有交易记录...');
    await prisma.trade.deleteMany({});
    
    console.log('删除所有持仓数据...');
    await prisma.holding.deleteMany({});
    
    console.log('删除所有绑定信息...');
    await prisma.authBinding.deleteMany({});
    
    console.log('删除所有用户数据...');
    await prisma.user.deleteMany({});
    
    console.log('删除所有账户数据...');
    await prisma.account.deleteMany({});
    
    console.log('数据库清空成功！');
  } catch (error) {
    console.error('删除数据时发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllData();
