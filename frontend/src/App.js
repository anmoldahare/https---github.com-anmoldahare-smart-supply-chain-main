import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import './App.css';

// const socket = io('http://localhost:5000'); // Moved inside component for auth

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [credentials, setCredentials] = useState({ userId: '', password: '', role: 'driver' });
  const [vehicles, setVehicles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [language, setLanguage] = useState('en');
  const [socket, setSocket] = useState(null);
  
  // Forms state
  const [newRoute, setNewRoute] = useState({ vehicleId: '', destination: '' });

  const translations = {
    en: { welcome: 'Welcome', trip: 'Current Trip', dest: 'Destination', status: 'Status', start: 'Start Trip', onTime: 'On Time', delayed: 'Delayed', chat: 'Chat with Manager', active: 'Active' },
    hi: { welcome: 'स्वागत है', trip: 'वर्तमान यात्रा', dest: 'गंतव्य', status: 'स्थिति', start: 'यात्रा शुरू करें', onTime: 'समय पर', delayed: 'देरी', chat: 'मैनेजर से बात करें', active: 'सक्रिय' },
    mr: { welcome: 'स्वागत आहे', trip: 'चालू प्रवास', dest: 'मुक्काम', status: 'स्थिती', start: 'प्रवास सुरू करा', onTime: 'वेळेवर', delayed: 'उशीर', chat: 'व्यवस्थापकाशी बोला', active: 'सक्रिय' }
  };

  const t = translations[language];

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) return handleLogout();
      const data = await res.json();
      setAnalytics(data);
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const newSocket = io(window.location.origin, {
      auth: { token }
    });

    newSocket.on('vehiclesUpdate', (updatedVehicles) => {
      setVehicles(updatedVehicles);
      if (userRole === 'manager') fetchAnalytics();
    });

    newSocket.on('newMessage', (msg) => {
      setMessages(prev => [...prev, { 
        ...msg, 
        type: (userRole === 'driver' && msg.sender === 'Manager') || (userRole === 'manager' && msg.sender === 'Driver') 
          ? 'received' : 'sent' 
      }]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.off('vehiclesUpdate');
      newSocket.off('newMessage');
      newSocket.disconnect();
    };
  }, [token, userRole, fetchAnalytics]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: credentials.userId, password: credentials.password })
      });
      
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setUserRole(data.user.role);
        setIsLoggedIn(true);
        
        // Fetch initial data
        const vRes = await fetch('/api/vehicles', {
          headers: { 'Authorization': `Bearer ${data.token}` }
        });
        const vData = await vRes.json();
        setVehicles(vData);
        if (data.user.role === 'manager') fetchAnalytics();
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (error) { 
      console.error(error);
      alert('Server error. Please try again.');
    }
  };

  const handleAssignRoute = async (e) => {
    e.preventDefault();
    try {
      const vehicle = vehicles.find(v => v.id === newRoute.vehicleId);
      if (!vehicle) return;

      await fetch(`/api/vehicles/${newRoute.vehicleId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'active'
        })
      });
      alert('Route Assigned Successfully!');
      setNewRoute({ vehicleId: '', destination: '' });
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setUserRole(null);
    setVehicles([]);
    setMessages([]);
    if (socket) socket.disconnect();
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card glass">
          <div className="login-header">
            <h1>Smart Supply Chain</h1>
            <p>Next-gen Logistics Optimization Platform</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Access ID</label>
              <input type="text" value={credentials.userId} onChange={(e) => setCredentials({...credentials, userId: e.target.value})} placeholder="e.g. MGR001" required />
            </div>
            
            <div className="form-group">
              <label>Security Password</label>
              <input type="password" value={credentials.password} onChange={(e) => setCredentials({...credentials, password: e.target.value})} placeholder="••••••••" required />
            </div>
            
            <div className="form-group">
              <label>Portal Access</label>
              <div className="role-buttons">
                <button type="button" className={`role-btn ${credentials.role === 'driver' ? 'active' : ''}`} onClick={() => setCredentials({...credentials, role: 'driver'})}>Driver</button>
                <button type="button" className={`role-btn ${credentials.role === 'manager' ? 'active' : ''}`} onClick={() => setCredentials({...credentials, role: 'manager'})}>Manager</button>
              </div>
            </div>
            
            <button type="submit" className="login-btn">Secure Login</button>
          </form>
          
          <div className="glass" style={{marginTop: '32px', padding: '16px', fontSize: '12px', textAlign: 'center'}}>
            <span style={{color: 'var(--text-muted)'}}>Demo: </span>
            <code style={{color: 'var(--primary)'}}>DRV001 / driver123</code> or <code style={{color: 'var(--primary)'}}>MGR001 / manager123</code>
          </div>
        </div>
      </div>
    );
  }

  if (userRole === 'driver') {
    const driverVehicle = vehicles.find(v => v.driverId === credentials.userId.toUpperCase());
    
    return (
      <div className="dashboard">
        <header className="header glass">
          <h1>🚛 SupplyChain <span style={{color: 'var(--primary)'}}>Driver</span></h1>
          <div className="user-badge">
            <div className="lang-toggle">
              {['en', 'hi', 'mr'].map(l => (
                <button key={l} className={`lang-btn ${language === l ? 'active' : ''}`} onClick={() => setLanguage(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <span className="user-name">{t.welcome}, {user?.name}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </header>

        <div className="manager-content" style={{maxWidth: '1000px'}}>
          {driverVehicle ? (
            <>
              <div className="hero-card glass">
                <div className="trip-info">
                  <span className={`badge ${driverVehicle.status === 'active' ? 'badge-success' : 'badge-warning'}`} style={{marginBottom: '10px', display: 'inline-block'}}>
                    {driverVehicle.status === 'active' ? t.active : 'Idle'}
                  </span>
                  <h2>{t.trip}</h2>
                  <p>{t.dest}: <strong>{driverVehicle.destination?.address || 'Not Assigned'}</strong></p>
                </div>
                <div className="trip-stats">
                  <div style={{textAlign: 'right'}}>
                    <div style={{color: 'var(--text-muted)', fontSize: '14px'}}>ETA</div>
                    <div style={{fontSize: '32px', fontWeight: '800', color: driverVehicle.isDelayed ? 'var(--danger)' : 'var(--success)'}}>
                      {driverVehicle.eta ? new Date(driverVehicle.eta).toLocaleTimeString() : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="map-container glass">
                <iframe title="map" src={`https://maps.google.com/maps?q=${driverVehicle.currentLocation.lat},${driverVehicle.currentLocation.lng}&z=14&output=embed`} className="map-frame" allowFullScreen />
                <div style={{position: 'absolute', bottom: '24px', left: '24px', right: '24px', display: 'flex', gap: '12px'}}>
                  <button 
                    className="login-btn" 
                    style={{margin: 0, flex: 1}}
                    onClick={() => socket.emit('startTrip', { vehicleId: driverVehicle.id })}
                    disabled={driverVehicle.status === 'active'}
                  >
                    {driverVehicle.status === 'active' ? '🚀 Trip Active' : t.start}
                  </button>
                </div>
              </div>

              <div className="glass" style={{padding: '32px', marginBottom: '40px'}}>
                <h3 style={{marginBottom: '20px'}}>{t.chat}</h3>
                <div className="chat-body" style={{height: '250px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', marginBottom: '20px'}}>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`msg ${msg.type === 'sent' ? 'msg-sent' : 'msg-received'}`}>
                      {msg.message}
                    </div>
                  ))}
                </div>
                <div className="chat-footer" style={{padding: 0, border: 'none'}}>
                  <input className="chat-input" placeholder="Message manager..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newMessage) {
                      await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ message: newMessage, to: 'MGR001' }) });
                      setNewMessage('');
                    }
                  }} />
                  <button className="login-btn" style={{width: 'auto', padding: '0 24px', margin: 0}} onClick={async () => {
                    if (newMessage) {
                      await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ message: newMessage, to: 'MGR001' }) });
                      setNewMessage('');
                    }
                  }}>Send</button>
                </div>
              </div>
            </>
          ) : (
            <div className="glass" style={{padding: '80px', textAlign: 'center'}}>
              <h2>No active trip assigned</h2>
              <p style={{color: 'var(--text-muted)'}}>Please wait for your manager to assign your next route.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Manager Dashboard
  return (
    <div className="dashboard">
      <header className="header glass">
        <h1>📊 SupplyChain <span style={{color: 'var(--primary)'}}>Intelligence</span></h1>
        <div className="user-badge">
          <span className="user-name">Admin: {user?.name}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="manager-content">
        <div className="stats-grid">
          <div className="stat-card glass">
            <h3>Total Deliveries</h3>
            <div className="stat-number">{analytics?.totalDeliveries || 0}</div>
            <div className="stat-trend up">↑ 12% optimized</div>
          </div>
          <div className="stat-card glass">
            <h3>Fleet Efficiency</h3>
            <div className="stat-number">94%</div>
            <div className="stat-trend up">↑ 5% this month</div>
          </div>
          <div className="stat-card glass">
            <h3>Active Delays</h3>
            <div className="stat-number" style={{color: 'var(--danger)'}}>{analytics?.delayedDeliveries || 0}</div>
            <div className="stat-trend down">Requires Attention</div>
          </div>
        </div>

        <div className="data-section">
          <div className="glass" style={{padding: '32px'}}>
            <div className="card-title">
              <h2>Fleet Real-time Monitoring</h2>
            </div>
            <div className="table-container" style={{padding: 0}}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Driver</th>
                    <th>Location</th>
                    <th>ETA</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(v => (
                    <tr key={v.id}>
                      <td><strong>{v.id}</strong></td>
                      <td>{v.driverName}</td>
                      <td>{v.currentLocation.address}</td>
                      <td style={{color: v.isDelayed ? 'var(--danger)' : 'var(--success)'}}>{v.eta ? new Date(v.eta).toLocaleTimeString() : 'N/A'}</td>
                      <td>
                        <span className={`badge ${v.isDelayed ? 'badge-danger' : 'badge-success'}`}>
                          {v.isDelayed ? '⚠️ Delay' : '✅ Active'}
                        </span>
                      </td>
                      <td>
                        <button className="role-btn" style={{padding: '6px 12px', marginRight: '8px'}} onClick={() => setSelectedDriver(v)}>Chat</button>
                        {v.isDelayed && (
                          <button className="role-btn active" style={{padding: '6px 12px', background: 'var(--success)'}} onClick={async () => {
                            await fetch(`/api/vehicles/${v.id}/optimize`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({}) });
                          }}>Optimize</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass" style={{padding: '32px'}}>
            <h2>Dispatch Center</h2>
            <form onSubmit={handleAssignRoute} style={{marginTop: '24px'}}>
              <div className="form-group">
                <label>Vehicle Assignment</label>
                <select className="form-group input" style={{width: '100%', background: 'rgba(0,0,0,0.3)'}} value={newRoute.vehicleId} onChange={(e) => setNewRoute({...newRoute, vehicleId: e.target.value})}>
                  <option value="">Select Vehicle...</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.id} - {v.driverName}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Destination Target</label>
                <input className="form-group input" placeholder="e.g. Bandra East, Mumbai" value={newRoute.destination} onChange={(e) => setNewRoute({...newRoute, destination: e.target.value})} />
              </div>
              <button type="submit" className="login-btn" style={{width: '100%', margin: 0}}>Deploy Trip</button>
            </form>

            <div style={{marginTop: '40px'}}>
              <h3>Active Alerts</h3>
              {vehicles.filter(v => v.isDelayed).map(v => (
                <div key={v.id} className="glass" style={{padding: '16px', marginTop: '12px', borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)'}}>
                  <div style={{fontWeight: '700', color: 'var(--danger)'}}>{v.id}: {v.delayReason}</div>
                  <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>{v.currentLocation.address}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedDriver && (
        <div className="chat-widget glass">
          <div className="chat-header">
            <h3>Channel: {selectedDriver.driverName}</h3>
            <button className="logout-btn" style={{padding: '4px 8px'}} onClick={() => setSelectedDriver(null)}>✕</button>
          </div>
          <div className="chat-body">
            {messages.filter(m => m.vehicleId === selectedDriver.id).map((msg, idx) => (
              <div key={idx} className={`msg ${msg.type === 'sent' ? 'msg-sent' : 'msg-received'}`}>
                {msg.message}
              </div>
            ))}
          </div>
          <div className="chat-footer">
            <input className="chat-input" placeholder="Message driver..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={async (e) => {
              if (e.key === 'Enter' && newMessage) {
                await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ message: newMessage, to: selectedDriver }) });
                setNewMessage('');
              }
            }} />
            <button className="logout-btn" style={{background: 'var(--primary)', color: 'white', border: 'none'}} onClick={async () => {
              if (newMessage) {
                await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ message: newMessage, to: selectedDriver }) });
                setNewMessage('');
              }
            }}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;