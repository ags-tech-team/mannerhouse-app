process.env.TZ = 'America/Sao_Paulo';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./src/models');

const authRoutes = require('./src/routes/authRoutes');
const barberRoutes = require('./src/routes/barberRoutes');
const barberDashboardRoutes = require('./src/routes/barberDashboardRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const productRoutes = require('./src/routes/productRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const cashRegisterRoutes = require('./src/routes/cashRegisterRoutes');
const revenueRoutes = require('./src/routes/revenueRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const saleRoutes = require('./src/routes/saleRoutes');
const commissionRoutes = require('./src/routes/commissionRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const monthlyRoutes = require('./src/routes/monthlyRoutes');
const publicRoutes = require('./src/routes/publicRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🔥 ROTAS
app.use('/api/auth', authRoutes);
app.use('/api/barbers', barberRoutes);
app.use('/api/monthly', monthlyRoutes);
app.use('/api/barber/dashboard', barberDashboardRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/cash-register', cashRegisterRoutes);
app.use('/api/revenues', revenueRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// 🔥 HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API Manner House funcionando!',
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
    endpoints: {
      auth: '/api/auth',
      barbers: '/api/barbers',
      barberDashboard: '/api/barber/dashboard',
      clients: '/api/clients',
      products: '/api/products',
      appointments: '/api/appointments',
      cashRegister: '/api/cash-register',
      revenues: '/api/revenues',
      expenses: '/api/expenses',
      sales: '/api/sales',
      commissions: '/api/commissions',
      admin: '/api/admin',
    }
  });
});

// 🚀 INICIAR SERVIDOR
const startServer = async () => {
  try {
    console.log('🚀 Iniciando servidor...');
    console.log('📊 NODE_ENV:', process.env.NODE_ENV);
    console.log('📊 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Configurada' : '❌ Não configurada');
    
    // Autenticar banco
    await sequelize.authenticate();
    console.log('📊 Conexão com banco estabelecida');
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
