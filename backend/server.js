const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);

const JWT_SECRET = 'your-super-secret-key-123'; // In production, use env variables

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Mock Users Database (Moved from frontend)
const users = [
  { id: 'MGR001', name: 'Rajesh Kumar', password: bcrypt.hashSync('manager123', 10), role: 'manager' },
  { id: 'DRV001', name: 'Amit Sharma', password: bcrypt.hashSync('driver123', 10), role: 'driver' },
  { id: 'DRV002', name: 'Vikram Singh', password: bcrypt.hashSync('driver123', 10), role: 'driver' },
  { id: 'DRV003', name: 'Rahul Verma', password: bcrypt.hashSync('driver123', 10), role: 'driver' }
];

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// Socket.io Middleware for Authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = user;
    next();
  });
});

// Mock Database
let vehicles = [
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

let messages = [];
let deliveries = [
  { id: 'D001', vehicleId: 'V001', status: 'completed', completedAt: new Date(Date.now() - 2 * 3600000) },
  { id: 'D002', vehicleId: 'V002', status: 'in-progress', startedAt: new Date(Date.now() - 1 * 3600000) },
  { id: 'D003', vehicleId: 'V001', status: 'completed', completedAt: new Date(Date.now() - 5 * 3600000) },
  { id: 'D004', vehicleId: 'V003', status: 'pending' }
];

// Simulate real-time location updates
setInterval(() => {
  vehicles.forEach(vehicle => {
    if (vehicle.status === 'active' && vehicle.route && vehicle.route.length > 0) {
      // Move vehicle along route
      const currentIndex = vehicle.route.findIndex(
        point => Math.abs(point.lat - vehicle.currentLocation.lat) < 0.01 &&
                 Math.abs(point.lng - vehicle.currentLocation.lng) < 0.01
      );
      
      if (currentIndex < vehicle.route.length - 1) {
        const nextPoint = vehicle.route[currentIndex + 1];
        vehicle.currentLocation = {
          ...nextPoint,
          address: vehicle.currentLocation.address
        };
        
        // Update ETA
        const remainingDistance = (vehicle.route.length - currentIndex - 1) * 5;
        const timeRemaining = (remainingDistance / vehicle.speed) * 60;
        vehicle.eta = new Date(Date.now() + timeRemaining * 60000);
        
        // Detect delays based on speed
        if (vehicle.speed < 25 && vehicle.speed > 0) {
          if (!vehicle.isDelayed) {
            vehicle.isDelayed = true;
            vehicle.delayReason = vehicle.speed < 15 ? 'Heavy traffic' : 'Slow speed';
            
            // Emit alert
            io.emit('delayAlert', {
              vehicleId: vehicle.id,
              driverName: vehicle.driverName,
              reason: vehicle.delayReason,
              suggestedAction: 'Route optimization recommended'
            });
          }
        } else {
          vehicle.isDelayed = false;
          vehicle.delayReason = null;
        }
        
        // Random speed variation
        vehicle.speed = Math.max(15, Math.min(60, vehicle.speed + (Math.random() - 0.5) * 5));
      }
    }
  });
  
  // Broadcast updates to all connected clients
  io.emit('vehiclesUpdate', vehicles);
}, 5000);

// Login Route
app.post('/api/login', async (req, res) => {
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
});

// API Routes
app.get('/api/vehicles', authenticateToken, (req, res) => {
  res.json(vehicles);
});

app.post('/api/vehicles', authenticateToken, (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can add vehicles' });
  const { driverName, driverId } = req.body;
  const newVehicle = {
    id: `V00${vehicles.length + 1}`,
    driverName,
    driverId,
    status: 'idle',
    currentLocation: { lat: 19.0760, lng: 72.8777, address: 'Mumbai Central' },
    destination: null,
    speed: 0,
    eta: null,
    startTime: null,
    route: [],
    isDelayed: false,
    delayReason: null,
    optimizedRoute: null
  };
  vehicles.push(newVehicle);
  res.json(newVehicle);
});

app.post('/api/assign-route', authenticateToken, (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can assign routes' });
  const { vehicleId, source, destination } = req.body;
  const vehicle = vehicles.find(v => v.id === vehicleId);
  
  if (vehicle) {
    vehicle.destination = destination;
    vehicle.status = 'active';
    vehicle.startTime = new Date();
    vehicle.currentLocation = source;
    
    // Create simple route
    vehicle.route = [
      source,
      { lat: (source.lat + destination.lat) / 2 + 0.01, lng: (source.lng + destination.lng) / 2 - 0.01 },
      destination
    ];
    
    const distance = 15; // km
    vehicle.speed = 40;
    vehicle.eta = new Date(Date.now() + (distance / vehicle.speed) * 3600000);
    
    // Add to deliveries
    deliveries.push({
      id: `D00${deliveries.length + 1}`,
      vehicleId,
      status: 'in-progress',
      startedAt: new Date()
    });
    
    res.json({ success: true, vehicle });
  } else {
    res.status(404).json({ error: 'Vehicle not found' });
  }
});

app.post('/api/optimize-route', authenticateToken, (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can optimize routes' });
  const { vehicleId } = req.body;
  const vehicle = vehicles.find(v => v.id === vehicleId);
  
  if (vehicle && vehicle.isDelayed) {
    // Create optimized route avoiding traffic
    const optimizedRoute = [
      vehicle.currentLocation,
      { lat: vehicle.currentLocation.lat + 0.02, lng: vehicle.currentLocation.lng - 0.03 },
      { lat: vehicle.destination.lat - 0.01, lng: vehicle.destination.lng + 0.02 },
      vehicle.destination
    ];
    
    vehicle.optimizedRoute = optimizedRoute;
    const newEta = new Date(Date.now() + 30 * 60000);
    
    io.emit('routeOptimized', {
      vehicleId,
      optimizedRoute,
      newEta,
      message: 'Better route found! ETA reduced by 15 minutes'
    });
    
    res.json({ success: true, optimizedRoute, newEta });
  } else {
    res.json({ success: false, message: 'No delay detected or vehicle not found' });
  }
});

app.get('/api/analytics', authenticateToken, (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Unauthorized access' });
  const completedDeliveries = deliveries.filter(d => d.status === 'completed').length;
  const delayedDeliveries = vehicles.filter(v => v.isDelayed && v.status === 'active').length;
  
  res.json({
    totalDeliveries: deliveries.length,
    completedDeliveries,
    delayedDeliveries,
    activeVehicles: vehicles.filter(v => v.status === 'active').length,
    idleVehicles: vehicles.filter(v => v.status === 'idle').length
  });
});

app.get('/api/messages/:vehicleId', authenticateToken, (req, res) => {
  const vehicleMessages = messages.filter(m => m.vehicleId === req.params.vehicleId);
  res.json(vehicleMessages);
});

app.post('/api/messages', authenticateToken, (req, res) => {
  const { vehicleId, sender, message, timestamp } = req.body;
  const newMessage = { id: Date.now(), vehicleId, sender, message, timestamp };
  messages.push(newMessage);
  
  io.emit('newMessage', newMessage);
  res.json(newMessage);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('startTrip', (data) => {
    const vehicle = vehicles.find(v => v.id === data.vehicleId);
    if (vehicle && vehicle.status === 'idle') {
      vehicle.status = 'active';
      vehicle.startTime = new Date();
      io.emit('tripStarted', { vehicleId: data.vehicleId, message: 'Trip started successfully' });
    }
  });
  
  socket.on('endTrip', (data) => {
    const vehicle = vehicles.find(v => v.id === data.vehicleId);
    if (vehicle) {
      vehicle.status = 'idle';
      vehicle.destination = null;
      vehicle.route = [];
      vehicle.eta = null;
      
      // Mark delivery as completed
      const delivery = deliveries.find(d => d.vehicleId === data.vehicleId && d.status === 'in-progress');
      if (delivery) {
        delivery.status = 'completed';
        delivery.completedAt = new Date();
      }
      
      io.emit('tripEnded', { vehicleId: data.vehicleId, message: 'Trip completed successfully' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});