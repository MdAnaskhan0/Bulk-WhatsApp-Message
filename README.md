# WhatsApp Bulk Sender

A simple and efficient WhatsApp bulk messaging solution built with Node.js backend and React frontend.

## 🚀 Features

- **WhatsApp Integration**: Connect via QR code scanning
- **Bulk Messaging**: Send messages to multiple numbers at once
- **Bangladesh Number Support**: Automatic formatting for local numbers
- **Real-time Dashboard**: Modern web interface for easy management
- **Number Validation**: Validate numbers before sending

## 📦 Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/whatsapp-bulk-sender.git
cd whatsapp-bulk-sender
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

3. **Run the application**
```bash
# Start backend (port 5000)
npm start

# Start frontend (port 3000)
cd frontend
npm start
```

## 🛠️ Usage

1. Open `http://localhost:3000`
2. Click "Initialize WhatsApp" and scan the QR code
3. Go to "Bulk Message" section
4. Enter numbers (one per line) and your message
5. Click "Send Bulk Messages"

### Supported Number Formats
- `01981380806`
- `8801981380806` 
- `+8801981380806`
- `1981380806`

## 🔧 API Endpoints

- `POST /api/initialize` - Connect WhatsApp
- `POST /api/send-bulk` - Send bulk messages
- `GET /api/status` - Check connection status
- `POST /api/disconnect` - Disconnect WhatsApp

## ⚠️ Important

- Maximum 100 numbers per request
- 2-second delay between messages
- Requires active WhatsApp account
- Use responsibly and comply with WhatsApp terms
