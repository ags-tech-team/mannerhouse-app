require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, syncDatabase } = require('./src/models');

const authRoutes = require('./src/routes/authRoutes');
const barberRoutes = require('./src/routes/barberRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const productRoutes = require('./src/routes/productRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const cashRegisterRoutes = require('./src/routes/cashRegisterRoutes');
const revenueRoutes = require('./src/routes/revenueRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const saleRoutes = require('./src/routes/saleRoutes');
const commissionRoutes = require('./src/routes/commissionRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/barbers', barberRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/cash-register', cashRegisterRoutes);
app.use('/api/revenues', revenueRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/commissions', commissionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API Manner House funcionando!',
    endpoints: {
      auth: '/api/auth',
      barbers: '/api/barbers',
      clients: '/api/clients',
      products: '/api/products',
      appointments: '/api/appointments',
      cashRegister: '/api/cash-register',
      revenues: '/api/revenues',
      expenses: '/api/expenses',
    }
  });
});

const startServer = async () => {
  try {
    await syncDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📊 Banco de dados SQLite inicializado`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
  }
};

startServer();

module.exports = app;