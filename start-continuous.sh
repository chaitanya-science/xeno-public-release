#!/bin/bash

# AI Wellness Companion - Continuous Listening Startup Script
# This script starts the AI Wellness Companion in continuous listening mode
# No wake word detection - always ready to listen and respond

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION=$(node -e "console.log(require('$PROJECT_ROOT/package.json').version)" 2>/dev/null || echo "1.0.0")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_header() {
    echo ""
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE} $1${NC}"
    echo -e "${PURPLE}========================================${NC}"
    echo ""
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

# Welcome message
log_header "AI Wellness Companion - Continuous Listening Mode"
log_info "Version: $VERSION"
log_info "Project Root: $PROJECT_ROOT"
echo ""

cd "$PROJECT_ROOT"

# Check if we're in development or production mode
if [ "$NODE_ENV" = "production" ]; then
    log_header "Production Mode - Continuous Listening"
    log_info "No wake word required - speak anytime!"
    
    # Production startup
    npm start
else
    log_header "Development Mode - Continuous Listening"
    log_info "Debug mode enabled - detailed logging active"
    log_info "No wake word required - speak anytime!"
    
    # Development startup with debug output
    npm run dev
fi

echo ""
log_success "AI Wellness Companion started successfully!"
log_info "The assistant is now listening continuously"
log_info "Simply start talking - no wake word needed"
echo ""
echo -e "${CYAN}💬 How to interact:${NC}"
echo "   • Just start speaking naturally"
echo "   • The system will detect your voice automatically" 
echo "   • Wait for Xeno's response, then continue the conversation"
echo "   • Say 'goodbye' or 'thank you' to end the session"
echo ""
echo -e "${YELLOW}🔊 Audio Requirements:${NC}"
echo "   • Working microphone (USB recommended for Raspberry Pi)"
echo "   • Speakers or headphones for audio output"
echo "   • Minimal background noise for best performance"
echo ""
echo -e "${GREEN}🎉 Ready to support your wellness journey!${NC}"
