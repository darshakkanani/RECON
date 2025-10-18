#!/bin/bash

echo "Installing Subdomain Discovery Tools..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon Macs
    if [[ $(uname -m) == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
fi

# Check if Go is installed, install if not
if ! command -v go &> /dev/null; then
    echo "Installing Go..."
    brew install go
    
    # Add Go to PATH
    echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.zshrc
    export PATH=$PATH:$(go env GOPATH)/bin
    
    echo "Go installed successfully"
else
    echo "Go is already installed"
fi

# Check if Python3 is installed, install if not
if ! command -v python3 &> /dev/null; then
    echo "Installing Python3..."
    brew install python3
    echo "Python3 installed successfully"
else
    echo "Python3 is already installed"
fi

# Check if Node.js is installed, install if not
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    brew install node
    echo "Node.js installed successfully"
else
    echo "Node.js is already installed"
fi

echo "Installing Subdomain Discovery Tools..."

# Ensure Go modules are enabled
export GO111MODULE=on

echo "Installing Subfinder..."
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

echo "Installing Assetfinder..."
go install -v github.com/tomnomnom/assetfinder@latest

echo "Installing Amass..."
go install -v github.com/owasp-amass/amass/v4/...@master

echo "Installing Findomain..."
if [[ $(uname -m) == "arm64" ]]; then
    curl -LO https://github.com/Findomain/Findomain/releases/latest/download/findomain-osx-arm64.zip
    unzip findomain-osx-arm64.zip
    chmod +x findomain
    sudo mv findomain /usr/local/bin/
    rm findomain-osx-arm64.zip
else
    curl -LO https://github.com/Findomain/Findomain/releases/latest/download/findomain-osx-x86_64.zip
    unzip findomain-osx-x86_64.zip
    chmod +x findomain
    sudo mv findomain /usr/local/bin/
    rm findomain-osx-x86_64.zip
fi

echo "Installing Sublist3r..."
# Install pipx first for isolated Python apps
brew install pipx
pipx install sublist3r
pipx ensurepath

echo "Installing TheHarvester..."
pipx install theHarvester

echo "Installing Gobuster..."
go install -v github.com/OJ/gobuster/v3@latest

echo "Installing FFUF..."
go install -v github.com/ffuf/ffuf/v2@latest

echo "Installing DNSRecon..."
pipx install dnsrecon

echo "Installing ShuffleDNS..."
go install -v github.com/projectdiscovery/shuffledns/cmd/shuffledns@latest

echo "Installing PureDNS..."
go install -v github.com/d3mondev/puredns/v2@latest

echo "Installing DNSx..."
go install -v github.com/projectdiscovery/dnsx/cmd/dnsx@latest

echo "Installing Knockpy..."
if [ ! -d "/tmp/knockpy" ]; then
    git clone https://github.com/guelfoweb/knock.git /tmp/knockpy
fi
cd /tmp/knockpy
python3 setup.py install --user
pip3 install --user --break-system-packages dnspython pyOpenSSL
cd - > /dev/null

echo "Installing Chaos..."
go install -v github.com/projectdiscovery/chaos-client/cmd/chaos@latest

echo "Installing GAU..."
go install -v github.com/lc/gau/v2/cmd/gau@latest

echo "Installing Wayback URLs..."
go install -v github.com/tomnomnom/waybackurls@latest
go install -v github.com/cgboal/sonarsearch/cmd/crobat@latest

echo "Installing GitHub-Subdomains..."
go install -v github.com/gwen001/github-subdomains@latest

echo "Installing MassDNS..."
# Try Homebrew first (macOS compatible)
if command -v brew &> /dev/null; then
    brew install massdns 2>/dev/null || {
        echo "Homebrew install failed, trying manual compilation..."
        # Manual compilation for macOS
        if [ ! -d "/tmp/massdns" ]; then
            git clone https://github.com/blechschmidt/massdns.git /tmp/massdns
        fi
        cd /tmp/massdns
        # Use macOS-compatible compilation flags
        make clean 2>/dev/null || true
        make CC=clang CFLAGS="-O3 -std=c11 -Wall -fstack-protector-strong" 2>/dev/null || {
            echo "MassDNS compilation failed on macOS - this is expected"
            echo "   PureDNS will not work without MassDNS"
        }
        if [ -f "bin/massdns" ]; then
            sudo cp bin/massdns /usr/local/bin/ 2>/dev/null || cp bin/massdns ~/bin/ 2>/dev/null || echo "Failed to copy massdns binary"
        fi
        cd - > /dev/null
    }
else
    echo "Homebrew not found, skipping MassDNS installation"
fi

echo "Installing Advanced DNS Tools..."
echo "Installing Fierce..."
pipx install fierce 2>/dev/null || pip3 install --user fierce

echo "Installing DNSMap..."
if command -v brew &> /dev/null; then
    brew install dnsmap 2>/dev/null || echo "DNSMap not available via Homebrew"
fi

echo "Installing DNSEnum..."
if command -v brew &> /dev/null; then
    brew install dnsenum 2>/dev/null || echo "DNSEnum not available via Homebrew"
fi

echo "Installing DNSTwist..."
pipx install dnstwist 2>/dev/null || pip3 install --user dnstwist

echo "Installing Dmitry..."
if command -v brew &> /dev/null; then
    brew install dmitry 2>/dev/null || echo "Dmitry not available via Homebrew"
fi

echo "Installing SpiderFoot..."
pipx install spiderfoot 2>/dev/null || pip3 install --user spiderfoot

echo "Installing Shodan CLI..."
pipx install shodan 2>/dev/null || pip3 install --user shodan

# Check installations
echo "Checking tool installations..."
tools_check=(
    "subfinder:Subfinder"
    "assetfinder:Assetfinder" 
    "amass:Amass"
    "findomain:Findomain"
    "sublist3r:Sublist3r"
    "theHarvester:TheHarvester"
    "gobuster:Gobuster"
    "ffuf:FFUF"
    "shuffledns:ShuffleDNS"
    "puredns:PureDNS"
    "dnsx:DNSx"
    "chaos:Chaos"
    "gau:GAU"
    "waybackurls:Wayback URLs"
    "crobat:Crobat"
    "github-subdomains:GitHub-Subdomains"
    "massdns:MassDNS"
)

installed_count=0
total_count=${#tools_check[@]}

for tool_info in "${tools_check[@]}"; do
    tool_cmd="${tool_info%%:*}"
    tool_name="${tool_info##*:}"
    
    if command -v "$tool_cmd" &> /dev/null; then
        echo "✅ $tool_name installed successfully"
        ((installed_count++))
    else
        echo "❌ $tool_name installation failed"
    fi
done

echo ""
echo "📊 Installation Summary: $installed_count/$total_count tools installed successfully"

echo ""
echo "🎉 Tool installation completed!"
echo ""
echo "📦 Installing Node.js dependencies..."
npm install

echo ""
echo "✅ Everything is ready!"
echo ""
echo "🚀 To start the application:"
echo "   npm start"
echo ""
echo "🌐 Then open: http://localhost:3000"
echo ""
echo "⚠️ If tools don't work, restart your terminal or run:"
echo "   source ~/.zshrc"
