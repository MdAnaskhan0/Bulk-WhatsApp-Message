import React, { useState, useEffect } from 'react';
import {
  FaWhatsapp,
  FaPaperPlane,
  FaSpinner,
  FaCheck,
  FaTimes,
  FaUser,
  FaPhone,
  FaQrcode,
  FaSignOutAlt,
  FaGlobe,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartBar
} from 'react-icons/fa';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [qrCode, setQrCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [numbers, setNumbers] = useState('');
  const [status, setStatus] = useState('disconnected');
  const [clientInfo, setClientInfo] = useState(null);

  const API_BASE = 'http://localhost:5000/api';

  // Check status on component mount
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const initializeWhatsApp = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE}/initialize`);

      if (response.data.status === 'qr_generated') {
        setQrCode(response.data.qr);
        setStatus('qr_generated');
        toast.info('QR Code Generated - Please scan to connect', {
          position: "top-right",
          autoClose: 5000,
        });
      } else if (response.data.status === 'already_connected') {
        setIsConnected(true);
        setStatus('connected');
        fetchClientInfo();
        toast.success('WhatsApp is already connected!', {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('Error initializing WhatsApp:', error);
      toast.error(`Error initializing WhatsApp: ${error.message}`, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/status`);
      const connected = response.data.connected && response.data.ready;
      setIsConnected(connected);
      setStatus(connected ? 'connected' : 'disconnected');

      if (connected) {
        fetchClientInfo();
        if (status === 'qr_generated') {
          setQrCode('');
        }
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

  const validateNumbers = async () => {
    if (!numbers.trim()) {
      toast.warning('Please enter phone numbers to validate', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    try {
      const numbersArray = numbers.split('\n')
        .map(num => num.trim())
        .filter(num => num.length > 0);

      const response = await axios.post(`${API_BASE}/validate-numbers`, {
        numbers: numbersArray
      });

      const { validCount, invalidCount, results } = response.data;

      // Show validation results in toast
      if (invalidCount === 0) {
        toast.success(`✅ All ${validCount} numbers are valid!`, {
          position: "top-right",
          autoClose: 5000,
        });
      } else {
        toast.warning(
          <div>
            <div className="font-semibold">Validation Results:</div>
            <div>✅ {validCount} valid</div>
            <div>❌ {invalidCount} invalid</div>
            {invalidCount > 0 && (
              <div className="text-xs mt-1">
                Check console for invalid numbers details
              </div>
            )}
          </div>,
          {
            position: "top-right",
            autoClose: 5000,
          }
        );

        // Log invalid numbers to console for reference
        const invalidNumbers = results.filter(r => !r.valid);
        console.log('Invalid numbers:', invalidNumbers);
      }

    } catch (error) {
      console.error('Error validating numbers:', error);
      toast.error(`Error validating numbers: ${error.message}`, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const sendBulkMessages = async () => {
    if (!numbers.trim()) {
      toast.warning('Please enter phone numbers', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (!message.trim()) {
      toast.warning('Please enter a message', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (!isConnected) {
      toast.error('Please connect WhatsApp first', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    try {
      setIsLoading(true);

      const numbersArray = numbers.split('\n')
        .map(num => num.trim())
        .filter(num => num.length > 0);

      // Show sending started toast
      const sendingToast = toast.info(`🚀 Sending ${numbersArray.length} messages...`, {
        position: "top-right",
        autoClose: false,
        isLoading: true,
      });

      const response = await axios.post(`${API_BASE}/send-bulk`, {
        numbers: numbersArray,
        message: message
      });

      const { total, sent, failed, failedNumbers } = response.data;

      // Update toast with results
      toast.dismiss(sendingToast);

      if (failed === 0) {
        toast.success(
          <div>
            <div className="font-semibold">🎉 All messages sent successfully!</div>
            <div>✅ {sent} of {total} delivered</div>
          </div>,
          {
            position: "top-right",
            autoClose: 5000,
          }
        );
      } else {
        toast.warning(
          <div>
            <div className="font-semibold">Message Sending Results:</div>
            <div>✅ {sent} successful</div>
            <div>❌ {failed} failed</div>
            {failed > 0 && (
              <div className="text-xs mt-1">
                {failed} numbers failed - check console for details
              </div>
            )}
          </div>,
          {
            position: "top-right",
            autoClose: 5000,
          }
        );

        // Log failed numbers to console
        console.log('Failed numbers:', failedNumbers);
      }

    } catch (error) {
      console.error('Error sending messages:', error);
      toast.error(`Error sending messages: ${error.message}`, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWhatsApp = async () => {
    try {
      await axios.post(`${API_BASE}/disconnect`);
      setIsConnected(false);
      setStatus('disconnected');
      setQrCode('');
      setClientInfo(null);
      toast.info('WhatsApp disconnected successfully', {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Error disconnecting WhatsApp', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const StatusIndicator = ({ status }) => {
    const getStatusConfig = () => {
      switch (status) {
        case 'connected':
          return {
            color: 'bg-emerald-500',
            icon: <FaCheckCircle className="text-emerald-500" />,
            text: 'Connected',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200'
          };
        case 'qr_generated':
          return {
            color: 'bg-amber-500',
            icon: <FaExclamationTriangle className="text-amber-500" />,
            text: 'Scan QR Code',
            bg: 'bg-amber-50',
            border: 'border-amber-200'
          };
        default:
          return {
            color: 'bg-gray-400',
            icon: <FaTimes className="text-gray-400" />,
            text: 'Disconnected',
            bg: 'bg-gray-50',
            border: 'border-gray-200'
          };
      }
    };

    const config = getStatusConfig();

    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bg} ${config.border} border`}>
        {config.icon}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
          <span className="text-sm font-medium text-gray-700">{config.text}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* React Toastify Container */}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl shadow-lg">
              <FaWhatsapp className="text-3xl text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                WhatsApp Bulk Messenger
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Professional messaging platform for businesses</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Sidebar - Enhanced */}
          <div className="lg:col-span-1 space-y-6">
            {/* Connection Card - Enhanced */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FaGlobe className="text-xl text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Connection Status</h2>
              </div>

              <StatusIndicator status={status} />

              {clientInfo && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-3">Client Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <FaUser className="text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">{clientInfo.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <FaPhone className="text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone Number</p>
                        <p className="font-medium">+{clientInfo.phoneNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {!isConnected && status !== 'qr_generated' && (
                  <button
                    onClick={initializeWhatsApp}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white py-3 px-6 rounded-xl hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isLoading ? <FaSpinner className="animate-spin" /> : <FaQrcode className="text-lg" />}
                    Connect WhatsApp
                  </button>
                )}

                {isConnected && (
                  <button
                    onClick={disconnectWhatsApp}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-6 rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <FaSignOutAlt />
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* QR Code Card - Enhanced */}
            {status === 'qr_generated' && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <FaQrcode className="text-xl text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Scan QR Code</h3>
                </div>

                <div className="flex justify-center p-4 bg-white rounded-xl border-2 border-dashed border-amber-200">
                  <img
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    className="w-56 h-56 rounded-lg shadow-lg"
                  />
                </div>

                <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-sm text-amber-800 font-medium text-center">
                    Open WhatsApp → Settings → Linked Devices → Link a Device
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Main Content - Enhanced */}
          <div className="lg:col-span-2 space-y-8">
            {/* Message Form - Enhanced */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all hover:shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <FaPaperPlane className="text-xl text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Compose Message</h2>
              </div>

              {/* Numbers Input - Enhanced */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-lg font-semibold text-gray-800">
                    Phone Numbers
                  </label>
                  <span className="text-sm text-gray-500 font-medium">
                    {numbers.split('\n').filter(num => num.trim().length > 0).length} numbers
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    value={numbers}
                    onChange={(e) => setNumbers(e.target.value)}
                    placeholder="Enter phone numbers, one per line...
Example:
01981380806
01812345678
01798765432"
                    rows="5"
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-vertical font-mono text-sm bg-gray-50 transition-all duration-200"
                  />
                </div>

                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={validateNumbers}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                  >
                    <FaCheckCircle />
                    Validate Numbers
                  </button>
                </div>
              </div>

              {/* Message Input - Enhanced */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-lg font-semibold text-gray-800">
                    Message Content
                  </label>
                  <span className="text-sm text-gray-500 font-medium">
                    {message.length} characters
                  </span>
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here... You can use emojis and formatting as needed."
                  rows="6"
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-vertical bg-gray-50 transition-all duration-200"
                />
              </div>

              {/* Send Button - Enhanced */}
              <button
                onClick={sendBulkMessages}
                disabled={isLoading || !numbers.trim() || !message.trim() || !isConnected}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white py-4 px-8 rounded-xl hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <FaSpinner className="animate-spin text-xl" />
                ) : (
                  <FaPaperPlane className="text-xl" />
                )}
                {isLoading ? 'Sending Messages...' : 'Send Bulk Messages'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;