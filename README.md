# WhatsApp Gateway Unofficial

An unofficial WhatsApp Gateway system for learning, internal testing, or company communication simulation. This project is built with a client-server architecture using Node.js + Baileys for the backend and React + Vite + TailAdmin for the frontend. It now includes integrations with Gemini, OpenAI, and Groq for AI chat functionalities.

> **IMPORTANT**: This is an unofficial WhatsApp Gateway for learning purposes only. Do not use it for spam or any activities that violate WhatsApp's Terms of Service.

## Features

### Backend (Node.js + Express + Baileys)
- Session management with QR code login
- Send text messages to any WhatsApp number
- Send media files (images, PDFs, documents)
- Receive and store incoming messages
- Auto-reply functionality
- Activity logging
- Configuration management
- AI Chat integration with:
  - Google Gemini
  - OpenAI (GPT models)
  - Groq (LLaMA, Mixtral, etc.)

### Frontend (React + Vite + TailAdmin)
- QR code scanning interface
- Dashboard with connection status
- Send message form
- Media upload with preview
- Inbox viewer
- Settings management
- Log viewer with filtering
- Chat interfaces for Gemini, OpenAI, and Groq

## Prerequisites

- Node.js 16+ and pnpm
- Modern web browser
- WhatsApp account on your phone
- API keys for Gemini, OpenAI, and Groq (optional, for AI features)

## Installation

### Clone the repository
```bash
git clone https://github.com/paijoe29/wa-gemini
cd wa-gemini
```

### Install backend dependencies
```bash
cd backend
pnpm install
```

### Install frontend dependencies
```bash
cd ..
pnpm install
```

## Configuration

### Backend Configuration
1. Copy the example environment file and configure it:
```bash
cp backend/.env.example backend/.env
```

2. Edit the `backend/.env` file and add your API keys:
```
PORT=3002
NODE_ENV=development

# General API Key for the application (if needed for other purposes)
API_KEY=your-api-key-here

# Gemini API Key
GEMINI_API_KEY=your-gemini-api-key-here

# OpenAI API Key
OPENAI_API_KEY=your-openai-api-key-here

# Groq API Key
GROQ_API_KEY=your-groq-api-key-here
```

> **IMPORTANT**: AI API keys (Gemini, OpenAI, Groq) can ONLY be set through the `backend/.env` file for security reasons. They cannot be set through the frontend interface.

3. Copy the example config file and configure it if needed:
```bash
cp backend/config.json.example backend/config.json
```



## Running the Application

### Start the backend server
```bash
cd backend
pnpm dev
```

### Start the frontend development server
```bash
cd ..
pnpm dev
```

### Access the application
1. Open your browser and navigate to `http://localhost:5173`
2. Go to WhatsApp Gateway > QR Login
3. Scan the QR code with your WhatsApp app (Menu > Linked Devices > Link a Device)
4. Once connected, you'll be redirected to the dashboard. You can then access the AI chat pages from the sidebar.

## Usage

### Sending Messages
1. Navigate to "Send Message" page
2. Enter the recipient's phone number with country code (e.g., 62812345678 for Indonesia)
3. Type your message
4. Click "Send Message"

### Sending Media
1. Navigate to "Send Media" page
2. Enter the recipient's phone number
3. Upload a file (image, PDF, or document)
4. Add an optional caption
5. Click "Send Media"

### Viewing Inbox
1. Navigate to "Inbox" page
2. View incoming messages
3. Set auto-refresh interval if needed

### AI Chat
1. Navigate to "Gemini AI", "OpenAI Chat", or "Groq Chat" from the sidebar.
2. Ensure the respective API key is set in `backend/.env`.
3. Start chatting with the AI.

### Managing Settings
1. Navigate to "Settings" page
2. Configure auto-reply settings
3. Set message limits
4. Manage blocklist

### Viewing Logs
1. Navigate to "Logs" page
2. Filter logs by type, number, or date
3. Enable auto-refresh for real-time updates

## Project Structure

```
whatsapp-gateway/
├── backend/                  # Backend server
│   ├── controllers/          # API controllers (gemini, openai, groq, whatsapp, etc.)
│   ├── middleware/           # Express middleware
│   ├── routes/               # API routes
│   ├── services/             # Business logic (gemini, openai, groq, whatsapp, etc.)
│   ├── utils/                # Utility functions
│   ├── sessions/             # WhatsApp session storage
│   ├── logs/                 # Activity logs
│   ├── config.js             # Configuration
│   └── server.js             # Main server file
│
├── src/                      # Frontend React app
│   ├── components/           # React components
│   │   └── whatsapp/         # WhatsApp-specific components
│   ├── pages/                # Page components
│   │   └── WhatsApp/         # WhatsApp pages (GeminiAI, OpenAIChat, GroqChat, etc.)
│   ├── services/             # API services (gemini, openai, groq, whatsapp, etc.)
│   └── App.tsx               # Main app component
│
└── README.md                 # Project documentation
└── AI_RULES.md               # AI development guidelines
```

## Security Considerations

- This is for educational purposes only
- Do not expose this to the public internet
- Use only for internal testing or learning
- Respect WhatsApp's Terms of Service
- Do not use for spam or bulk messaging
- **Protect your API keys**: Store them securely in `backend/.env` and never commit this file.

### GitHub Security

When uploading to GitHub, make sure to:

1. **Never commit sensitive files**:
   - `.env` files with API keys
   - `config.json` with actual API keys
   - WhatsApp session data in `backend/sessions/`
   - Log files in `backend/logs/`

2. **Use the provided templates**:
   - Use `.env.example` instead of `.env`
   - Use `config.json.example` instead of `config.json`

3. **Check the `.gitignore` file**:
   - Make sure it includes all sensitive files and directories
   - Verify that no sensitive files are being tracked by git

4. **Before committing, run**:
   ```bash
   git status
   ```
   to ensure no sensitive files are about to be committed

## Troubleshooting

- If QR code doesn't appear, restart the backend server
- If messages fail to send, check the connection status
- If the session disconnects, try logging in again
- Check logs for detailed error messages
- Ensure API keys are correctly set in `backend/.env` for AI features.
- Kalau ada bug fix sendiri ya hehe 

## Support me

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Y8Y81F6AUQ)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This project is not affiliated with, authorized by, maintained by, sponsored by, or endorsed by WhatsApp, Google, OpenAI, Groq, or any of their affiliates or subsidiaries. This is an independent project for educational purposes only.

Vibe Coding