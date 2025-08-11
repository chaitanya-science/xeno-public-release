#!/bin/bash

# AI Wellness Companion - Repository Cleanup Script
# This script cleans up temporary files, build artifacts, and prepares the repo for deployment

set -e

echo "🧹 Starting repository cleanup..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to safely remove files/directories
safe_remove() {
    if [ -e "$1" ]; then
        rm -rf "$1"
        log_success "Removed: $1"
    else
        log_info "Not found (skipping): $1"
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "Not in project root directory. Please run from the xeno-public-release root."
    exit 1
fi

log_info "Cleaning temporary files..."

# Remove temporary files
safe_remove "temp_*.js"
safe_remove "temp_*.json"
safe_remove "*.tmp"
safe_remove "*.temp"
safe_remove ".temp/"

# Remove system files
safe_remove ".DS_Store"
find . -name ".DS_Store" -delete 2>/dev/null || true
safe_remove "Thumbs.db"
safe_remove "*.bak"
safe_remove "*.old"

log_info "Cleaning build artifacts..."

# Remove build outputs
safe_remove "dist/"
safe_remove "build/"
safe_remove "*.tsbuildinfo"

log_info "Cleaning logs and coverage..."

# Remove logs
safe_remove "logs/"
safe_remove "*.log"
safe_remove "npm-debug.log*"
safe_remove "yarn-debug.log*"
safe_remove "yarn-error.log*"

# Remove coverage files
safe_remove "coverage/"
safe_remove ".nyc_output"
safe_remove "*.lcov"

log_info "Cleaning test artifacts..."

# Remove test database files from tests
find src/ -name "*.db" -delete 2>/dev/null || true
find . -name "test-*.db" -delete 2>/dev/null || true

# Remove temporary audio files from tests
safe_remove "test-audio/"
find . -name "test-*.wav" -delete 2>/dev/null || true
find . -name "test-*.mp3" -delete 2>/dev/null || true

log_info "Cleaning IDE and editor files..."

# Remove IDE files
safe_remove ".vscode/settings.json"
safe_remove "*.swp"
safe_remove "*.swo"
safe_remove "*~"

log_info "Verifying critical files..."

# Check for critical files
critical_files=(
    "package.json"
    "tsconfig.json" 
    "jest.config.js"
    "src/main.ts"
    "src/index.ts"
    "config.template.json"
    "deployment/install.sh"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        log_success "Critical file present: $file"
    else
        log_error "Missing critical file: $file"
    fi
done

log_info "Checking package dependencies..."

# Verify package.json integrity
if node -e "require('./package.json')" 2>/dev/null; then
    log_success "package.json is valid"
else
    log_error "package.json has syntax errors"
fi

# Check for security vulnerabilities (if npm audit is available)
if command -v npm >/dev/null 2>&1; then
    log_info "Running security audit..."
    if npm audit --audit-level moderate --production 2>/dev/null; then
        log_success "No security vulnerabilities found"
    else
        log_warning "Security vulnerabilities detected - run 'npm audit fix' if needed"
    fi
fi

log_info "Optimizing file permissions..."

# Set appropriate permissions
chmod +x deployment/*.sh 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true

log_info "Repository size analysis..."

# Show repository size
if command -v du >/dev/null 2>&1; then
    REPO_SIZE=$(du -sh . 2>/dev/null | cut -f1)
    log_info "Repository size: $REPO_SIZE"
fi

# Count files
FILE_COUNT=$(find . -type f | wc -l | tr -d ' ')
log_info "Total files: $FILE_COUNT"

# Check for large files
log_info "Checking for large files (>1MB)..."
large_files=$(find . -type f -size +1M 2>/dev/null | head -5)
if [ -n "$large_files" ]; then
    log_warning "Large files found:"
    echo "$large_files"
else
    log_success "No large files found"
fi

echo ""
log_success "Repository cleanup completed!"
echo ""
log_info "Summary:"
echo "  - Temporary files removed"
echo "  - Build artifacts cleaned"
echo "  - Test artifacts removed"
echo "  - Logs and coverage data cleared"
echo "  - File permissions optimized"
echo "  - Critical files verified"
echo ""
log_info "Next steps:"
echo "  1. Run 'npm install' to restore dependencies"
echo "  2. Run 'npm run build' to create fresh build"
echo "  3. Run 'npm test' to verify functionality"
echo "  4. Use 'deployment/deploy.sh' for deployment"
echo ""
