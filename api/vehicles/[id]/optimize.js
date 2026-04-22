const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-123';

const vehicles = [
  // same
];

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });

    const { id } = req.query;
    const vehicle = vehicles.find(v => v.id === id);

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    vehicle.optimizedRoute = vehicle.route.slice().reverse();

    res.json({ message: 'Route optimized', optimizedRoute: vehicle.optimizedRoute });
  });
}