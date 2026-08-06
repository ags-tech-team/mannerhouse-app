const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

const barberMiddleware = (req, res, next) => {
  if (req.user.role !== 'barber' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas barbeiros.' });
  }
  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  barberMiddleware,
};