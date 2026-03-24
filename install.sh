#!/bin/bash
# OSINT Automation Platform - Automated Installation Script
# Supports: Ubuntu/Debian, CentOS/RHEL/Fedora, macOS

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/osint-platform"
SERVICE_USER="osint"
PYTHON_VERSION="3.10"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     OSINT Automation Platform - Installation Script          ║"
echo "║                                                              ║"
echo "║  This script will install the OSINT platform with all       ║"
echo "║  dependencies, database setup, and systemd service.         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    elif [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        OS=$DISTRIB_ID
        VER=$DISTRIB_RELEASE
    else
        OS=$(uname -s)
        VER=$(uname -r)
    fi
    echo "Detected OS: $OS $VER"
}

# Install system dependencies
install_system_deps() {
    echo -e "${YELLOW}[*] Installing system dependencies...${NC}"
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        apt-get update
        apt-get install -y \
            python3 \
            python3-pip \
            python3-venv \
            python3-dev \
            build-essential \
            libssl-dev \
            libffi-dev \
            libxml2-dev \
            libxslt1-dev \
            zlib1g-dev \
            libpq-dev \
            sqlite3 \
            git \
            curl \
            wget \
            nmap \
            massdns \
            dnsutils \
            whois \
            jq
    
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Fedora"* ]]; then
        yum update -y || dnf update -y
        yum install -y \
            python3 \
            python3-pip \
            python3-devel \
            gcc \
            openssl-devel \
            libffi-devel \
            libxml2-devel \
            libxslt-devel \
            zlib-devel \
            postgresql-devel \
            sqlite \
            git \
            curl \
            wget \
            nmap \
            bind-utils \
            whois \
            jq || \
        dnf install -y \
            python3 \
            python3-pip \
            python3-devel \
            gcc \
            openssl-devel \
            libffi-devel \
            libxml2-devel \
            libxslt-devel \
            zlib-devel \
            libpq-devel \
            sqlite \
            git \
            curl \
            wget \
            nmap \
            bind-utils \
            whois \
            jq
    
    elif [[ "$OS" == *"Darwin"* ]]; then
        if ! command -v brew &> /dev/null; then
            echo -e "${RED}Homebrew not found. Please install Homebrew first.${NC}"
            exit 1
        fi
        brew update
        brew install \
            python@3.10 \
            openssl \
            libffi \
            libxml2 \
            libxslt \
            zlib \
            sqlite3 \
            git \
            curl \
            wget \
            nmap \
            massdns \
            bind \
            whois \
            jq
    
    else
        echo -e "${RED}Unsupported OS: $OS${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}[+] System dependencies installed${NC}"
}

# Install massdns (if not available in repos)
install_massdns() {
    if ! command -v massdns &> /dev/null; then
        echo -e "${YELLOW}[*] Installing massdns from source...${NC}"
        cd /tmp
        git clone https://github.com/blechschmidt/massdns.git
        cd massdns
        make
        cp bin/massdns /usr/local/bin/
        cd ..
        rm -rf massdns
        echo -e "${GREEN}[+] massdns installed${NC}"
    fi
}

# Create service user
create_user() {
    echo -e "${YELLOW}[*] Creating service user...${NC}"
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd -r -s /bin/false -d "$INSTALL_DIR" -M "$SERVICE_USER"
        echo -e "${GREEN}[+] User $SERVICE_USER created${NC}"
    else
        echo -e "${YELLOW}[!] User $SERVICE_USER already exists${NC}"
    fi
}

# Setup installation directory
setup_directory() {
    echo -e "${YELLOW}[*] Setting up installation directory...${NC}"
    
    # Create directory
    mkdir -p "$INSTALL_DIR"
    
    # Copy current directory contents
    cp -r . "$INSTALL_DIR/"
    
    # Set permissions
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"
    chmod 750 "$INSTALL_DIR"
    
    echo -e "${GREEN}[+] Installation directory ready at $INSTALL_DIR${NC}"
}

# Create Python virtual environment
setup_venv() {
    echo -e "${YELLOW}[*] Creating Python virtual environment...${NC}"
    cd "$INSTALL_DIR"
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip setuptools wheel
    pip install -r requirements.txt
    pip install -e .
    deactivate
    echo -e "${GREEN}[+] Virtual environment created${NC}"
}

# Setup database
setup_database() {
    echo -e "${YELLOW}[*] Setting up database...${NC}"
    cd "$INSTALL_DIR"
    source venv/bin/activate
    
    # Create data directory
    mkdir -p "$INSTALL_DIR/data"
    chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/data"
    
    # Initialize database
    python3 -c "
from osint_platform.database.models import init_db
init_db('$INSTALL_DIR/data/osint.db')
"
    
    deactivate
    echo -e "${GREEN}[+] Database initialized${NC}"
}

# Create configuration
setup_config() {
    echo -e "${YELLOW}[*] Setting up configuration...${NC}"
    
    CONFIG_DIR="$INSTALL_DIR/config"
    mkdir -p "$CONFIG_DIR"
    
    # Create config from example if doesn't exist
    if [ ! -f "$CONFIG_DIR/config.yaml" ]; then
        cp "$CONFIG_DIR/config.yaml.example" "$CONFIG_DIR/config.yaml"
        echo -e "${YELLOW}[!] Please edit $CONFIG_DIR/config.yaml with your API keys${NC}"
    fi
    
    chown -R "$SERVICE_USER:$SERVICE_USER" "$CONFIG_DIR"
    chmod 640 "$CONFIG_DIR/config.yaml"
    
    echo -e "${GREEN}[+] Configuration ready${NC}"
}

# Create systemd service
create_service() {
    echo -e "${YELLOW}[*] Creating systemd service...${NC}"
    
    cat > /etc/systemd/system/osint-platform.service << EOF
[Unit]
Description=OSINT Automation Platform API Server
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment=PATH=$INSTALL_DIR/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=PYTHONPATH=$INSTALL_DIR
Environment=CONFIG_PATH=$INSTALL_DIR/config/config.yaml
ExecStart=$INSTALL_DIR/venv/bin/uvicorn osint_platform.api.server:app --host 0.0.0.0 --port 8000
ExecReload=/bin/kill -HUP \$MAINPID
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable osint-platform.service
    
    echo -e "${GREEN}[+] Systemd service created${NC}"
    echo -e "${YELLOW}    Start with: systemctl start osint-platform${NC}"
}

# Setup log rotation
setup_logging() {
    echo -e "${YELLOW}[*] Setting up log rotation...${NC}"
    
    mkdir -p "$INSTALL_DIR/logs"
    chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR/logs"
    
    cat > /etc/logrotate.d/osint-platform << EOF
$INSTALL_DIR/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 $SERVICE_USER $SERVICE_USER
    sharedscripts
    postrotate
        systemctl reload osint-platform
    endscript
}
EOF
    
    echo -e "${GREEN}[+] Log rotation configured${NC}"
}

# Create CLI wrapper
create_cli_wrapper() {
    echo -e "${YELLOW}[*] Creating CLI wrapper...${NC}"
    
    cat > /usr/local/bin/osint-platform << 'EOF'
#!/bin/bash
INSTALL_DIR="/opt/osint-platform"
source "$INSTALL_DIR/venv/bin/activate"
export PYTHONPATH="$INSTALL_DIR"
export CONFIG_PATH="$INSTALL_DIR/config/config.yaml"
exec python3 -m osint_platform.cli.commands "$@"
EOF
    
    chmod +x /usr/local/bin/osint-platform
    
    echo -e "${GREEN}[+] CLI wrapper created${NC}"
}

# Create cron job for automated scanning
setup_cron() {
    echo -e "${YELLOW}[*] Setting up automated scanning cron job...${NC}"
    
    cat > /etc/cron.d/osint-platform << EOF
# OSINT Platform Automated Scanning
# Run daily at 2 AM
0 2 * * * $SERVICE_USER cd $INSTALL_DIR && $INSTALL_DIR/venv/bin/python3 -m osint_platform.cli.commands monitor --config $INSTALL_DIR/config/monitoring.yaml >> $INSTALL_DIR/logs/cron.log 2>&1
EOF
    
    chmod 644 /etc/cron.d/osint-platform
    
    echo -e "${GREEN}[+] Cron job configured${NC}"
}

# Final instructions
print_instructions() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              Installation Complete!                          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo "Next steps:"
    echo ""
    echo "1. Configure API keys:"
    echo "   sudo nano $INSTALL_DIR/config/config.yaml"
    echo ""
    echo "2. Start the API server:"
    echo "   sudo systemctl start osint-platform"
    echo "   sudo systemctl status osint-platform"
    echo ""
    echo "3. Test CLI:"
    echo "   osint-platform --help"
    echo "   osint-platform scan -t example.com"
    echo ""
    echo "4. Access API documentation:"
    echo "   http://localhost:8000/docs"
    echo ""
    echo "5. View logs:"
    echo "   sudo tail -f $INSTALL_DIR/logs/osint-platform.log"
    echo ""
    echo "6. For Docker deployment:"
    echo "   cd $INSTALL_DIR && docker-compose up -d"
    echo ""
    echo -e "${YELLOW}Documentation: $INSTALL_DIR/docs/${NC}"
    echo -e "${YELLOW}Support: https://github.com/YOUR_USERNAME/osint-automation-platform/issues${NC}"
}

# Main installation flow
main() {
    detect_os
    install_system_deps
    install_massdns
    create_user
    setup_directory
    setup_venv
    setup_database
    setup_config
    create_service
    setup_logging
    create_cli_wrapper
    setup_cron
    print_instructions
}

# Run main function
main "$@"
