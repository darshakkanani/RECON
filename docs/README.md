# 🔍 Real Subdomain Finder

A web application that actually runs **Subfinder** and **Sublist3r** tools from their official GitHub repositories.

## ✨ Features

- **Real Tools**: Integrates actual Subfinder and Sublist3r from GitHub
- **Backend API**: Node.js server executes tools and returns real results
- **Live Results**: See actual subdomains discovered by the tools
- **File Storage**: Results saved to files for later analysis
- **Clean Interface**: Modern, responsive web design

## 🛠️ Installation

### Step 1: Install Tools
```bash
# Run the installation script
./install-tools.sh
```

This will install **20+ subdomain discovery tools**:

**🌐 Passive Discovery:**
- **Subfinder** - Fast passive subdomain discovery
- **Assetfinder** - Find domains and subdomains  
- **Amass** - In-depth attack surface mapping
- **Findomain** - Fast subdomain enumerator

**🕵️ OSINT & Search Engines:**
- **Sublist3r** - OSINT subdomain enumeration
- **TheHarvester** - Gather emails & subdomains
- **crt.sh** - Certificate transparency logs
- **Chaos** - ProjectDiscovery's dataset

**⚡ Active Discovery & Bruteforce:**
- **Gobuster** - DNS subdomain bruteforcing
- **FFUF** - Fast web fuzzer
- **DNSRecon** - DNS enumeration script
- **MassDNS** - High-performance DNS resolver

**🛠️ Specialized & Advanced:**
- **ShuffleDNS** - Wrapper around massdns
- **PureDNS** - Fast domain resolver
- **DNSx** - Fast DNS toolkit
- **Knockpy** - Python subdomain scanner

**💻 Code & Repository Search:**
- **GitHub-Subdomains** - GitHub search API
- **GAU** - Get All URLs from archives
- **Wayback URLs** - Wayback Machine URLs
- **Crobat** - Rapid7 Project Sonar

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start Backend Server
```bash
npm start
```

## 🌐 Access

Open your browser and go to: **http://localhost:3000**

## 📋 How to Use

1. **Enter Domain**: Type a domain name (e.g., `example.com`)
2. **Click "Find Subdomains"**: Start the discovery process
3. **Watch Results**: See subdomains appear in real-time
4. **Copy Results**: Select and copy any subdomain you need

## 🔧 How It Works

This application runs **real subdomain discovery tools**:

### **Subfinder** 🎯
- Fast passive subdomain discovery
- Uses multiple data sources (Certificate Transparency, DNS, etc.)
- From: https://github.com/projectdiscovery/subfinder

### **Sublist3r** 🔎  
- OSINT-based subdomain enumeration
- Uses search engines and public APIs
- From: https://github.com/aboul3la/Sublist3r

### **Backend Process**
1. Frontend sends domain to Node.js backend
2. Backend executes the actual tool via command line
3. Results are parsed and returned to frontend
4. Results also saved to files in `/results` directory

## ⚠️ Important

- Use only on authorized targets
- This is a demonstration/educational tool
- For real penetration testing, use proper tools

## 📁 Files

- `index.html` - Frontend HTML structure
- `style.css` - All CSS styling  
- `script.js` - Frontend JavaScript (API calls)
- `server.js` - Backend Node.js server
- `package.json` - Node.js dependencies
- `install-tools.sh` - Tool installation script
- `README.md` - This documentation
- `results/` - Directory for scan results

**Ready to discover subdomains? 🚀**
