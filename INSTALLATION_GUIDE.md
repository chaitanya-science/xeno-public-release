# Xeno Public Release - Complete Installation Guide

<div align="center">

![Xeno Logo](https://img.shields.io/badge/🤖_Xeno-Public_Release-6f42c1?style=for-the-badge)

**Open Source AI Wellness Companion**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## 🚀 Quick Start (Recommended)

### One-Line Installation

```bash
git clone https://github.com/chaitanya-science/xeno-public-release.git && cd xeno-public-release && chmod +x install.sh && ./install.sh
```

The installation script will:
- ✅ Check system requirements
- ✅ Install system dependencies
- ✅ Install Node.js packages
- ✅ Build the application
- ✅ Set up configuration templates
- ✅ Test audio (optional)
- ✅ Create systemd service (Linux, optional)

---

## 📋 System Requirements

### Minimum Requirements
| Component | Requirement |
|-----------|-------------|
| **OS** | Linux, macOS, Windows (WSL2) |
| **Node.js** | 18.0.0 or higher |
| **RAM** | 2GB minimum, 4GB recommended |
| **Storage** | 1GB free space |
| **Audio** | Microphone and speakers/headphones |

### Recommended Hardware
- **Raspberry Pi 4** (4GB+ RAM) for dedicated deployment
- **USB microphone** for better audio quality
- **Ethernet connection** for stable internet

---

## 🛠️ Manual Installation

If you prefer manual installation or the script doesn't work for your system:

### 1. Clone Repository
```bash
git clone https://github.com/chaitanya-science/xeno-public-release.git
cd xeno-public-release
```

### 2. Install System Dependencies

#### Ubuntu/Debian/Raspberry Pi OS
```bash
sudo apt update
sudo apt install -y build-essential python3-dev libasound2-dev alsa-utils pulseaudio sox portaudio19-dev pkg-config
```

#### macOS (with Homebrew)
```bash
brew install sox portaudio pkg-config
```

#### Windows (WSL2)
```bash
sudo apt update
sudo apt install -y build-essential python3-dev libasound2-dev alsa-utils pulseaudio sox portaudio19-dev pkg-config
```

### 3. Install Node.js Dependencies
```bash
npm install
```

### 4. Build Application
```bash
npm run build
```

### 5. Configure Application
```bash
cp config.template.json config.json
# Edit config.json with your API keys (see Configuration section)
```

---

## ⚙️ Configuration

### Required API Keys

#### 1. OpenAI API Key (Required)
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create account or sign in
3. Generate new API key
4. Copy the key (starts with `sk-`)

#### 2. Google Cloud Speech Services (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Speech-to-Text and Text-to-Speech APIs
4. Create service account with "Speech Client" role
5. Download JSON key file

### Configuration Steps

#### Method 1: Edit config.json (Recommended)
```bash
# Copy template
cp config.template.json config.json

# Edit with your favorite editor
nano config.json  # or vim, code, etc.
```

Replace these placeholders:
```json
{
  "ai": {
    "openai": {
      "apiKey": "YOUR_OPENAI_API_KEY_HERE"  // Replace with sk-...
    },
    "speechServices": {
      "projectId": "YOUR_GOOGLE_PROJECT_ID"  // Replace with your project ID
    }
  }
}
```

#### Method 2: Environment Variables
```bash
export OPENAI_API_KEY="sk-your-openai-key-here"
export GOOGLE_APPLICATION_CREDENTIALS="./google-service-account.json"
export NODE_ENV="production"
```

#### Method 3: Google Cloud Service Account
```bash
# Copy template
cp google-service-account.template.json google-service-account.json

# Edit with your service account details
nano google-service-account.json
```

---

## 🎵 Audio Setup

### Linux/Raspberry Pi
```bash
# Test microphone
arecord -d 5 test.wav && aplay test.wav

# List audio devices
arecord -l  # Input devices
aplay -l   # Output devices

# Configure default devices (if needed)
sudo nano /etc/asound.conf
```

### macOS
```bash
# Test with built-in tools
# Use System Preferences > Sound to configure devices
```

### Troubleshooting Audio
- **No microphone detected**: Check USB connections, try different ports
- **Permission denied**: Add user to `audio` group: `sudo usermod -a -G audio $USER`
- **Poor quality**: Use USB microphone instead of 3.5mm jack
- **No sound output**: Check speaker/headphone connections and volume

---

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Background Service (Linux)
```bash
# If systemd service was created during installation
sudo systemctl start xeno
sudo systemctl status xeno

# View logs
journalctl -u xeno -f
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 🧪 Testing & Verification

### 1. Run Tests
```bash
npm test
```

### 2. Check Configuration
```bash
# Verify config file
node -e "console.log(JSON.parse(require('fs').readFileSync('config.json', 'utf8')))"
```

### 3. Test Voice Interaction
1. Start the application: `npm start`
2. Speak to your microphone
3. Listen for AI response through speakers
4. Check logs for any errors

### 4. Health Check
```bash
# If running as service
curl http://localhost:3000/health  # If health endpoint exists
```

---

## 🔧 Troubleshooting

### Common Issues

#### "OpenAI API key is required"
- ✅ Verify API key in `config.json` starts with `sk-`
- ✅ Check environment variable: `echo $OPENAI_API_KEY`
- ✅ Ensure no extra spaces or quotes

#### "Module not found" errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### Audio device errors
```bash
# Check audio system
pulseaudio --check -v
sudo systemctl restart pulseaudio

# Test ALSA
speaker-test -c 2 -t wav
```

#### Build failures on Raspberry Pi
```bash
# Increase swap space
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile  # Set CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

#### Google Cloud authentication
- ✅ Verify service account JSON file is valid
- ✅ Check APIs are enabled in Google Cloud Console
- ✅ Ensure service account has proper permissions

### Getting Help

1. **Check logs**: Look in `logs/` directory or use `journalctl -u xeno -f`
2. **GitHub Issues**: [Report bugs](https://github.com/chaitanya-science/xeno-public-release/issues)
3. **Discussions**: [Ask questions](https://github.com/chaitanya-science/xeno-public-release/discussions)

---

## 🐳 Docker Deployment

### Quick Docker Setup
```bash
# Build image
docker build -t xeno-public-release .

# Run with docker-compose (recommended)
docker-compose up -d
```

### Custom Docker Run
```bash
docker run -d \
  --name xeno \
  --device /dev/snd \
  -v $(pwd)/config.json:/usr/src/app/config.json:ro \
  -v $(pwd)/data:/usr/src/app/data \
  -p 3000:3000 \
  xeno-public-release
```

---

## 🔒 Security & Privacy

### Data Protection
- ✅ **Local Processing**: Voice data processed locally when possible
- ✅ **Encryption**: Conversations encrypted at rest
- ✅ **No Data Collection**: No telemetry or usage tracking
- ✅ **API Security**: Secure HTTPS connections to AI services

### Best Practices
- 🔑 **Rotate API keys** regularly
- 🔒 **Use environment variables** in production
- 🛡️ **Keep dependencies updated**: `npm audit fix`
- 🔐 **Secure config files**: `chmod 600 config.json`

---

## 📊 Performance Optimization

### Raspberry Pi Optimization
```bash
# GPU memory split
sudo raspi-config  # Advanced Options > Memory Split > 16

# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable wifi-powersave

# CPU governor
echo 'performance' | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

### General Optimization
- 🚀 **Use SSD storage** instead of SD card (Pi)
- 💾 **Increase swap space** for build process
- 🌐 **Use ethernet** instead of WiFi for stability
- ⚡ **Close unnecessary applications** during use

---

## 🔄 Updates & Maintenance

### Updating Xeno
```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Rebuild
npm run build

# Restart service
sudo systemctl restart xeno  # If using systemd
```

### Maintenance Tasks
```bash
# Clean logs
npm run clean

# Update Node.js dependencies
npm update

# Security audit
npm audit fix
```

---

## 🎯 Usage Examples

### Basic Voice Interaction
1. Start application: `npm start`
2. Say: "Hello, how are you today?"
3. Listen for Xeno's response
4. Continue conversation naturally

### Configuration Examples

#### High Performance Setup
```json
{
  "system": {
    "performanceMode": "high",
    "lowLatencyMode": true,
    "responseTimeoutMs": 5000
  },
  "audio": {
    "sampleRate": 44100,
    "bufferSize": 256
  }
}
```

#### Privacy-Focused Setup
```json
{
  "privacy": {
    "localProcessingOnly": true,
    "allowConversationHistory": false,
    "autoDeleteAudio": true,
    "dataRetentionDays": 1
  }
}
```

---

## 📚 Additional Resources

### Documentation
- 📖 **README.md** - Quick overview
- ⚙️ **config.json** - All configuration options
- 🔧 **src/README.md** - Development guide

### Community
- 💬 **GitHub Discussions** - Questions and community support
- 🐛 **GitHub Issues** - Bug reports and feature requests
- 📧 **Contact** - [Creator's GitHub](https://github.com/chaitanya-science)

### Related Projects
- 🤖 **OpenAI API** - [Documentation](https://platform.openai.com/docs)
- 🎤 **Google Cloud Speech** - [Documentation](https://cloud.google.com/speech-to-text/docs)
- 🥧 **Raspberry Pi** - [Official Documentation](https://www.raspberrypi.org/documentation/)

---

<div align="center">

## 🌟 Support the Project

If Xeno helped you, please consider:

[![Star on GitHub](https://img.shields.io/badge/⭐_Star_on_GitHub-yellow?style=for-the-badge)](https://github.com/chaitanya-science/xeno-public-release)
[![Follow Creator](https://img.shields.io/badge/👨‍💻_Follow_Creator-blue?style=for-the-badge)](https://github.com/chaitanya-science)

**Built with ❤️ for mental health and wellness**

*Created by [Chaitanya Mishra](https://github.com/chaitanya-science)*

</div>