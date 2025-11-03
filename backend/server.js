// const express = require('express');
// const cors = require('cors');
// const { Client, LocalAuth } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal');

// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use(cors());
// app.use(express.json());

// // Store active clients
// const activeClients = new Map();

// // WhatsApp client initialization
// function initializeWhatsAppClient(sessionId = 'default') {
//     return new Promise((resolve, reject) => {
//         const client = new Client({
//             authStrategy: new LocalAuth({ clientId: sessionId }),
//             puppeteer: {
//                 headless: true,
//                 args: [
//                     '--no-sandbox',
//                     '--disable-setuid-sandbox',
//                     '--disable-dev-shm-usage',
//                     '--disable-accelerated-2d-canvas',
//                     '--no-first-run',
//                     '--no-zygote',
//                     '--disable-gpu'
//                 ]
//             }
//         });

//         client.on('qr', (qr) => {
//             console.log('QR Received for session:', sessionId);
//             qrcode.generate(qr, { small: true });
//             resolve({ client, qr });
//         });

//         client.on('ready', () => {
//             console.log('Client is ready!');
//             activeClients.set(sessionId, client);
//         });

//         client.on('authenticated', () => {
//             console.log('Authenticated!');
//         });

//         client.on('auth_failure', (msg) => {
//             console.error('Authentication failure:', msg);
//             reject(new Error('Authentication failed'));
//         });

//         client.on('disconnected', (reason) => {
//             console.log('Client was logged out', reason);
//             activeClients.delete(sessionId);
//         });

//         client.initialize();
//     });
// }

// // Routes
// app.get('/', (req, res) => {
//     res.json({ message: 'WhatsApp Bulk Sender API' });
// });

// // Initialize WhatsApp
// app.post('/api/initialize', async (req, res) => {
//     try {
//         const { sessionId = 'default' } = req.body;

//         if (activeClients.has(sessionId)) {
//             const client = activeClients.get(sessionId);
//             if (client.info) {
//                 return res.json({ 
//                     status: 'already_connected', 
//                     message: 'WhatsApp is already connected' 
//                 });
//             }
//         }

//         const { client, qr } = await initializeWhatsAppClient(sessionId);
//         res.json({ status: 'qr_generated', qr });
//     } catch (error) {
//         console.error('Initialization error:', error);
//         res.status(500).json({ error: error.message });
//     }
// });

// // Check connection status
// app.get('/api/status/:sessionId?', (req, res) => {
//     const sessionId = req.params.sessionId || 'default';
//     const client = activeClients.get(sessionId);

//     const isConnected = client && client.info ? true : false;

//     res.json({ 
//         connected: isConnected,
//         ready: isConnected
//     });
// });

// // Send bulk messages
// app.post('/api/send-bulk', async (req, res) => {
//     try {
//         const { numbers, message, sessionId = 'default' } = req.body;
//         const client = activeClients.get(sessionId);

//         if (!client) {
//             return res.status(400).json({ error: 'WhatsApp client not connected' });
//         }

//         if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
//             return res.status(400).json({ error: 'Numbers array is required' });
//         }

//         if (!message || message.trim() === '') {
//             return res.status(400).json({ error: 'Message is required' });
//         }

//         const results = [];
//         const failedNumbers = [];

//         for (const number of numbers) {
//             try {
//                 // Format number for WhatsApp (remove all non-digit characters)
//                 const formattedNumber = number.toString().replace(/\D/g, '');

//                 // Ensure number has country code
//                 if (formattedNumber.length < 10) {
//                     results.push({ number, status: 'invalid', error: 'Number too short' });
//                     failedNumbers.push(number);
//                     continue;
//                 }

//                 const chatId = `${formattedNumber}@c.us`;

//                 // Check if number exists on WhatsApp
//                 try {
//                     const isRegistered = await client.isRegisteredUser(chatId);

//                     if (isRegistered) {
//                         await client.sendMessage(chatId, message);
//                         results.push({ number, status: 'sent' });
//                         console.log(`Message sent to ${number}`);
//                     } else {
//                         results.push({ number, status: 'not_registered' });
//                         failedNumbers.push(number);
//                         console.log(`Number ${number} not registered on WhatsApp`);
//                     }
//                 } catch (whatsappError) {
//                     results.push({ number, status: 'error', error: whatsappError.message });
//                     failedNumbers.push(number);
//                     console.error(`Error for ${number}:`, whatsappError.message);
//                 }

//                 // Delay to avoid rate limiting
//                 await new Promise(resolve => setTimeout(resolve, 2000));

//             } catch (error) {
//                 results.push({ number, status: 'error', error: error.message });
//                 failedNumbers.push(number);
//                 console.error(`Unexpected error for ${number}:`, error);
//             }
//         }

//         res.json({
//             total: numbers.length,
//             sent: results.filter(r => r.status === 'sent').length,
//             failed: failedNumbers.length,
//             failedNumbers,
//             details: results
//         });

//     } catch (error) {
//         console.error('Bulk send error:', error);
//         res.status(500).json({ error: error.message });
//     }
// });

// // Send test message to single number
// app.post('/api/send-test', async (req, res) => {
//     try {
//         const { number, message, sessionId = 'default' } = req.body;
//         const client = activeClients.get(sessionId);

//         if (!client) {
//             return res.status(400).json({ error: 'WhatsApp client not connected' });
//         }

//         const formattedNumber = number.replace(/\D/g, '');
//         const chatId = `${formattedNumber}@c.us`;

//         const isRegistered = await client.isRegisteredUser(chatId);

//         if (!isRegistered) {
//             return res.status(400).json({ error: 'Number not registered on WhatsApp' });
//         }

//         await client.sendMessage(chatId, message);
//         res.json({ success: true, message: 'Test message sent successfully' });

//     } catch (error) {
//         console.error('Test send error:', error);
//         res.status(500).json({ error: error.message });
//     }
// });

// // Disconnect WhatsApp
// app.post('/api/disconnect/:sessionId?', (req, res) => {
//     const sessionId = req.params.sessionId || 'default';
//     const client = activeClients.get(sessionId);

//     if (client) {
//         client.destroy();
//         activeClients.delete(sessionId);
//         res.json({ message: 'Disconnected successfully' });
//     } else {
//         res.status(400).json({ error: 'No active connection found' });
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//     console.log(`Make sure you have Chrome/Chromium installed for Puppeteer`);
// });



const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Store active clients
const activeClients = new Map();

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

        client.on('qr', (qr) => {
            console.log('QR Received for session:', sessionId);
            qrcode.generate(qr, { small: true });
            resolve({ client, qr });
        });

        client.on('ready', () => {
            console.log('Client is ready!');
            activeClients.set(sessionId, client);
        });

        client.on('authenticated', () => {
            console.log('Authenticated!');
        });

        client.on('auth_failure', (msg) => {
            console.error('Authentication failure:', msg);
            reject(new Error('Authentication failed'));
        });

        client.on('disconnected', (reason) => {
            console.log('Client was logged out', reason);
            activeClients.delete(sessionId);
        });

        client.initialize();
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
    res.json({ message: 'WhatsApp Bulk Sender API' });
});

// Initialize WhatsApp
app.post('/api/initialize', async (req, res) => {
    try {
        const { sessionId = 'default' } = req.body;

        if (activeClients.has(sessionId)) {
            const client = activeClients.get(sessionId);
            if (client.info) {
                return res.json({
                    status: 'already_connected',
                    message: 'WhatsApp is already connected'
                });
            }
        }

        const { client, qr } = await initializeWhatsAppClient(sessionId);
        res.json({ status: 'qr_generated', qr });
    } catch (error) {
        console.error('Initialization error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Check connection status
app.get('/api/status/:sessionId?', (req, res) => {
    const sessionId = req.params.sessionId || 'default';
    const client = activeClients.get(sessionId);

    const isConnected = client && client.info ? true : false;

    res.json({
        connected: isConnected,
        ready: isConnected
    });
});

// Send bulk messages
app.post('/api/send-bulk', async (req, res) => {
    try {
        const { numbers, message, sessionId = 'default' } = req.body;
        const client = activeClients.get(sessionId);

        if (!client) {
            return res.status(400).json({ error: 'WhatsApp client not connected' });
        }

        if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
            return res.status(400).json({ error: 'Numbers array is required' });
        }

        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message is required' });
        }

        const results = [];
        const failedNumbers = [];
        const sentNumbers = [];

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
                        await client.sendMessage(chatId, message);
                        results.push({
                            number,
                            formattedNumber,
                            status: 'sent'
                        });
                        sentNumbers.push(number);
                        console.log(`✓ Message sent to ${formattedNumber}`);
                    } else {
                        results.push({
                            number,
                            formattedNumber,
                            status: 'not_registered'
                        });
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

                // Delay to avoid rate limiting (3 seconds between messages)
                await new Promise(resolve => setTimeout(resolve, 3000));

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

        res.json({
            total: numbers.length,
            sent: sentNumbers.length,
            failed: failedNumbers.length,
            sentNumbers,
            failedNumbers,
            details: results
        });

    } catch (error) {
        console.error('Bulk send error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send test message to single number
app.post('/api/send-test', async (req, res) => {
    try {
        const { number, message, sessionId = 'default' } = req.body;
        const client = activeClients.get(sessionId);

        if (!client) {
            return res.status(400).json({ error: 'WhatsApp client not connected' });
        }

        // Format Bangladesh number
        const formattedNumber = formatBangladeshNumber(number);
        const chatId = `${formattedNumber}@c.us`;

        console.log(`Testing number: ${number} -> ${formattedNumber}`);

        const isRegistered = await client.isRegisteredUser(chatId);

        if (!isRegistered) {
            return res.status(400).json({
                error: 'Number not registered on WhatsApp',
                originalNumber: number,
                formattedNumber: formattedNumber
            });
        }

        await client.sendMessage(chatId, message);
        res.json({
            success: true,
            message: 'Test message sent successfully',
            originalNumber: number,
            formattedNumber: formattedNumber
        });

    } catch (error) {
        console.error('Test send error:', error);
        res.status(500).json({
            error: error.message,
            originalNumber: number
        });
    }
});

// Validate Bangladesh numbers
app.post('/api/validate-numbers', async (req, res) => {
    try {
        const { numbers } = req.body;

        if (!numbers || !Array.isArray(numbers)) {
            return res.status(400).json({ error: 'Numbers array is required' });
        }

        const validationResults = numbers.map(number => {
            const formattedNumber = formatBangladeshNumber(number);
            const isValid = formattedNumber.length === 13 && formattedNumber.startsWith('880');

            return {
                original: number,
                formatted: formattedNumber,
                valid: isValid,
                error: isValid ? null : 'Invalid Bangladesh number format'
            };
        });

        res.json({
            results: validationResults,
            validCount: validationResults.filter(r => r.valid).length,
            invalidCount: validationResults.filter(r => !r.valid).length
        });

    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Disconnect WhatsApp
app.post('/api/disconnect/:sessionId?', (req, res) => {
    const sessionId = req.params.sessionId || 'default';
    const client = activeClients.get(sessionId);

    if (client) {
        client.destroy();
        activeClients.delete(sessionId);
        res.json({ message: 'Disconnected successfully' });
    } else {
        res.status(400).json({ error: 'No active connection found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Bangladesh number support enabled`);
    console.log(`Supported formats: 01981380806, 8801981380806, +8801981380806, 1981380806`);
});