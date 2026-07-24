const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');

// Middleware to authenticate delivery partner
const authenticateDelivery = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const secret = process.env.JWT_SECRET || 'super-secret-key-for-admin-panel';

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    if (!decoded || decoded.role !== 'delivery') {
      return res.status(403).json({ message: 'Access denied. Delivery access required.' });
    }
    req.user = decoded;
    next();
  });
};

// POST /api/delivery/login - Login for delivery partners
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find the user with role 'delivery'
    const user = await User.findOne({ email: email.toLowerCase(), role: 'delivery' });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Sign JWT token
    const secret = process.env.JWT_SECRET || 'super-secret-key-for-admin-panel';
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: 'delivery' },
      secret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/delivery/orders - Fetch assigned orders with status 'Out for Delivery'
router.get('/orders', authenticateDelivery, async (req, res, next) => {
  try {
    const orders = await Order.find({
      assignedDeliveryPartner: req.user.id,
      status: 'Out for Delivery'
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// PUT /api/delivery/orders/:id/status - Update order status to 'Delivered'
router.put('/orders/:id/status', authenticateDelivery, async (req, res, next) => {
  try {
    const { status } = req.body;

    if (status !== 'Delivered') {
      return res.status(400).json({ message: 'Invalid status. Only "Delivered" is allowed.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order is assigned to this delivery partner
    if (!order.assignedDeliveryPartner || order.assignedDeliveryPartner.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Access denied. Order is not assigned to you.' });
    }

    order.status = 'Delivered';
    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
