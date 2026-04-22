const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-123';

let messages = []; // In serverless, this resets, but for demo

export default function handler(req, res) {
  // Authenticate
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });

    if (req.method === 'GET') {
      res.json(messages);
    } else if (req.method === 'POST') {
      const { message, to } = req.body;
      const newMessage = {
        id: Date.now().toString(),
        from: user.id,
        to,
        message,
        timestamp: new Date()
      };
      messages.push(newMessage);
      res.json(newMessage);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  });
}