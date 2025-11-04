const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Store active clients and their info
const activeClients = new Map();
const clientInfo = new Map();
const qrCodes = new Map(); // Store QR codes separately

// WhatsApp client initialization
function initializeWhatsAppClient(sessionId = 'default') {
    return new Promise((resolve, reject) => {
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: sessionId }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        let qrGenerated = false;

        client.on('qr', async (qr) => {
            console.log('QR Received for session:', sessionId);
            try {
                // Generate QR code as base64 image
                const qrImage = await qrcode.toDataURL(qr);
                qrCodes.set(sessionId, qrImage);
                qrGenerated = true;

                // Only resolve if this is the first QR code
                if (!activeClients.has(sessionId)) {
                    resolve({
                        client,
                        qr: qrImage,
                        status: 'qr_generated'
                    });
                }
            } catch (error) {
                if (!activeClients.has(sessionId)) {
                    reject(error);
                }
            }
        });

        client.on('ready', () => {
            console.log('Client is ready!');
            console.log('Connected as:', client.info.pushname, client.info.wid.user);

            activeClients.set(sessionId, client);
            qrCodes.delete(sessionId); // Remove QR code once connected

            clientInfo.set(sessionId, {
                connected: true,
                phoneNumber: client.info.wid.user,
                name: client.info.pushname || 'Unknown',
                wid: client.info.wid
            });

            // If client becomes ready during initialization, resolve with connected status
            if (!qrGenerated) {
                resolve({
                    client,
                    status: 'already_connected'
                });
            }
        });

        client.on('authenticated', () => {
            console.log('Authenticated!');
            qrCodes.delete(sessionId); // Remove QR code once authenticated
        });

        client.on('auth_failure', (msg) => {
            console.error('Authentication failure:', msg);
            qrCodes.delete(sessionId);
            if (!activeClients.has(sessionId)) {
                reject(new Error('Authentication failed: ' + msg));
            }
        });

        client.on('disconnected', (reason) => {
            console.log('Client was logged out', reason);
            activeClients.delete(sessionId);
            clientInfo.delete(sessionId);
            qrCodes.delete(sessionId);
        });

        client.on('message', message => {
            console.log('Received message:', message.body);
        });

        client.on('message_create', message => {
            if (message.fromMe) {
                console.log('Sent message:', message.body);
            }
        });

        // Initialize client
        client.initialize().catch(error => {
            if (!activeClients.has(sessionId)) {
                reject(error);
            }
        });

        // Set timeout for QR code generation
        setTimeout(() => {
            if (!qrGenerated && !activeClients.has(sessionId)) {
                reject(new Error('QR code generation timeout'));
            }
        }, 30000); // 30 seconds timeout
    });
}

// Function to format Bangladesh numbers
function formatBangladeshNumber(number) {
    // Remove all non-digit characters
    let cleanNumber = number.toString().replace(/\D/g, '');

    // If number starts with 0 (like 01981380806), remove the 0 and add 880
    if (cleanNumber.startsWith('0')) {
        cleanNumber = '880' + cleanNumber.substring(1);
    }
    // If number starts with +880, remove the +
    else if (cleanNumber.startsWith('880')) {
        // Already in correct format, just ensure no +
        cleanNumber = cleanNumber;
    }
    // If number starts with 880 but has +, remove it
    else if (cleanNumber.startsWith('880')) {
        cleanNumber = cleanNumber;
    }
    // If number is 11 digits and starts with 1 (like 1981380806), add 880
    else if (cleanNumber.length === 10 && cleanNumber.startsWith('1')) {
        cleanNumber = '880' + cleanNumber;
    }

    return cleanNumber;
}

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'WhatsApp Bulk Sender API',
        version: '1.0.0',
        status: 'running'
    });
});

// Initialize WhatsApp
app.post('/api/initialize', async (req, res) => {
    try {
        const { sessionId = 'default' } = req.body;

        // Check if already connected
        if (activeClients.has(sessionId)) {
            const client = activeClients.get(sessionId);
            if (client.info) {
                return res.json({
                    status: 'already_connected',
                    message: 'WhatsApp is already connected'
                });
            }
        }

        // Check if QR code already exists
        if (qrCodes.has(sessionId)) {
            return res.json({
                status: 'qr_generated',
                qr: qrCodes.get(sessionId),
                message: 'QR code already generated, please scan it'
            });
        }

        const result = await initializeWhatsAppClient(sessionId);

        if (result.status === 'already_connected') {
            res.json({
                status: 'already_connected',
                message: 'WhatsApp is already connected'
            });
        } else {
            res.json({
                status: 'qr_generated',
                qr: result.qr,
                message: 'Scan the QR code with WhatsApp to connect'
            });
        }
    } catch (error) {
        console.error('Initialization error:', error);
        res.status(500).json({
            error: error.message,
            details: 'Failed to initialize WhatsApp client'
        });
    }
});

// Check connection status
app.get('/api/status/:sessionId?', (req, res) => {
    const sessionId = req.params.sessionId || 'default';
    const client = activeClients.get(sessionId);
    const qrCode = qrCodes.get(sessionId);

    const isConnected = client && client.info ? true : false;
    const hasQr = !!qrCode;

    res.json({
        connected: isConnected,
        ready: isConnected,
        hasQr: hasQr,
        sessionId: sessionId,
        state: isConnected ? 'connected' : hasQr ? 'qr_pending' : 'disconnected'
    });
});

// Get QR code if available
app.get('/api/qr-code/:sessionId?', (req, res) => {
    const sessionId = req.params.sessionId || 'default';
    const qrCode = qrCodes.get(sessionId);

    if (qrCode) {
        res.json({
            hasQr: true,
            qr: qrCode,
            sessionId: sessionId
        });
    } else {
        res.json({
            hasQr: false,
            sessionId: sessionId
        });
    }
});

// Get client info
app.get('/api/client-info/:sessionId?', (req, res) => {
    const sessionId = req.params.sessionId || 'default';
    const info = clientInfo.get(sessionId);
    const client = activeClients.get(sessionId);

    if (info && client) {
        res.json({
            connected: true,
            phoneNumber: info.phoneNumber,
            name: info.name,
            wid: info.wid,
            sessionId: sessionId
        });
    } else {
        res.json({
            connected: false,
            phoneNumber: null,
            name: null,
            sessionId: sessionId
        });
    }
});

// Send bulk messages
app.post('/api/send-bulk', async (req, res) => {
    try {
        const { numbers, message, sessionId = 'default' } = req.body;
        const client = activeClients.get(sessionId);

        if (!client) {
            return res.status(400).json({
                error: 'WhatsApp client not connected',
                solution: 'Please initialize and connect WhatsApp first'
            });
        }

        if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
            return res.status(400).json({
                error: 'Numbers array is required and cannot be empty'
            });
        }

        if (!message || message.trim() === '') {
            return res.status(400).json({
                error: 'Message is required and cannot be empty'
            });
        }

        // Validate numbers limit (prevent abuse)
        if (numbers.length > 100) {
            return res.status(400).json({
                error: 'Too many numbers',
                message: 'Maximum 100 numbers allowed per request'
            });
        }

        const results = [];
        const failedNumbers = [];
        const sentNumbers = [];
        const notRegisteredNumbers = [];

        for (const number of numbers) {
            try {
                // Format Bangladesh number
                const formattedNumber = formatBangladeshNumber(number);

                console.log(`Processing: ${number} -> ${formattedNumber}`);

                // Validate formatted number
                if (formattedNumber.length !== 13 || !formattedNumber.startsWith('880')) {
                    results.push({
                        number,
                        formattedNumber,
                        status: 'invalid',
                        error: 'Invalid Bangladesh number format'
                    });
                    failedNumbers.push(number);
                    continue;
                }

                const chatId = `${formattedNumber}@c.us`;

                // Check if number exists on WhatsApp
                try {
                    console.log(`Checking if ${formattedNumber} is registered...`);
                    const isRegistered = await client.isRegisteredUser(chatId);

                    if (isRegistered) {
                        console.log(`Sending message to ${formattedNumber}...`);
                        const sentMessage = await client.sendMessage(chatId, message);

                        results.push({
                            number,
                            formattedNumber,
                            status: 'sent',
                            messageId: sentMessage.id._serialized
                        });
                        sentNumbers.push(number);
                        console.log(`✓ Message sent to ${formattedNumber}`);
                    } else {
                        results.push({
                            number,
                            formattedNumber,
                            status: 'not_registered'
                        });
                        notRegisteredNumbers.push(number);
                        failedNumbers.push(number);
                        console.log(`✗ Number ${formattedNumber} not registered on WhatsApp`);
                    }
                } catch (whatsappError) {
                    results.push({
                        number,
                        formattedNumber,
                        status: 'error',
                        error: whatsappError.message
                    });
                    failedNumbers.push(number);
                    console.error(`Error for ${formattedNumber}:`, whatsappError.message);
                }

                // Delay to avoid rate limiting (2 seconds between messages)
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                results.push({
                    number,
                    status: 'error',
                    error: error.message
                });
                failedNumbers.push(number);
                console.error(`Unexpected error for ${number}:`, error);
            }
        }

        const response = {
            total: numbers.length,
            sent: sentNumbers.length,
            failed: failedNumbers.length,
            notRegistered: notRegisteredNumbers.length,
            sentNumbers,
            failedNumbers,
            notRegisteredNumbers,
            details: results,
            sessionId: sessionId,
            timestamp: new Date().toISOString()
        };

        console.log(`Bulk send completed: ${sentNumbers.length} sent, ${failedNumbers.length} failed`);
        res.json(response);

    } catch (error) {
        console.error('Bulk send error:', error);
        res.status(500).json({
            error: error.message,
            details: 'Failed to send bulk messages'
        });
    }
});

// Send test message to single number
app.post('/api/send-test', async (req, res) => {
    try {
        const { number, message, sessionId = 'default' } = req.body;
        const client = activeClients.get(sessionId);

        if (!client) {
            return res.status(400).json({
                error: 'WhatsApp client not connected',
                solution: 'Please initialize and connect WhatsApp first'
            });
        }

        if (!number) {
            return res.status(400).json({
                error: 'Phone number is required'
            });
        }

        if (!message || message.trim() === '') {
            return res.status(400).json({
                error: 'Message is required'
            });
        }

        // Format Bangladesh number
        const formattedNumber = formatBangladeshNumber(number);
        const chatId = `${formattedNumber}@c.us`;

        console.log(`Testing number: ${number} -> ${formattedNumber}`);

        // Validate formatted number
        if (formattedNumber.length !== 13 || !formattedNumber.startsWith('880')) {
            return res.status(400).json({
                error: 'Invalid Bangladesh number format',
                originalNumber: number,
                formattedNumber: formattedNumber,
                expectedFormat: '13 digits starting with 880'
            });
        }

        const isRegistered = await client.isRegisteredUser(chatId);

        if (!isRegistered) {
            return res.status(400).json({
                error: 'Number not registered on WhatsApp',
                originalNumber: number,
                formattedNumber: formattedNumber,
                status: 'not_registered'
            });
        }

        const sentMessage = await client.sendMessage(chatId, message);

        res.json({
            success: true,
            message: 'Test message sent successfully',
            originalNumber: number,
            formattedNumber: formattedNumber,
            messageId: sentMessage.id._serialized,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Test send error:', error);
        res.status(500).json({
            error: error.message,
            originalNumber: req.body.number,
            details: 'Failed to send test message'
        });
    }
});

// Validate Bangladesh numbers
app.post('/api/validate-numbers', async (req, res) => {
    try {
        const { numbers } = req.body;

        if (!numbers || !Array.isArray(numbers)) {
            return res.status(400).json({
                error: 'Numbers array is required'
            });
        }

        if (numbers.length > 500) {
            return res.status(400).json({
                error: 'Too many numbers',
                message: 'Maximum 500 numbers allowed for validation'
            });
        }

        const validationResults = numbers.map(number => {
            const formattedNumber = formatBangladeshNumber(number);
            const isValid = formattedNumber.length === 13 && formattedNumber.startsWith('880');

            return {
                original: number,
                formatted: formattedNumber,
                valid: isValid,
                error: isValid ? null : 'Invalid Bangladesh number format. Expected: 13 digits starting with 880'
            };
        });

        const validCount = validationResults.filter(r => r.valid).length;
        const invalidCount = validationResults.filter(r => !r.valid).length;

        res.json({
            results: validationResults,
            validCount: validCount,
            invalidCount: invalidCount,
            total: numbers.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
            error: error.message,
            details: 'Failed to validate numbers'
        });
    }
});

// Get all active sessions
app.get('/api/sessions', (req, res) => {
    const sessions = [];

    activeClients.forEach((client, sessionId) => {
        const info = clientInfo.get(sessionId);
        sessions.push({
            sessionId,
            connected: !!client.info,
            phoneNumber: info?.phoneNumber,
            name: info?.name,
            ready: client.info ? true : false
        });
    });

    res.json({
        totalSessions: sessions.length,
        sessions: sessions
    });
});

// Disconnect WhatsApp
app.post('/api/disconnect/:sessionId?', async (req, res) => {
    try {
        const sessionId = req.params.sessionId || 'default';
        const client = activeClients.get(sessionId);

        if (client) {
            await client.destroy();
            activeClients.delete(sessionId);
            clientInfo.delete(sessionId);
            qrCodes.delete(sessionId);

            res.json({
                message: 'Disconnected successfully',
                sessionId: sessionId
            });
        } else {
            res.status(400).json({
                error: 'No active connection found',
                sessionId: sessionId
            });
        }
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({
            error: error.message,
            details: 'Failed to disconnect WhatsApp'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        activeSessions: activeClients.size,
        pendingQrSessions: qrCodes.size,
        memory: process.memoryUsage()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 WhatsApp Bulk Sender API Started`);
    console.log(`🌐 Base URL: http://localhost:${PORT}`);
    console.log(`🇧🇩 Bangladesh number support enabled`);
    console.log(`📋 Supported formats: 01981380806, 8801981380806, +8801981380806, 1981380806`);
    console.log(`💡 Make sure to allow the required permissions for WhatsApp Web`);
});

module.exports = app;