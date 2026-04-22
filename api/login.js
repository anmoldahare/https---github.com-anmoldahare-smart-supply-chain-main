const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-123';

const users = [
  { id: 'MGR001', name: 'Rajesh Kumar', password: bcrypt.hashSync('manager123', 10), role: 'manager' },
  { id: 'DRV001', name: 'Amit Sharma', password: bcrypt.hashSync('driver123', 10), role: 'driver' },
  { id: 'DRV002', name: 'Vikram Singh', password: bcrypt.hashSync('driver123', 10), role: 'driver' },
  { id: 'DRV003', name: 'Rahul Verma', password: bcrypt.hashSync('driver123', 10), role: 'driver' }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, password } = req.body;
  const user = users.find(u => u.id === userId.toUpperCase());

  if (!user) {
    return res.status(401).json({ error: 'Invalid User ID' });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid Password' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
}