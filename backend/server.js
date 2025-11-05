const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mime = require('mime-types');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + mime.extension(file.mimetype));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types for WhatsApp
        cb(null, true);
    }
});

// Store active clients and their info
const activeClients = new Map();
const clientInfo = new Map();
const qrCodes = new Map();
const clientInitializing = new Map(); // Track clients being initialized

// WhatsApp client initialization with better error handling
function initializeWhatsAppClient(sessionId = 'default') {
    return new Promise((resolve, reject) => {
        // Check if already initializing
        if (clientInitializing.has(sessionId)) {
            return reject(new Error('Client is already being initialized'));
        }

        clientInitializing.set(sessionId, true);

        // Clean up any existing client for this session
        if (activeClients.has(sessionId)) {
            const existingClient = activeClients.get(sessionId);
            try {
                existingClient.destroy().catch(console.error);
            } catch (error) {
                console.error('Error destroying existing client:', error);
            }
            activeClients.delete(sessionId);
            clientInfo.delete(sessionId);
        }

        // Clear any existing QR code
        qrCodes.delete(sessionId);

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: sessionId,
                dataPath: path.join(__dirname, 'sessions')
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--single-process'
                ],
                timeout: 60000
            },
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
            }
        });

        let qrGenerated = false;
        let isResolved = false;

        const resolveOnce = (result) => {
            if (!isResolved) {
                isResolved = true;
                clientInitializing.delete(sessionId);
                resolve(result);
            }
        };

        const rejectOnce = (error) => {
            if (!isResolved) {
                isResolved = true;
                clientInitializing.delete(sessionId);

                // Clean up on rejection
                try {
                    client.destroy().catch(() => { });
                } catch (e) { }

                activeClients.delete(sessionId);
                clientInfo.delete(sessionId);
                qrCodes.delete(sessionId);

                reject(error);
            }
        };

        client.on('qr', async (qr) => {
            console.log('QR Received for session:', sessionId);
            try {
                // Generate QR code as base64 image
                const qrImage = await qrcode.toDataURL(qr);
                qrCodes.set(sessionId, qrImage);
                qrGenerated = true;

                // Only resolve if this is the first QR code
                if (!activeClients.has(sessionId)) {
                    resolveOnce({
                        client,
                        qr: qrImage,
                        status: 'qr_generated'
                    });
                }
            } catch (error) {
                console.error('QR generation error:', error);
                if (!activeClients.has(sessionId)) {
                    rejectOnce(error);
                }
            }
        });

        client.on('ready', () => {
            console.log('Client is ready!');
            console.log('Connected as:', client.info.pushname, client.info.wid.user);

            activeClients.set(sessionId, client);
            qrCodes.delete(sessionId); // Remove QR code once connected
            clientInitializing.delete(sessionId);

            clientInfo.set(sessionId, {
                connected: true,
                phoneNumber: client.info.wid.user,
                name: client.info.pushname || 'Unknown',
                wid: client.info.wid
            });

            // If client becomes ready during initialization, resolve with connected status
            if (!qrGenerated && !isResolved) {
                resolveOnce({
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
            if (!activeClients.has(sessionId) && !isResolved) {
                rejectOnce(new Error('Authentication failed: ' + msg));
            }
        });

        client.on('disconnected', (reason) => {
            console.log('Client was logged out:', reason);
            activeClients.delete(sessionId);
            clientInfo.delete(sessionId);
            qrCodes.delete(sessionId);
            clientInitializing.delete(sessionId);

            // Clean up session files if needed
            cleanupSessionFiles(sessionId);
        });

        client.on('message', message => {
            console.log('Received message:', message.body);
        });

        client.on('message_create', message => {
            if (message.fromMe) {
                console.log('Sent message:', message.body);
            }
        });

        // Handle client errors
        client.on('error', (error) => {
            console.error('Client error for session', sessionId, ':', error);

            if (!isResolved) {
                rejectOnce(error);
            }
        });

        // Initialize client with better error handling
        client.initialize().catch(error => {
            console.error('Client initialization error:', error);
            if (!activeClients.has(sessionId) && !isResolved) {
                rejectOnce(error);
            }
        });

        // Set timeout for QR code generation
        const timeout = setTimeout(() => {
            if (!qrGenerated && !activeClients.has(sessionId) && !isResolved) {
                console.log('QR code generation timeout for session:', sessionId);

                // Clean up the client
                try {
                    client.destroy().catch(() => { });
                } catch (e) { }

                rejectOnce(new Error('QR code generation timeout - please try again'));
            }
        }, 45000); // 45 seconds timeout

        // Clear timeout if resolved
        if (isResolved) {
            clearTimeout(timeout);
        }
    });
}

// Function to cleanup session files
function cleanupSessionFiles(sessionId) {
    try {
        const sessionPath = path.join(__dirname, 'sessions', `session-${sessionId}`);
        if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log('Cleaned up session files for:', sessionId);
        }
    } catch (error) {
        console.error('Error cleaning up session files:', error);
    }
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

// Function to create MessageMedia from file
async function createMediaFromFile(filePath, caption = '') {
    try {
        const media = MessageMedia.fromFilePath(filePath);
        return media;
    } catch (error) {
        console.error('Error creating media from file:', error);
        throw error;
    }
}

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'WhatsApp Bulk Sender API',
        version: '1.0.0',
        status: 'running',
        features: ['text_messages', 'file_sharing']
    });
});

// Initialize WhatsApp with improved error handling
app.post('/api/initialize', async (req, res) => {
    try {
        const { sessionId = 'default' } = req.body;

        console.log('Initializing WhatsApp for session:', sessionId);

        // Check if already connected and ready
        if (activeClients.has(sessionId)) {
            const client = activeClients.get(sessionId);
            if (client.info && client.info.wid) {
                return res.json({
                    status: 'already_connected',
                    message: 'WhatsApp is already connected'
                });
            }
        }

        // Check if already initializing
        if (clientInitializing.has(sessionId)) {
            return res.status(409).json({
                error: 'Client is already being initialized',
                message: 'Please wait for the current initialization to complete'
            });
        }

        // Check if QR code already exists and is still valid
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

        // Clean up on error
        const sessionId = req.body.sessionId || 'default';
        clientInitializing.delete(sessionId);

        res.status(500).json({
            error: error.message,
            details: 'Failed to initialize WhatsApp client',
            solution: 'Please try again. If the problem persists, restart the server.'
        });
    }
});

// Check connection status
app.get('/api/status/:sessionId?', (req, res) => {
    const sessionId = req.params.sessionId || 'default';
    const client = activeClients.get(sessionId);
    const qrCode = qrCodes.get(sessionId);
    const isInitializing = clientInitializing.has(sessionId);

    const isConnected = client && client.info ? true : false;
    const hasQr = !!qrCode;

    res.json({
        connected: isConnected,
        ready: isConnected,
        hasQr: hasQr,
        initializing: isInitializing,
        sessionId: sessionId,
        state: isConnected ? 'connected' : hasQr ? 'qr_pending' : isInitializing ? 'initializing' : 'disconnected'
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

    if (info && client && client.info) {
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

// Upload file endpoint
app.post('/api/upload-file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded'
            });
        }

        const fileInfo = {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            uploadTime: new Date().toISOString()
        };

        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: fileInfo
        });

    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({
            error: error.message,
            details: 'Failed to upload file'
        });
    }
});

// Send bulk messages with file support
app.post('/api/send-bulk', async (req, res) => {
    try {
        const { numbers, message, filePath, fileName, sessionId = 'default' } = req.body;
        const client = activeClients.get(sessionId);

        if (!client) {
            return res.status(400).json({
                error: 'WhatsApp client not connected',
                solution: 'Please initialize and connect WhatsApp first'
            });
        }

        // Check if client is actually ready
        if (!client.info) {
            return res.status(400).json({
                error: 'WhatsApp client not ready',
                solution: 'Please wait for WhatsApp to fully connect'
            });
        }

        if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
            return res.status(400).json({
                error: 'Numbers array is required and cannot be empty'
            });
        }

        // At least one of message or file should be provided
        if ((!message || message.trim() === '') && !filePath) {
            return res.status(400).json({
                error: 'Either message or file is required'
            });
        }

        // Validate numbers limit (prevent abuse)
        if (numbers.length > 100) {
            return res.status(400).json({
                error: 'Too many numbers',
                message: 'Maximum 100 numbers allowed per request'
            });
        }

        let media = null;
        if (filePath) {
            try {
                // Check if file exists
                if (!fs.existsSync(filePath)) {
                    return res.status(400).json({
                        error: 'File not found',
                        details: `File path: ${filePath}`
                    });
                }
                media = await createMediaFromFile(filePath, message);
            } catch (error) {
                return res.status(400).json({
                    error: 'Failed to load file',
                    details: error.message
                });
            }
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
                        console.log(`Sending ${media ? 'file' : 'message'} to ${formattedNumber}...`);

                        let sentMessage;
                        if (media) {
                            // Send file with optional caption
                            sentMessage = await client.sendMessage(chatId, media, {
                                caption: message || ''
                            });
                        } else {
                            // Send text message only
                            sentMessage = await client.sendMessage(chatId, message);
                        }

                        results.push({
                            number,
                            formattedNumber,
                            status: 'sent',
                            messageId: sentMessage.id._serialized,
                            type: media ? 'file' : 'text'
                        });
                        sentNumbers.push(number);
                        console.log(`✓ ${media ? 'File' : 'Message'} sent to ${formattedNumber}`);
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
            timestamp: new Date().toISOString(),
            type: media ? 'file' : 'text'
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

// Disconnect WhatsApp with improved cleanup
app.post('/api/disconnect/:sessionId?', async (req, res) => {
    try {
        const sessionId = req.params.sessionId || 'default';
        const client = activeClients.get(sessionId);

        if (client) {
            console.log('Disconnecting client for session:', sessionId);
            await client.destroy();
            activeClients.delete(sessionId);
            clientInfo.delete(sessionId);
            qrCodes.delete(sessionId);
            clientInitializing.delete(sessionId);

            // Clean up session files
            cleanupSessionFiles(sessionId);

            res.json({
                message: 'Disconnected successfully',
                sessionId: sessionId
            });
        } else {
            // Clean up any residual data
            activeClients.delete(sessionId);
            clientInfo.delete(sessionId);
            qrCodes.delete(sessionId);
            clientInitializing.delete(sessionId);
            cleanupSessionFiles(sessionId);

            res.json({
                message: 'No active connection found - cleaned up residual data',
                sessionId: sessionId
            });
        }
    } catch (error) {
        console.error('Disconnect error:', error);

        // Force cleanup on error
        const sessionId = req.params.sessionId || 'default';
        activeClients.delete(sessionId);
        clientInfo.delete(sessionId);
        qrCodes.delete(sessionId);
        clientInitializing.delete(sessionId);
        cleanupSessionFiles(sessionId);

        res.status(500).json({
            error: error.message,
            details: 'Failed to disconnect WhatsApp - forced cleanup performed'
        });
    }
});

// Force cleanup endpoint
app.post('/api/force-cleanup/:sessionId?', async (req, res) => {
    try {
        const sessionId = req.params.sessionId || 'default';

        // Clean up all data for session
        if (activeClients.has(sessionId)) {
            const client = activeClients.get(sessionId);
            try {
                await client.destroy();
            } catch (error) {
                console.error('Error destroying client during force cleanup:', error);
            }
        }

        activeClients.delete(sessionId);
        clientInfo.delete(sessionId);
        qrCodes.delete(sessionId);
        clientInitializing.delete(sessionId);
        cleanupSessionFiles(sessionId);

        res.json({
            message: 'Force cleanup completed',
            sessionId: sessionId
        });
    } catch (error) {
        console.error('Force cleanup error:', error);
        res.status(500).json({
            error: error.message,
            details: 'Failed to perform force cleanup'
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
        initializingSessions: clientInitializing.size,
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
    console.log(`📎 File upload support enabled`);
    console.log(`🇧🇩 Bangladesh number support enabled`);
    console.log(`📋 Supported formats: 01981380806, 8801981380806, +8801981380806, 1981380806`);
    console.log(`💡 Make sure to allow the required permissions for WhatsApp Web`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server gracefully...');

    // Destroy all active clients
    for (const [sessionId, client] of activeClients) {
        try {
            await client.destroy();
            console.log(`Destroyed client for session: ${sessionId}`);
        } catch (error) {
            console.error(`Error destroying client for session ${sessionId}:`, error);
        }
    }

    process.exit(0);
});

module.exports = app;