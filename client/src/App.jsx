import React, { useState, useEffect } from 'react';
import { FaWhatsapp, FaQrcode, FaPaperPlane, FaSpinner, FaCheck, FaTimes, FaList, FaGlobe } from 'react-icons/fa';
import axios from 'axios';

function App() {
  const [qrCode, setQrCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [numbers, setNumbers] = useState('');
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [validationResults, setValidationResults] = useState(null);

  const API_BASE = 'http://localhost:5000/api';

  // Check status on component mount
  useEffect(() => {
    checkStatus();
  }, []);

  const initializeWhatsApp = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE}/initialize`);

      if (response.data.status === 'qr_generated') {
        setQrCode(response.data.qr);
        setStatus('qr_generated');
        // Start polling for connection status
        const pollInterval = setInterval(checkStatus, 3000);
        // Clear interval after 2 minutes
        setTimeout(() => clearInterval(pollInterval), 120000);
      } else if (response.data.status === 'already_connected') {
        setIsConnected(true);
        setStatus('connected');
      }
    } catch (error) {
      console.error('Error initializing WhatsApp:', error);
      alert('Error initializing WhatsApp: ' + error.message);
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

      if (connected && status === 'qr_generated') {
        setQrCode('');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setIsConnected(false);
      setStatus('disconnected');
    }
  };

  const validateNumbers = async () => {
    if (!numbers.trim()) {
      alert('Please enter phone numbers');
      return;
    }

    try {
      const numbersArray = numbers.split('\n')
        .map(num => num.trim())
        .filter(num => num.length > 0);

      const response = await axios.post(`${API_BASE}/validate-numbers`, {
        numbers: numbersArray
      });

      setValidationResults(response.data);

      if (response.data.invalidCount > 0) {
        alert(`Validation complete: ${response.data.validCount} valid, ${response.data.invalidCount} invalid numbers`);
      } else {
        alert(`All ${response.data.validCount} numbers are valid!`);
      }
    } catch (error) {
      console.error('Error validating numbers:', error);
      alert('Error validating numbers: ' + error.message);
    }
  };

  const sendBulkMessages = async () => {
    if (!numbers.trim()) {
      alert('Please enter phone numbers');
      return;
    }

    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    if (!isConnected) {
      alert('Please connect WhatsApp first');
      return;
    }

    try {
      setIsLoading(true);

      // Convert numbers string to array
      const numbersArray = numbers.split('\n')
        .map(num => num.trim())
        .filter(num => num.length > 0);

      const response = await axios.post(`${API_BASE}/send-bulk`, {
        numbers: numbersArray,
        message: message
      });

      setResults(response.data);
      alert(`Messages sent! Successful: ${response.data.sent}, Failed: ${response.data.failed}`);
    } catch (error) {
      console.error('Error sending messages:', error);
      alert('Error sending messages: ' + error.message);
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
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const formatNumbers = () => {
    const numbersArray = numbers.split('\n')
      .map(num => num.trim())
      .filter(num => num.length > 0);

    setNumbers(numbersArray.join('\n'));
  };

  const addSampleNumbers = () => {
    setNumbers(`01981380806
01812345678
01798765432
01911223344
01655667788`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <FaWhatsapp className="text-4xl text-green-500 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">WhatsApp Bulk Sender</h1>
            <FaGlobe className="text-2xl text-green-600 ml-2" />
          </div>
          <p className="text-gray-600 text-lg">
            Send messages to multiple Bangladesh WhatsApp numbers
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supported formats: 01981380806, 8801981380806, +8801981380806, 1981380806
          </p>
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${status === 'connected' ? 'bg-green-500' :
                  status === 'qr_generated' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
              <span className="text-lg font-semibold">
                Status: {status === 'connected' ? 'Connected' :
                  status === 'qr_generated' ? 'QR Code Generated - Scan with WhatsApp' : 'Disconnected'}
              </span>
            </div>

            <div className="flex gap-3">
              {!isConnected && status !== 'qr_generated' && (
                <button
                  onClick={initializeWhatsApp}
                  disabled={isLoading}
                  className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? <FaSpinner className="animate-spin" /> : <FaQrcode />}
                  Connect WhatsApp
                </button>
              )}

              {status === 'qr_generated' && (
                <button
                  onClick={checkStatus}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <FaSpinner className="animate-spin" />
                  Checking...
                </button>
              )}

              {isConnected && (
                <button
                  onClick={disconnectWhatsApp}
                  className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  <FaTimes />
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* QR Code Display */}
          {status === 'qr_generated' && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <p className="text-center mb-3 font-semibold text-gray-700">
                Scan this QR code with WhatsApp to connect:
              </p>
              <div className="bg-white p-4 rounded-lg inline-block border-2 border-gray-300">
                <pre className="text-xs font-mono">{qrCode}</pre>
              </div>
              <p className="text-center mt-3 text-sm text-gray-600">
                Open WhatsApp → Settings → Linked Devices → Link a Device
              </p>
            </div>
          )}
        </div>

        {/* Message Form */}
        {isConnected && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <FaPaperPlane className="text-green-500" />
              Send Bulk Messages
            </h2>

            {/* Numbers Input */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Bangladesh Phone Numbers (one per line)
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={addSampleNumbers}
                    className="flex items-center gap-1 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    Add Samples
                  </button>
                  <button
                    onClick={formatNumbers}
                    className="flex items-center gap-1 text-sm bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                  >
                    <FaList className="text-xs" />
                    Format
                  </button>
                  <button
                    onClick={validateNumbers}
                    className="flex items-center gap-1 text-sm bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                  >
                    Validate
                  </button>
                </div>
              </div>
              <textarea
                value={numbers}
                onChange={(e) => setNumbers(e.target.value)}
                placeholder="Enter Bangladesh phone numbers, one per line...
Examples:
01981380806
8801981380806  
+8801981380806
1981380806"
                rows="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical font-mono text-sm"
              />
              <p className="text-sm text-gray-500 mt-1">
                {numbers.split('\n').filter(num => num.trim().length > 0).length} numbers entered
              </p>
            </div>

            {/* Validation Results */}
            {validationResults && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold mb-2 text-gray-700">
                  Validation Results: {validationResults.validCount} valid, {validationResults.invalidCount} invalid
                </h4>
                {validationResults.invalidCount > 0 && (
                  <div className="max-h-32 overflow-y-auto">
                    {validationResults.results.filter(r => !r.valid).map((result, index) => (
                      <div key={index} className="text-sm text-red-600">
                        {result.original} → {result.error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                rows="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical"
              />
              <p className="text-sm text-gray-500 mt-1">
                Character count: {message.length}
              </p>
            </div>

            {/* Send Button */}
            <button
              onClick={sendBulkMessages}
              disabled={isLoading || !numbers.trim() || !message.trim()}
              className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-semibold"
            >
              {isLoading ? (
                <FaSpinner className="animate-spin" />
              ) : (
                <FaPaperPlane />
              )}
              {isLoading ? 'Sending Messages...' : 'Send Bulk Messages'}
            </button>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
              <FaCheck className="text-green-500" />
              Sending Results
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{results.total}</div>
                <div className="text-blue-800 font-medium">Total Numbers</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                <div className="text-2xl font-bold text-green-600">{results.sent}</div>
                <div className="text-green-800 font-medium">Successful</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
                <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                <div className="text-red-800 font-medium">Failed</div>
              </div>
            </div>

            {results.sentNumbers.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-gray-700">Successful Numbers ({results.sentNumbers.length}):</h4>
                <div className="bg-green-50 p-3 rounded-lg max-h-32 overflow-y-auto border border-green-200">
                  {results.sentNumbers.map((num, index) => (
                    <div key={index} className="text-sm text-green-700 font-mono">{num}</div>
                  ))}
                </div>
              </div>
            )}

            {results.failedNumbers.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-gray-700">Failed Numbers ({results.failedNumbers.length}):</h4>
                <div className="bg-red-50 p-3 rounded-lg max-h-32 overflow-y-auto border border-red-200">
                  {results.failedNumbers.map((num, index) => (
                    <div key={index} className="text-sm text-red-700 font-mono">{num}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;