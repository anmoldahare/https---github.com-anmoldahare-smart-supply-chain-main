const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-123';

const vehicles = [
  // same as above
  {
    id: 'V001',
    driverName: 'Amit Sharma',
    driverId: 'DRV001',
    status: 'active',
    currentLocation: { lat: 19.0760, lng: 72.8777, address: 'Mumbai Central' },
    destination: { lat: 19.1289, lng: 72.8475, address: 'Bandra East' },
    speed: 35,
    eta: new Date(Date.now() + 45 * 60000),
    startTime: new Date(),
    route: [
      { lat: 19.0760, lng: 72.8777 },
      { lat: 19.0900, lng: 72.8600 },
      { lat: 19.1289, lng: 72.8475 }
    ],
    isDelayed: false,
    delayReason: null,
    optimizedRoute: null
  },
  {
    id: 'V002',
    driverName: 'Vikram Singh',
    driverId: 'DRV002',
    status: 'active',
    currentLocation: { lat: 19.0820, lng: 72.8850, address: 'Dadar' },
    destination: { lat: 19.0883, lng: 72.8667, address: 'Andheri' },
    speed: 20,
    eta: new Date(Date.now() + 75 * 60000),
    startTime: new Date(),
    route: [
      { lat: 19.0820, lng: 72.8850 },
      { lat: 19.0850, lng: 72.8750 },
      { lat: 19.0883, lng: 72.8667 }
    ],
    isDelayed: true,
    delayReason: 'Traffic congestion',
    optimizedRoute: [
      { lat: 19.0820, lng: 72.8850 },
      { lat: 19.0800, lng: 72.8700 },
      { lat: 19.0883, lng: 72.8667 }
    ]
  },
  {
    id: 'V003',
    driverName: 'Rahul Verma',
    driverId: 'DRV003',
    status: 'idle',
    currentLocation: { lat: 19.1178, lng: 72.8667, address: 'Andheri East' },
    destination: null,
    speed: 0,
    eta: null,
    startTime: null,
    route: [],
    isDelayed: false,
    delayReason: null,
    optimizedRoute: null
  }
];

const deliveries = [
  { id: 'D001', vehicleId: 'V001', status: 'completed', completedAt: new Date(Date.now() - 2 * 3600000) },
  { id: 'D002', vehicleId: 'V002', status: 'in-progress', startedAt: new Date(Date.now() - 1 * 3600000) },
  { id: 'D003', vehicleId: 'V001', status: 'completed', completedAt: new Date(Date.now() - 5 * 3600000) },
  { id: 'D004', vehicleId: 'V003', status: 'pending' }
];

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });

    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(v => v.status === 'active').length;
    const delayedVehicles = vehicles.filter(v => v.isDelayed).length;
    const completedDeliveries = deliveries.filter(d => d.status === 'completed').length;
    const inProgressDeliveries = deliveries.filter(d => d.status === 'in-progress').length;

    res.json({
      totalVehicles,
      activeVehicles,
      delayedVehicles,
      completedDeliveries,
      inProgressDeliveries
    });
  });
}