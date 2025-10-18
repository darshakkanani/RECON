# Information Gathering Platform

A comprehensive web-based information gathering and subdomain discovery platform with 20+ integrated tools.

## 🏗️ Optimized Project Structure

```
RECON/
├── config/                 # Configuration files
│   └── app.config.js      # Application settings
├── controllers/           # Request handlers
│   ├── SystemController.js
│   └── ToolController.js
├── data/                  # Static data files
│   └── simple-wordlist.txt
├── docs/                  # Documentation
├── middleware/            # Express middleware
│   ├── errorHandler.js
│   ├── requestLogger.js
│   └── validator.js
├── models/                # Data models
│   ├── ExecutionResult.js
│   └── ToolConfiguration.js
├── public/                # Frontend files
│   ├── hubs/             # Feature hubs
│   └── tools/            # Individual tools
├── routes/               # API routes
│   ├── api.js
│   ├── health.js
│   └── static.js
├── scripts/              # Utility scripts
│   ├── install-tools.sh
│   └── test-dns-tools.sh
├── services/             # Business logic
│   ├── execution/
│   ├── results/
│   └── validation/
├── storage/              # Runtime data
│   ├── cache/
│   ├── logs/
│   └── results/
├── utils/                # Utilities
│   └── logger.js
├── server.js             # Main server
├── start.js              # Startup script
└── start.sh              # Shell startup
```

## 🚀 Quick Start

1. **Install tools** (one-time setup):
   ```bash
   ./scripts/install-tools.sh
   ```

2. **Start the platform**:
   ```bash
   ./start.sh
   ```

3. **Access the web interface**:
   Open http://localhost:3001 in your browser

## 🛠️ Available Tools

### Subdomain Discovery Tools
- **Subfinder** - Fast passive subdomain discovery
- **Sublist3r** - Search engine based enumeration
- **Assetfinder** - Domain and subdomain finder
- **Amass** - Advanced attack surface mapping
- **Findomain** - Fast subdomain enumerator
- **Knockpy** - Python-based subdomain scanner
- **Censys** - Certificate transparency search
- **Puredns** - Fast domain resolver
- **crt.sh** - Certificate transparency logs

### WHOIS and DNS Enumeration
- **WHOIS** - Domain registration information
- **Dig** - DNS lookup utility
- **NSLookup** - Name server lookup
- **Host** - DNS resolver utility

## 📁 Output Files

All scan results are saved to `output/results/` with the naming pattern:
```
{tool}_{domain}_{timestamp}.txt
```

Example: `subfinder_google.com_1760069310818.txt`

## 🔧 Configuration

Edit `src/config/app.config.js` to customize:
- Server port and host
- File paths
- Tool timeouts
- Security settings

## 📊 Logging

Application logs are saved to `output/logs/` with daily rotation:
- Format: JSON structured logs
- Levels: info, error, warn, debug
- Console and file output

## 🛡️ Security Features

- Input validation for domain names
- Command injection prevention
- Process timeout management
- Graceful shutdown handling

## 🔄 Development

1. **Install dependencies**:
   ```bash
   cd src/backend
   npm install
   ```

2. **Run in development mode**:
   ```bash
   npm run dev
   ```

3. **Add new tools**:
   - Update `src/backend/server.js` (executeTool function)
   - Add tool info to `src/frontend/script.js`
   - Add tool card to `src/frontend/index.html`

## 📋 Requirements

- Node.js 14+
- macOS/Linux
- Internet connection for tool installation
- Various security tools (installed via script)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## ⚠️ Disclaimer

This tool is for authorized security testing only. Always ensure you have permission before scanning any domain or network.

## 📄 License

MIT License - see LICENSE file for details
