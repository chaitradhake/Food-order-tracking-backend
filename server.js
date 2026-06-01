const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const Order = require('./models/Order');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'super-secret-key-for-admin-panel'; // hardcoded for simplicity
let isAutoUpdateEnabled = true;

app.use(cors());
app.use(express.json());

// MongoDB in-memory setup
let mongoServer;
const connectDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('Connected to In-Memory MongoDB');
};

connectDB().catch(err => console.error(err));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// API Routes

// Settings Route
app.get('/api/settings/auto-update', (req, res) => {
  res.json({ enabled: isAutoUpdateEnabled });
});

app.post('/api/settings/auto-update', authenticateToken, (req, res) => {
  if (typeof req.body.enabled === 'boolean') {
    isAutoUpdateEnabled = req.body.enabled;
  }
  res.json({ enabled: isAutoUpdateEnabled });
});

// 1. Admin Login
// Returns a JWT token if credentials are 'admin'/'password'
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'password') {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// 2. Create Order
app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, items, total } = req.body;
    const newOrder = new Order({ customerName, items, total });
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 3. Fetch All Orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Update Order Status (Protected Route)
app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Preparing', 'Out for Delivery', 'Delivered'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(updatedOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cron-like automation loop
setInterval(async () => {
  if (!isAutoUpdateEnabled) return;
  try {
    const orders = await Order.find();
    const now = Date.now();
    for (let order of orders) {
      const ageMs = now - new Date(order.createdAt).getTime();
      let newStatus = null;
      if (order.status === 'Pending' && ageMs > 10000) newStatus = 'Preparing';
      else if (order.status === 'Preparing' && ageMs > 20000) newStatus = 'Out for Delivery';
      else if (order.status === 'Out for Delivery' && ageMs > 30000) newStatus = 'Delivered';

      if (newStatus) {
        order.status = newStatus;
        await order.save();
      }
    }
  } catch (e) {
    console.error('Auto-update error:', e.message);
  }
}, 3000);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
