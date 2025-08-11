"use strict";
// Offline mode manager implementation
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineModeManagerImpl = void 0;
class OfflineModeManagerImpl {
    constructor() {
        this.isOffline = false;
        this.cachedResponses = new Map();
        this.operationQueue = []; // queued operations while offline
        this.offlineCapabilities = {
            canProcessWakeWord: true,
            canProvideBasicResponses: true,
            canAccessMemories: true,
            canDetectCrisis: true,
            limitedFunctionality: [
                'AI-generated responses are not available',
                'Speech-to-text accuracy may be reduced',
                'Text-to-speech uses basic voice synthesis',
                'Crisis resources database may not be current',
                'Cannot access real-time information'
            ]
        };
        // Map alias capability flags expected by integration tests
        this.offlineCapabilities.basicConversation = this.offlineCapabilities.canProvideBasicResponses;
        this.offlineCapabilities.crisisDetection = this.offlineCapabilities.canDetectCrisis;
        this.offlineCapabilities.speechRecognition = false; // disabled offline
        this.offlineCapabilities.textToSpeech = false; // basic voice only
        this.initializeBasicResponses();
    }
    async activate() {
        console.log('Activating offline mode');
        this.isOffline = true;
        // Initialize offline capabilities
        await this.loadCachedResponses();
        await this.prepareOfflineServices();
        console.log('Offline mode activated successfully');
    }
    async deactivate() {
        console.log('Deactivating offline mode');
        this.isOffline = false;
        // Clean up offline-specific resources
        await this.cleanupOfflineServices();
        console.log('Offline mode deactivated successfully');
    }
    isActive() {
        return this.isOffline;
    }
    async getCachedResponse(input) {
        const normalizedInput = this.normalizeInput(input);
        // Check for exact matches first
        if (this.cachedResponses.has(normalizedInput)) {
            return this.cachedResponses.get(normalizedInput);
        }
        // Check for partial matches using keywords
        const response = this.findBestMatch(normalizedInput);
        if (response) {
            return response;
        }
        // Return default offline response if no match found
        return this.getDefaultOfflineResponse();
    }
    async addCachedResponse(input, response) {
        const normalizedInput = this.normalizeInput(input);
        this.cachedResponses.set(normalizedInput, response);
        // Persist to storage for future offline sessions
        await this.persistCachedResponse(normalizedInput, response);
    }
    getOfflineCapabilities() {
        return { ...this.offlineCapabilities };
    }
    explainLimitedFunctionality() {
        return `I'm currently in offline mode, which means some of my features are limited. Here's what I can still do:

✓ Listen for wake words and respond to you
✓ Have basic conversations using my cached responses
✓ Access our previous conversation memories
✓ Detect if you need crisis support and provide emergency contacts

However, these features are currently unavailable:
${this.offlineCapabilities.limitedFunctionality.map(item => `• ${item}`).join('\n')}

I'll automatically return to full functionality once my internet connection is restored. In the meantime, I'm still here to chat and provide support as best I can.`;
    }
    initializeBasicResponses() {
        // Empathetic responses
        this.cachedResponses.set('how are you', "I'm here and ready to listen. How are you feeling today?");
        this.cachedResponses.set('hello', "Hello! It's good to hear from you. What's on your mind?");
        this.cachedResponses.set('hi', "Hi there! I'm glad you're here. How can I support you today?");
        this.cachedResponses.set('good morning', "Good morning! I hope you're having a peaceful start to your day.");
        this.cachedResponses.set('good evening', "Good evening! How has your day been?");
        // Emotional support responses
        this.cachedResponses.set('sad', "I'm sorry you're feeling sad. Sometimes it helps to talk about what's troubling you. I'm here to listen.");
        this.cachedResponses.set('lonely', "Feeling lonely can be really difficult. You're not alone though - I'm here with you, and there are people who care about you.");
        this.cachedResponses.set('worried', "It sounds like you have some concerns on your mind. Would you like to share what's worrying you?");
        this.cachedResponses.set('anxious', "Anxiety can feel overwhelming. Take a deep breath with me. What's making you feel anxious right now?");
        this.cachedResponses.set('tired', "It sounds like you're feeling worn down. Rest is important. Is there something specific that's been draining your energy?");
        // Conversation starters
        this.cachedResponses.set('what should we talk about', "We could talk about anything you'd like - how you're feeling, something that happened today, a memory you'd like to share, or just whatever comes to mind.");
        this.cachedResponses.set('tell me something', "I'd love to hear about your day, or perhaps you could share a favorite memory with me?");
        // Crisis-related responses (basic)
        this.cachedResponses.set('help', "I'm here to help. If this is an emergency, please call 911. If you're having thoughts of hurting yourself, please contact the National Suicide Prevention Lifeline at 988. Otherwise, tell me what kind of support you need.");
        this.cachedResponses.set('emergency', "If this is a medical emergency, please call 911 immediately. If you need mental health crisis support, you can call 988 for the Suicide & Crisis Lifeline. I'm also here to listen if you'd like to talk.");
        // Default responses for unclear input
        this.cachedResponses.set('default', "I'm listening. Could you tell me a bit more about what you're thinking or feeling?");
        this.cachedResponses.set('unclear', "I want to make sure I understand you correctly. Could you rephrase that for me?");
        this.cachedResponses.set('offline_default', "I'm in offline mode right now, so my responses are more limited than usual. But I'm still here to listen and support you as best I can. What would you like to talk about?");
    }
    normalizeInput(input) {
        return input.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }
    findBestMatch(input) {
        const keywords = input.split(' ');
        let bestMatch = null;
        let bestScore = 0;
        for (const [cachedInput, response] of this.cachedResponses.entries()) {
            const score = this.calculateMatchScore(keywords, cachedInput);
            if (score > bestScore && score > 0.2) { // Lower threshold for better matching
                bestScore = score;
                bestMatch = response;
            }
        }
        return bestMatch;
    }
    calculateMatchScore(inputKeywords, cachedInput) {
        const cachedKeywords = cachedInput.split(' ');
        let matches = 0;
        for (const keyword of inputKeywords) {
            if (cachedKeywords.some(cached => cached.includes(keyword) ||
                keyword.includes(cached) ||
                (keyword.length > 2 && cached.length > 2 &&
                    (keyword.startsWith(cached.substring(0, 3)) || cached.startsWith(keyword.substring(0, 3)))))) {
                matches++;
            }
        }
        return matches / Math.max(inputKeywords.length, cachedKeywords.length);
    }
    // Integration test convenience wrappers
    async activateOfflineMode() { return this.activate(); }
    async deactivateOfflineMode() { return this.deactivate(); }
    isOfflineMode() { return this.isActive(); }
    // Operation queue management for deferred processing
    async queueOperation(operation) {
        if (!this.isOffline)
            return; // only queue while offline
        this.operationQueue.push({ ...operation, queuedAt: Date.now() });
    }
    getQueueSize() { return this.operationQueue.length; }
    async processQueuedOperations(processor) {
        const toProcess = [...this.operationQueue];
        this.operationQueue = [];
        let processed = 0;
        for (const op of toProcess) {
            try {
                if (processor) {
                    await processor(op);
                }
                processed++;
            }
            catch (err) {
                console.warn('Failed to process queued operation, re-queueing:', err);
                this.operationQueue.push(op); // requeue on failure
            }
        }
        return processed;
    }
    getOfflineNotification() {
        return 'My internet connection is limited right now, so I\'m operating with limited functionality. I can still have basic conversations and provide support.';
    }
    getDefaultOfflineResponse() {
        const responses = [
            "I'm in offline mode, so my responses are more basic right now. But I'm still here to listen. What's on your mind?",
            "Even though I'm offline, I want you to know I'm here for you. Tell me what you're thinking about.",
            "My internet connection is limited right now, but that doesn't change the fact that I care about how you're doing. What would you like to talk about?",
            "I may be in offline mode, but my support for you remains the same. How are you feeling today?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    async loadCachedResponses() {
        try {
            // In a real implementation, this would load from persistent storage
            console.log('Loading cached responses from storage');
            // For now, we rely on the initialized responses
        }
        catch (error) {
            console.warn('Failed to load cached responses:', error);
        }
    }
    async prepareOfflineServices() {
        try {
            // Initialize offline-capable services
            console.log('Preparing offline services');
            // Ensure wake word detection continues to work
            // Ensure local memory access is available
            // Prepare basic crisis detection keywords
        }
        catch (error) {
            console.error('Failed to prepare offline services:', error);
        }
    }
    async cleanupOfflineServices() {
        try {
            console.log('Cleaning up offline services');
            // Clean up any offline-specific resources
        }
        catch (error) {
            console.error('Failed to cleanup offline services:', error);
        }
    }
    async persistCachedResponse(input, response) {
        try {
            // In a real implementation, this would save to persistent storage
            console.log(`Persisting cached response for: ${input}`);
        }
        catch (error) {
            console.warn('Failed to persist cached response:', error);
        }
    }
}
exports.OfflineModeManagerImpl = OfflineModeManagerImpl;
//# sourceMappingURL=offline-mode-manager.js.map