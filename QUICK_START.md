# Xeno Public Release - Quick Start

## 🚀 Fastest Setup (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/chaitanya-science/xeno-public-release.git
cd xeno-public-release
./install.sh

# 2. Configure API key
cp config.template.json config.json
# Edit config.json and replace YOUR_OPENAI_API_KEY_HERE with your OpenAI API key

# 3. Start
npm start
```

## 🔑 Get Your OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Paste it in `config.json`

## 🎯 Test It Works

1. Start the app: `npm start`
2. Speak to your microphone
3. Listen for Xeno's response

## 📚 Need More Help?

- **Complete Guide**: [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)
- **Configuration**: [config.json](config.json)
- **Issues**: [GitHub Issues](https://github.com/chaitanya-science/xeno-public-release/issues)

## 🐳 Docker Alternative

```bash
# Quick Docker setup
docker-compose up -d
```

---

**That's it! You're ready to chat with Xeno! 🤖**