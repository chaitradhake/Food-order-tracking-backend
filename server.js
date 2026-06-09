require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const Order = require('./models/Order');
const authenticateUser = require('./middleware/userAuth');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-admin-panel';
let isAutoUpdateEnabled = true;

app.use(cors());
app.use(express.json());

// User authentication routes
app.use('/api/auth', authRoutes);

// MongoDB setup
let mongoServer;
const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (uri) {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB via MONGO_URI');
  } else {
    mongoServer = await MongoMemoryServer.create();
    const memoryUri = mongoServer.getUri();
    await mongoose.connect(memoryUri);
    console.log('Connected to In-Memory MongoDB');
  }
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

// Validation Middleware for Order Creation
const validateOrder = (req, res, next) => {
  const { customerName, items, totalAmount } = req.body;

  if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
    const error = new Error('customerName is required and cannot be empty.');
    error.status = 400;
    return next(error);
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    const error = new Error('items is required and must contain at least one item.');
    error.status = 400;
    return next(error);
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.name || typeof item.name !== 'string' || !item.name.trim()) {
      const error = new Error(`Item at index ${i} must have a name.`);
      error.status = 400;
      return next(error);
    }
    if (item.quantity === undefined || typeof item.quantity !== 'number' || item.quantity <= 0) {
      const error = new Error(`Item at index ${i} must have a valid quantity greater than 0.`);
      error.status = 400;
      return next(error);
    }
    if (item.price === undefined || typeof item.price !== 'number' || item.price < 0) {
      const error = new Error(`Item at index ${i} must have a valid price.`);
      error.status = 400;
      return next(error);
    }
  }

  if (totalAmount === undefined || typeof totalAmount !== 'number' || totalAmount <= 0) {
    const error = new Error('totalAmount is required and must be a number greater than 0.');
    error.status = 400;
    return next(error);
  }

  next();
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

// 2. Create Order (Validated and Authenticated)
app.post('/api/orders', authenticateUser, validateOrder, async (req, res, next) => {
  try {
    const { customerName, items, totalAmount } = req.body;
    const newOrder = new Order({ customerName, items, totalAmount });
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    next(err);
  }
});

// 3. Fetch All Orders
app.get('/api/orders', async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// 4. Fetch Single Order by ID (For customer tracking)
app.get('/api/orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Order not found');
      error.status = 404;
      return next(error);
    }
    const order = await Order.findById(id);
    if (!order) {
      const error = new Error('Order not found');
      error.status = 404;
      return next(error);
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// 5. Update Order Status (Protected Route)
app.put('/api/orders/:id/status', authenticateToken, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Preparing', 'Out for Delivery', 'Delivered'].includes(status)) {
      const error = new Error('Invalid status');
      error.status = 400;
      return next(error);
    }
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updatedOrder) {
      const error = new Error('Order not found');
      error.status = 404;
      return next(error);
    }
    res.json(updatedOrder);
  } catch (err) {
    next(err);
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

// Centralized Error Handling Middleware (4 params: err, req, res, next)
app.use((err, req, res, next) => {
  console.error('Centralized Error:', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
