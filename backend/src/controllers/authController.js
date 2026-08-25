const jwt = require('jsonwebtoken');
const { User, Barber } = require('../models');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuário
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar senha
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Se for barbeiro, buscar dados adicionais
    let barberData = null;
    if (user.role === 'barber') {
      barberData = await Barber.findOne({ where: { userId: user.id } });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        barber: barberData,
      },
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

const register = async (req, res) => {
  try {
    const { name, email, password, role = 'barber' } = req.body;

    // Verificar se email já existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Criar usuário
    const user = await User.create({ name, email, password, role });

    // Se for barbeiro, criar também na tabela Barber
    if (role === 'barber') {
      await Barber.create({
        userId: user.id,
        name,
        email,
        phone: req.body.phone || '',
        username: req.body.username || email.split('@')[0],
        password,
        commissionRate: req.body.commissionRate || 0.20,
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    let barberData = null;
    if (user.role === 'barber') {
      barberData = await Barber.findOne({ where: { userId: user.id } });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      barber: barberData,
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
};

const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.userId;

    if (!password) {
      return res.status(400).json({ error: 'Senha é obrigatória' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const isValid = await user.comparePassword(password);

    res.json({ valid: isValid });
  } catch (error) {
    console.error('❌ Erro ao verificar senha:', error);
    res.status(500).json({ error: 'Erro ao verificar senha' });
  }
};

module.exports = {
  login,
  register,
  me,
  verifyPassword, 
};