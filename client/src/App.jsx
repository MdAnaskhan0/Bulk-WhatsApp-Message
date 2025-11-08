import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from './components/Home';
import BulkMessage from './components/BulkMessage';
import Message from './components/Message';
import Navbar from './components/Navbar';
import axios from 'axios';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [clientInfo, setClientInfo] = useState(null);
  const [status, setStatus] = useState('disconnected');

  const API_BASE = 'https://whatsblastengin.onrender.com';

  // Check status on component mount
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/status`);
      const connected = response.data.connected && response.data.ready;
      setIsConnected(connected);
      setStatus(connected ? 'connected' : 'disconnected');

      if (connected) {
        fetchClientInfo();
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setIsConnected(false);
      setStatus('disconnected');
    }
  };

  const fetchClientInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE}/client-info`);
      setClientInfo(response.data);
    } catch (error) {
      console.error('Error fetching client info:', error);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        {/* Show navbar only when connected */}
        {isConnected && clientInfo && (
          <Navbar clientInfo={clientInfo} />
        )}

        <Routes>
          <Route
            path="/"
            element={
              <Home
                isConnected={isConnected}
                status={status}
                clientInfo={clientInfo}
                setIsConnected={setIsConnected}
                setStatus={setStatus}
                setClientInfo={setClientInfo}
              />
            }
          />
          <Route
            path="/bulk-message"
            element={
              isConnected ?
                <BulkMessage clientInfo={clientInfo} /> :
                <Navigate to="/" replace />
            }
          />
          <Route
            path="/message"
            element={
              isConnected ?
                <Message clientInfo={clientInfo} /> :
                <Navigate to="/" replace />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;