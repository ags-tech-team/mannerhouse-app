require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'manner-haus-secret-key-2026';

app.use(cors());
app.use(express.json());

// Banco de dados em JSON (simulado)
const DB_PATH = path.join(__dirname, 'db.json');

// Inicializar DB se não existir
if (!fs.existsSync(DB_PATH)) {
  const initialData = {
    users: [
      {
        id: '1',
        name: 'Admin Manner',
        email: 'admin@mannerhaus.com',
        password: bcrypt.hashSync('123456', 8),
        role: 'admin',
        barberId: null,
        createdAt: new Date().toISOString(),
      },
    ],
    barbers: [],
    products: [],
    services: [],
    appointments: [],
    cashRegister: [],
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
}

// Funções para ler/escrever o DB
const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// Middleware para verificar token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// ---------- ROTAS PÚBLICAS ----------

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, barberId: user.barberId },
    SECRET_KEY,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      barberId: user.barberId,
    },
  });
});

// Registrar novo usuário (admin pode criar barbeiros, mas vamos liberar para teste)
app.post('/api/register', async (req, res) => {
  const { name, email, password, role, barberId } = req.body;
  const db = readDB();
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'E-mail já cadastrado' });
  }

  const hashedPassword = bcrypt.hashSync(password, 8);
  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password: hashedPassword,
    role: role || 'barber',
    barberId: barberId || null,
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({ message: 'Usuário criado com sucesso', user: newUser });
});

// ---------- ROTAS PROTEGIDAS ----------

// Obter todos os barbeiros (com informações do usuário)
app.get('/api/barbers', verifyToken, (req, res) => {
  const db = readDB();
  const barbers = db.barbers.map(barber => {
    const user = db.users.find(u => u.barberId === barber.id);
    return { ...barber, userEmail: user?.email, userId: user?.id };
  });
  res.json(barbers);
});

// Criar barbeiro (cria também um usuário com role 'barber')
app.post('/api/barbers', verifyToken, async (req, res) => {
  const { name, email, password, phone, commissionRate, isActive } = req.body;
  const db = readDB();

  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'E-mail já cadastrado' });
  }

  const newBarber = {
    id: Date.now().toString(),
    name,
    email,
    phone,
    commissionRate: commissionRate || 0.2,
    isActive: isActive !== undefined ? isActive : true,
    createdAt: new Date().toISOString(),
  };
  db.barbers.push(newBarber);

  const hashedPassword = bcrypt.hashSync(password || '123456', 8);
  const newUser = {
    id: Date.now().toString() + 'u',
    name,
    email,
    password: hashedPassword,
    role: 'barber',
    barberId: newBarber.id,
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({ ...newBarber, userEmail: email, userId: newUser.id });
});

// Atualizar barbeiro
app.put('/api/barbers/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { name, email, phone, commissionRate, isActive, password } = req.body;
  const db = readDB();

  const barberIndex = db.barbers.findIndex(b => b.id === id);
  if (barberIndex === -1) {
    return res.status(404).json({ error: 'Barbeiro não encontrado' });
  }

  db.barbers[barberIndex] = {
    ...db.barbers[barberIndex],
    name: name || db.barbers[barberIndex].name,
    email: email || db.barbers[barberIndex].email,
    phone: phone || db.barbers[barberIndex].phone,
    commissionRate: commissionRate !== undefined ? commissionRate : db.barbers[barberIndex].commissionRate,
    isActive: isActive !== undefined ? isActive : db.barbers[barberIndex].isActive,
  };

  const userIndex = db.users.findIndex(u => u.barberId === id);
  if (userIndex !== -1) {
    db.users[userIndex].name = name || db.users[userIndex].name;
    db.users[userIndex].email = email || db.users[userIndex].email;
    if (password) {
      db.users[userIndex].password = bcrypt.hashSync(password, 8);
    }
  }

  writeDB(db);
  res.json(db.barbers[barberIndex]);
});

// Deletar barbeiro (remove também o usuário vinculado)
app.delete('/api/barbers/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const db = readDB();

  const barberIndex = db.barbers.findIndex(b => b.id === id);
  if (barberIndex === -1) {
    return res.status(404).json({ error: 'Barbeiro não encontrado' });
  }

  db.barbers.splice(barberIndex, 1);
  db.users = db.users.filter(u => u.barberId !== id);
  writeDB(db);

  res.status(204).send();
});

// ---------- ROTA PARA PRODUTOS (exemplo) ----------
app.get('/api/products', verifyToken, (req, res) => {
  const db = readDB();
  res.json(db.products);
});

app.post('/api/products', verifyToken, (req, res) => {
  const db = readDB();
  const newProduct = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  db.products.push(newProduct);
  writeDB(db);
  res.status(201).json(newProduct);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🔥 Backend rodando em http://localhost:${PORT}`);
});