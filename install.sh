#!/bin/bash

# Xeno Public Release - Universal Installation Script
# Compatible with: Linux, macOS, Raspberry Pi OS
# Usage: chmod +x install.sh && ./install.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

header() {
    echo -e "${PURPLE}$1${NC}"
}

# Detect OS and architecture
detect_system() {
    OS=$(uname -s)
    ARCH=$(uname -m)
    
    case $OS in
        Linux*)
            if [ -f /etc/os-release ]; then
                . /etc/os-release
                DISTRO=$ID
            else
                DISTRO="unknown"
            fi
            ;;
        Darwin*)
            DISTRO="macos"
            ;;
        *)
            DISTRO="unknown"
            ;;
    esac
    
    log "Detected system: $OS ($DISTRO) on $ARCH"
}

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        error "Please do not run this script as root"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    header "🔍 Checking Prerequisites"
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -ge 18 ]; then
            success "Node.js $NODE_VERSION found"
        else
            error "Node.js 18+ required, found $NODE_VERSION"
            exit 1
        fi
    else
        error "Node.js not found. Please install Node.js 18+ first"
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        success "npm $NPM_VERSION found"
    else
        error "npm not found"
        exit 1
    fi
    
    # Check Python (needed for some native modules)
    if command -v python3 >/dev/null 2>&1; then
        PYTHON_VERSION=$(python3 --version)
        success "$PYTHON_VERSION found"
    else
        warning "Python3 not found - some features may not work"
    fi
    
    # Check Git
    if command -v git >/dev/null 2>&1; then
        success "Git found"
    else
        error "Git not found. Please install Git first"
        exit 1
    fi
}

# Install system dependencies
install_system_deps() {
    header "📦 Installing System Dependencies"
    
    case $DISTRO in
        ubuntu|debian|raspbian)
            log "Installing dependencies for Debian/Ubuntu/Raspberry Pi OS..."
            sudo apt update
            sudo apt install -y \
                build-essential \
                python3-dev \
                libasound2-dev \
                alsa-utils \
                pulseaudio \
                sox \
                portaudio19-dev \
                pkg-config
            ;;
        fedora|centos|rhel)
            log "Installing dependencies for Red Hat/Fedora..."
            sudo dnf install -y \
                gcc-c++ \
                make \
                python3-devel \
                alsa-lib-devel \
                pulseaudio \
                sox \
                portaudio-devel \
                pkgconfig
            ;;
        arch)
            log "Installing dependencies for Arch Linux..."
            sudo pacman -S --noconfirm \
                base-devel \
                python \
                alsa-lib \
                pulseaudio \
                sox \
                portaudio \
                pkgconf
            ;;
        macos)
            log "Installing dependencies for macOS..."
            if command -v brew >/dev/null 2>&1; then
                brew install sox portaudio pkg-config
            else
                warning "Homebrew not found. Please install manually:"
                echo "  brew install sox portaudio pkg-config"
            fi
            ;;
        *)
            warning "Unknown distribution. You may need to install audio dependencies manually"
            ;;
    esac
}

# Install Node.js dependencies
install_node_deps() {
    header "📦 Installing Node.js Dependencies"
    
    log "Installing npm packages..."
    npm install
    
    success "Node.js dependencies installed"
}

# Setup configuration
setup_config() {
    header "⚙️ Setting Up Configuration"
    
    if [ ! -f "config.json" ]; then
        log "Creating config.json from template..."
        cp config.template.json config.json
        success "Configuration file created"
    else
        warning "config.json already exists, skipping template copy"
    fi
    
    echo
    warning "🔑 IMPORTANT: You must configure your API keys!"
    echo
    echo "Required steps:"
    echo "1. Edit config.json and replace YOUR_OPENAI_API_KEY_HERE with your OpenAI API key"
    echo "2. Get your OpenAI API key from: https://platform.openai.com/api-keys"
    echo
    echo "Optional (for Google Cloud Speech services):"
    echo "3. Copy google-service-account.template.json to google-service-account.json"
    echo "4. Fill in your Google Cloud service account credentials"
    echo "5. Update projectId in config.json"
    echo
}

# Build the application
build_app() {
    header "🔨 Building Application"
    
    log "Compiling TypeScript..."
    npm run build
    
    success "Application built successfully"
}

# Setup audio (Linux/Pi specific)
setup_audio() {
    if [ "$OS" = "Linux" ]; then
        header "🎵 Setting Up Audio"
        
        log "Testing audio devices..."
        
        # List audio devices
        if command -v arecord >/dev/null 2>&1; then
            echo "Available recording devices:"
            arecord -l 2>/dev/null || true
            echo
            echo "Available playback devices:"
            aplay -l 2>/dev/null || true
        fi
        
        # Test microphone (optional)
        echo
        read -p "Would you like to test your microphone? (y/N): " test_mic
        if [[ $test_mic =~ ^[Yy]$ ]]; then
            log "Recording 3 seconds of audio..."
            if arecord -d 3 -f cd test_audio.wav 2>/dev/null; then
                log "Playing back recorded audio..."
                aplay test_audio.wav 2>/dev/null || true
                rm -f test_audio.wav
                success "Audio test completed"
            else
                warning "Audio test failed - check your microphone setup"
            fi
        fi
    fi
}

# Create systemd service (Linux only)
create_service() {
    if [ "$OS" = "Linux" ] && command -v systemctl >/dev/null 2>&1; then
        echo
        read -p "Would you like to create a systemd service for auto-start? (y/N): " create_svc
        if [[ $create_svc =~ ^[Yy]$ ]]; then
            header "🚀 Creating Systemd Service"
            
            SERVICE_FILE="/etc/systemd/system/xeno.service"
            CURRENT_DIR=$(pwd)
            CURRENT_USER=$(whoami)
            
            log "Creating service file..."
            sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=Xeno Public Release - AI Wellness Companion
After=network.target sound.target
Wants=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
ExecStart=/usr/bin/node $CURRENT_DIR/dist/main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$CURRENT_DIR

[Install]
WantedBy=multi-user.target
EOF
            
            sudo systemctl daemon-reload
            sudo systemctl enable xeno
            
            success "Systemd service created and enabled"
            log "Use 'sudo systemctl start xeno' to start the service"
            log "Use 'sudo systemctl status xeno' to check status"
            log "Use 'journalctl -u xeno -f' to view logs"
        fi
    fi
}

# Final instructions
show_final_instructions() {
    header "🎉 Installation Complete!"
    
    echo
    success "Xeno Public Release has been installed successfully!"
    echo
    echo "Next steps:"
    echo "1. Configure your API keys in config.json"
    echo "2. Test the installation:"
    echo "   npm test"
    echo "3. Start the application:"
    echo "   npm start"
    echo
    echo "For development:"
    echo "   npm run dev"
    echo
    echo "For Docker deployment:"
    echo "   docker-compose up -d"
    echo
    echo "Documentation:"
    echo "   README.md - Quick start guide"
    echo "   config.json - Configuration options"
    echo
    echo "Support:"
    echo "   GitHub Issues: https://github.com/chaitanya-science/xeno-public-release/issues"
    echo
    warning "Remember: You must configure your API keys before the application will work!"
}

# Main installation flow
main() {
    clear
    header "╔══════════════════════════════════════════════════════════════╗"
    header "║                  Xeno Public Release                        ║"
    header "║              Universal Installation Script                   ║"
    header "║                                                              ║"
    header "║  Open Source AI Wellness Companion                          ║"
    header "╚══════════════════════════════════════════════════════════════╝"
    echo
    
    detect_system
    check_root
    check_prerequisites
    install_system_deps
    install_node_deps
    setup_config
    build_app
    setup_audio
    create_service
    show_final_instructions
}

# Run main function
main "$@"