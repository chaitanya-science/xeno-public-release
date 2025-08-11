# Audio Processing System

This module provides audio processing capabilities for the AI Wellness Companion, including wake word detection, speech-to-text, and text-to-speech functionality.

## Wake Word Detection

The wake word detection system uses Porcupine by Picovoice for local, privacy-preserving wake word detection.

### Features

- **Local Processing**: Wake word detection runs entirely on-device for privacy
- **Low Latency**: Meets 2-second response time requirement
- **Failure Handling**: Automatic failure detection and troubleshooting guidance
- **Multiple Keywords**: Support for various built-in wake words
- **Resource Management**: Proper cleanup and resource disposal

### Quick Start

```typescript
import { WakeWordDetectorFactory } from './wake-word-factory';
import { AudioSystemConfig } from '../config/interfaces';

// Configure the system
const config: AudioSystemConfig = {
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
  bufferSize: 512,
  wakeWordSensitivity: 0.7,
  noiseReductionEnabled: true,
  porcupine: {
    accessKey: 'YOUR_PORCUPINE_ACCESS_KEY',
    keyword: 'xeno',
    sensitivity: 0.7
  }
};

// Create and initialize detector
const detector = WakeWordDetectorFactory.createPorcupineDetector(config);
await detector.initialize();

// Set up callback
detector.onWakeWordDetected(() => {
  console.log('Wake word detected!');
  // Trigger speech-to-text pipeline
});

// Start listening
await detector.startListening();
```

### Available Keywords

The system supports the following built-in keywords:

- `xeno` (custom model - default)
- `computer`
- `hey google`
- `hey siri`
- `alexa`
- `ok google`
- `picovoice`
- `porcupine`
- `bumblebee`
- `terminator`
- `jarvis`

### Configuration

#### Audio Configuration

```typescript
interface AudioConfig {
  sampleRate: number;    // Default: 16000 Hz
  channels: number;      // Default: 1 (mono)
  bitDepth: number;      // Default: 16 bits
  bufferSize: number;    // Default: 512 samples
}
```

#### Porcupine Configuration

```typescript
interface PorcupineConfig {
  accessKey: string;     // Required: Porcupine access key
  keyword: string;       // Wake word to detect
  sensitivity: number;   // Detection sensitivity (0.0 - 1.0)
}
```

### Error Handling

The system includes comprehensive error handling:

#### Initialization Errors
- Invalid access key
- Missing dependencies
- Audio device issues

#### Runtime Errors
- Microphone failures
- Audio processing errors
- Network connectivity issues

#### Failure Recovery
- Automatic retry logic
- Failure count tracking
- Troubleshooting guidance after 3 consecutive failures

### Performance Requirements

The wake word detection system meets the following requirements:

- **Response Time**: < 2 seconds from wake word to activation
- **Accuracy**: Optimized for elderly users and various speech patterns
- **Resource Usage**: Minimal CPU and memory footprint
- **Reliability**: Continuous operation with automatic recovery

### Testing

Comprehensive unit tests cover:

- Initialization and configuration
- Wake word detection accuracy
- Failure handling and recovery
- Resource cleanup
- Performance requirements

Run tests with:
```bash
npm test -- --testPathPattern="wake-word"
```

### Dependencies

- `@picovoice/porcupine-node`: Wake word detection engine
- `@picovoice/pvrecorder-node`: Audio recording functionality

### Getting a Porcupine Access Key

1. Visit [Picovoice Console](https://console.picovoice.ai/)
2. Sign up for a free account
3. Create a new project
4. Generate an access key
5. Add the key to your configuration

### Troubleshooting

#### Common Issues

**"Wake word detector initialization failed"**
- Check your Porcupine access key
- Verify internet connection for key validation
- Ensure audio permissions are granted

**"Microphone error"**
- Check microphone connection
- Verify audio device permissions
- Test with other audio applications

**"Wake word not detected"**
- Speak clearly and at normal volume
- Reduce background noise
- Try adjusting sensitivity settings
- Check microphone positioning

#### Debug Mode

Enable debug logging by setting the log level in your configuration:

```typescript
const config = {
  // ... other config
  system: {
    logLevel: 'debug'
  }
};
```

### Integration with Other Components

The wake word detection system integrates with:

- **Speech-to-Text**: Activates STT pipeline on wake word detection
- **Conversation Manager**: Initializes conversation session
- **System Monitor**: Reports health status and failures
- **Configuration Manager**: Loads settings and API keys

### Privacy Considerations

- Wake word detection runs entirely on-device
- No audio is transmitted until wake word is detected
- Temporary audio buffers are automatically cleared
- User has full control over when the system is listening

### Future Enhancements

Planned improvements include:

- Custom wake word training
- Multi-language support
- Adaptive sensitivity based on environment
- Voice activity detection optimization
- Hardware-specific optimizations for Raspberry Pi