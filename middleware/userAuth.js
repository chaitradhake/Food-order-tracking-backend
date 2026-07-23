const jwt = require('jsonwebtoken');

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  // Use process.env.JWT_SECRET or fallback to default
  const secret = process.env.JWT_SECRET || 'super-secret-key-for-admin-panel';

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    if (!decoded || decoded.role !== 'customer') {
      return res.status(403).json({ message: 'Access denied. Customer access required.' });
    }
    req.user = decoded;
    next();
  });
};

module.exports = authenticateUser;
