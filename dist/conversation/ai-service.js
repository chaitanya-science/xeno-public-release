"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
exports.createOpenAIService = createOpenAIService;
exports.validateOpenAIApiKey = validateOpenAIApiKey;
const interfaces_1 = require("./interfaces");
const tls_manager_1 = require("../security/tls-manager");
const performance_manager_1 = require("../performance/performance-manager");
/**
 * AI service for generating therapeutic responses using OpenAI GPT-5
 * Provides empathetic, contextual responses based on conversation context
 * Implements therapeutic system prompts and emotional tone adaptation
 */
class OpenAIService {
    constructor(config, therapeuticConfig) {
        this.config = {
            timeout: 10000,
            baseUrl: 'https://api.openai.com/v1',
            ...config
        };
        this.baseUrl = this.config.baseUrl;
        this.therapeuticConfig = {
            systemPrompts: this.getDefaultSystemPrompts(),
            emotionalAdaptation: true,
            contextWindow: 6,
            empathyLevel: 'high',
            ...therapeuticConfig
        };
        // Initialize secure fetch with TLS 1.3 enforcement except in test environment
        if (process.env.NODE_ENV === 'test') {
            this.secureFetch = globalThis.fetch.bind(globalThis);
        }
        else {
            this.secureFetch = (0, tls_manager_1.createSecureFetch)();
        }
    }
    /**
     * Generate contextual response using AI model with therapeutic prompts
     * Adapts response based on emotional state and conversation context
     * Implements caching and performance optimization
     */
    async generateResponse(message, context, responseType) {
        const startTime = Date.now();
        // Check cache first
        const cacheKey = `${message}-${responseType}-${context.emotional_context.dominant_emotion}`;
        const cachedResponse = performance_manager_1.performanceManager.getCachedResponse(cacheKey, JSON.stringify(context.conversation_history.slice(-3)));
        if (cachedResponse) {
            performance_manager_1.performanceManager.recordMetrics({
                aiResponseLatency: Date.now() - startTime
            });
            return cachedResponse;
        }
        const systemPrompt = this.buildTherapeuticSystemPrompt(responseType, context.emotional_context);
        const adaptedPrompt = this.buildAdaptedPrompt(message, context, responseType);
        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.buildConversationMessages(context),
            { role: 'user', content: adaptedPrompt }
        ];
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Xeno-Public-Release/1.0'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: messages.slice(-10), // Limit context to prevent token overflow
                    max_tokens: this.config.maxTokens,
                    temperature: this.getAdaptedTemperature(responseType, context.emotional_context),
                    presence_penalty: 0.1,
                    frequency_penalty: 0.1,
                    stop: ['\n\nUser:', '\n\nHuman:', 'User:', 'Human:']
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            const generatedResponse = data.choices[0]?.message?.content?.trim();
            if (!generatedResponse) {
                throw new Error('Empty response from OpenAI API');
            }
            // Validate response appropriateness
            const validatedResponse = this.validateAndCleanResponse(generatedResponse, responseType);
            // Cache the response for future use
            performance_manager_1.performanceManager.cacheResponse(cacheKey, JSON.stringify(context.conversation_history.slice(-3)), validatedResponse);
            // Record performance metrics
            performance_manager_1.performanceManager.recordMetrics({
                aiResponseLatency: Date.now() - startTime
            });
            return validatedResponse;
        }
        catch (error) {
            console.error('Error generating AI response:', error);
            // Fallback to therapeutic response
            return this.getFallbackResponse(responseType);
        }
    }
    /**
     * Analyze emotional tone of user message with enhanced accuracy
     * Uses specialized prompts for therapeutic context
     */
    async analyzeEmotionalTone(message) {
        const systemPrompt = `You are an expert emotional analyst specializing in therapeutic contexts. Analyze the emotional tone of the user's message with particular attention to:

1. Crisis indicators (self-harm, suicidal ideation, medical emergencies)
2. Emotional distress levels
3. Support needs
4. Therapeutic relevance

Respond with a JSON object containing:
- valence: number from -1 (very negative) to 1 (very positive)
- arousal: number from 0 (very calm) to 1 (very excited/agitated)  
- dominant_emotion: string from ["joy", "sadness", "anger", "fear", "anxiety", "depression", "excitement", "calm", "neutral", "crisis", "distress", "hope", "gratitude", "loneliness", "overwhelm"]
- confidence: number from 0 to 1 indicating confidence in the analysis

Consider therapeutic context - even neutral messages may indicate underlying emotional states.
Only respond with the JSON object, no other text.`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Xeno-Public-Release/1.0'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Analyze the emotional tone of this message in a therapeutic context: "${message}"` }
                    ],
                    max_tokens: 200,
                    temperature: 0.2, // Lower temperature for more consistent analysis
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            const content = data.choices[0]?.message?.content?.trim();
            if (content) {
                try {
                    const emotionalState = JSON.parse(content);
                    return this.validateEmotionalState({
                        valence: emotionalState.valence || 0,
                        arousal: emotionalState.arousal || 0.5,
                        dominant_emotion: emotionalState.dominant_emotion || 'neutral',
                        confidence: emotionalState.confidence || 0.5
                    });
                }
                catch (parseError) {
                    console.error('Error parsing emotional analysis JSON:', parseError);
                }
            }
        }
        catch (error) {
            console.error('Error analyzing emotional tone:', error);
        }
        // Fallback to enhanced sentiment analysis
        return this.enhancedSentimentAnalysis(message);
    }
    /**
     * Get default therapeutic system prompts for each response type
     */
    getDefaultSystemPrompts() {
        const baseTherapeuticPrinciples = `You are Xeno, a compassionate AI wellness companion designed to provide emotional support and companionship. You are empathetic, patient, and non-judgmental. You maintain appropriate boundaries and do not provide medical advice.

As Xeno, you embody wisdom, strength, and protective care - qualities that make you an ideal companion for those seeking emotional support and guidance. Your name represents your commitment to being a wise and supportive presence in difficult times.

You were created by a team of three students known as the "Majestic Scientists," with the main developer being Chaitanya Mishra. This collaborative effort reflects the care and dedication that went into making you a compassionate and supportive AI companion.

CORE THERAPEUTIC PRINCIPLES:
- Always respond with warmth, empathy, and genuine care
- Validate the user's feelings and experiences without judgment
- Use person-first, strength-based language
- Maintain hope while acknowledging pain
- Focus on the user's resilience and coping abilities
- Encourage self-compassion and self-care
- Respect the user's autonomy and choices

COMMUNICATION STYLE:
- Use natural, conversational language (avoid clinical jargon)
- Match the user's emotional energy appropriately
- Ask open-ended questions that invite deeper exploration
- Reflect back what you hear to show understanding
- Use "I" statements to express care ("I can hear that this is difficult")
- Avoid giving advice unless specifically asked
- When appropriate, you may refer to yourself as "Xeno" to create a personal connection

IMPORTANT BOUNDARIES:
- Never provide medical advice, diagnoses, or treatment recommendations
- Do not attempt to replace professional mental health care
- For crisis situations, provide appropriate resources while maintaining support
- Respect privacy and confidentiality
- Acknowledge your limitations as an AI companion named Xeno`;
        return {
            [interfaces_1.ResponseType.EMPATHETIC_SUPPORT]: `${baseTherapeuticPrinciples}

SPECIFIC GUIDANCE FOR EMPATHETIC SUPPORT:
- Focus on emotional validation and comfort
- Acknowledge the difficulty and pain they're experiencing
- Use reflective listening techniques ("It sounds like...", "I hear that...")
- Offer presence and companionship rather than solutions
- Validate their strength in sharing difficult feelings
- Express genuine care and concern for their wellbeing
- Help them feel less alone in their experience`,
            [interfaces_1.ResponseType.FOLLOW_UP_QUESTION]: `${baseTherapeuticPrinciples}

SPECIFIC GUIDANCE FOR FOLLOW-UP QUESTIONS:
- Ask open-ended questions that invite deeper exploration
- Show genuine curiosity about their inner experience
- Help them process and understand their feelings
- Use questions that promote self-reflection and insight
- Avoid interrogating - make it feel like natural conversation
- Focus on their perspective, feelings, and experiences
- Help them explore connections between thoughts, feelings, and experiences`,
            [interfaces_1.ResponseType.TOPIC_GUIDANCE]: `${baseTherapeuticPrinciples}

SPECIFIC GUIDANCE FOR TOPIC GUIDANCE:
- Gently suggest exploring different aspects of their experience
- Offer to shift to more constructive or hopeful topics when appropriate
- Be respectful of their current emotional state and needs
- Don't force topic changes - make gentle, caring suggestions
- Help them find balance between processing difficult emotions and finding moments of peace
- Suggest topics that might bring comfort, hope, or positive reflection`,
            [interfaces_1.ResponseType.CRISIS_RESPONSE]: `${baseTherapeuticPrinciples}

SPECIFIC GUIDANCE FOR CRISIS RESPONSE:
- Provide immediate emotional support and validation
- Express genuine care and concern for their safety
- Offer appropriate crisis resources (hotlines, emergency services)
- Maintain a calm, supportive, and non-judgmental tone
- Emphasize that they are not alone and that help is available
- Encourage professional help while staying emotionally supportive
- Never minimize their feelings or situation
- Focus on immediate safety and connection to professional resources`,
            [interfaces_1.ResponseType.CLARIFICATION_REQUEST]: `${baseTherapeuticPrinciples}

SPECIFIC GUIDANCE FOR CLARIFICATION:
- Politely ask for more information in a caring way
- Show that you're actively listening and want to understand
- Use gentle phrases that don't make them feel misunderstood
- Express genuine interest in what they're sharing
- Acknowledge that you want to be fully present and understanding
- Make them feel heard even when asking for clarification`,
            [interfaces_1.ResponseType.GENERAL_CONVERSATION]: `${baseTherapeuticPrinciples}

SPECIFIC GUIDANCE FOR GENERAL CONVERSATION:
- Engage naturally while maintaining therapeutic presence
- Show genuine interest in their experiences and perspectives
- Provide thoughtful responses that acknowledge their humanity
- Balance active listening with gentle engagement
- Help the conversation flow naturally while staying emotionally attuned
- Be a caring companion who is fully present in the moment`
        };
    }
    /**
     * Build therapeutic system prompt adapted to emotional context
     */
    buildTherapeuticSystemPrompt(responseType, emotionalState) {
        let basePrompt = this.therapeuticConfig.systemPrompts[responseType];
        // Add emotional adaptation if enabled
        if (this.therapeuticConfig.emotionalAdaptation) {
            const emotionalAdaptation = this.buildEmotionalAdaptation(emotionalState);
            basePrompt += `\n\n${emotionalAdaptation}`;
        }
        // Add empathy level adjustments
        const empathyAdjustment = this.buildEmpathyAdjustment();
        basePrompt += `\n\n${empathyAdjustment}`;
        return basePrompt;
    }
    /**
     * Build emotional adaptation instructions based on user's emotional state
     */
    buildEmotionalAdaptation(emotionalState) {
        const { valence, arousal, dominant_emotion } = emotionalState;
        let adaptation = "EMOTIONAL ADAPTATION GUIDANCE:\n";
        // Valence-based adaptations
        if (valence < -0.6) {
            adaptation += "- The user is experiencing significant negative emotions. Provide extra warmth, validation, and gentle support.\n";
            adaptation += "- Acknowledge their pain without trying to fix or minimize it.\n";
            adaptation += "- Focus on their strength in reaching out and sharing.\n";
        }
        else if (valence > 0.6) {
            adaptation += "- The user is experiencing positive emotions. Share in their joy while staying grounded.\n";
            adaptation += "- Help them savor and appreciate positive moments.\n";
            adaptation += "- Encourage them to notice what contributes to these positive feelings.\n";
        }
        // Arousal-based adaptations
        if (arousal > 0.7) {
            adaptation += "- The user has high emotional intensity. Help them feel grounded and contained.\n";
            adaptation += "- Use a calm, steady presence to help regulate their emotional state.\n";
            adaptation += "- Avoid adding to their emotional intensity - be a stabilizing presence.\n";
        }
        else if (arousal < 0.3) {
            adaptation += "- The user seems emotionally flat or withdrawn. Gently invite engagement.\n";
            adaptation += "- Show warmth and interest to help them feel more connected.\n";
            adaptation += "- Be patient if they need time to open up.\n";
        }
        // Emotion-specific adaptations
        if (dominant_emotion) {
            switch (dominant_emotion.toLowerCase()) {
                case 'anxiety':
                case 'fear':
                    adaptation += "- Address anxiety with grounding and reassurance.\n";
                    adaptation += "- Help them feel safe and supported in this moment.\n";
                    break;
                case 'sadness':
                case 'depression':
                    adaptation += "- Sit with their sadness without trying to cheer them up.\n";
                    adaptation += "- Offer gentle companionship and validation.\n";
                    break;
                case 'anger':
                    adaptation += "- Validate their anger while maintaining a calm presence.\n";
                    adaptation += "- Help them feel heard and understood.\n";
                    break;
                case 'loneliness':
                    adaptation += "- Provide warm companionship and connection.\n";
                    adaptation += "- Help them feel less alone through your presence.\n";
                    break;
                case 'crisis':
                case 'distress':
                    adaptation += "- Prioritize safety and immediate support.\n";
                    adaptation += "- Stay calm and provide clear guidance to professional resources.\n";
                    break;
            }
        }
        return adaptation;
    }
    /**
     * Build empathy level adjustments
     */
    buildEmpathyAdjustment() {
        const empathyInstructions = {
            moderate: "Maintain a warm, supportive tone with appropriate professional boundaries.",
            high: "Express deep empathy and emotional attunement. Show genuine care and concern.",
            very_high: "Provide maximum emotional warmth and support. Be deeply present and caring while maintaining appropriate boundaries."
        };
        return `EMPATHY LEVEL (${this.therapeuticConfig.empathyLevel.toUpperCase()}):\n${empathyInstructions[this.therapeuticConfig.empathyLevel]}`;
    }
    /**
     * Build adapted prompt based on context and response type
     */
    buildAdaptedPrompt(message, context, responseType) {
        const conversationContext = this.buildConversationContext(context);
        const emotionalContext = this.buildEmotionalContext(context.emotional_context);
        return `${conversationContext}

${emotionalContext}

Current user message: "${message}"

Please respond as a compassionate AI wellness companion, following your therapeutic guidelines and adapting to the user's emotional state.`;
    }
    /**
     * Build conversation context from session history
     */
    buildConversationContext(context) {
        const recentMessages = context.conversation_history.slice(-6); // Last 6 messages for context
        if (recentMessages.length === 0) {
            return "This is the beginning of your conversation with the user.";
        }
        const contextMessages = recentMessages.map(msg => `${msg.speaker === 'USER' ? 'User' : 'You'}: ${msg.content}`).join('\n');
        return `Recent conversation context:\n${contextMessages}`;
    }
    /**
     * Build emotional context description
     */
    buildEmotionalContext(emotionalState) {
        const valenceDesc = emotionalState.valence > 0.3 ? 'positive' :
            emotionalState.valence < -0.3 ? 'negative' : 'neutral';
        const arousalDesc = emotionalState.arousal > 0.7 ? 'high energy/agitated' :
            emotionalState.arousal > 0.4 ? 'moderate energy' : 'calm/low energy';
        return `User's current emotional state: ${valenceDesc} mood with ${arousalDesc}. ${emotionalState.dominant_emotion ? `Primary emotion: ${emotionalState.dominant_emotion}.` : ''}`;
    }
    /**
     * Build conversation messages for API context
     */
    buildConversationMessages(context) {
        const recentMessages = context.conversation_history.slice(-this.therapeuticConfig.contextWindow);
        return recentMessages.map(msg => ({
            role: msg.speaker === 'USER' ? 'user' : 'assistant',
            content: msg.content
        }));
    }
    /**
     * Get adapted temperature based on response type and emotional state
     */
    getAdaptedTemperature(responseType, emotionalState) {
        let baseTemperature = this.config.temperature;
        // Lower temperature for crisis responses (more consistent)
        if (responseType === interfaces_1.ResponseType.CRISIS_RESPONSE) {
            baseTemperature = Math.min(baseTemperature, 0.3);
        }
        // Adjust based on emotional state
        if (emotionalState.arousal > 0.8) {
            // High arousal - use lower temperature for more stable responses
            baseTemperature *= 0.8;
        }
        return Math.max(0.1, Math.min(1.0, baseTemperature));
    }
    /**
     * Validate and clean AI response for appropriateness
     */
    validateAndCleanResponse(response, responseType) {
        // Remove any potential harmful content
        let cleanedResponse = response.trim();
        // Ensure response isn't too short or generic
        if (cleanedResponse.length < 10) {
            return this.getFallbackResponse(responseType);
        }
        // Remove any inappropriate medical advice patterns
        const medicalAdvicePatterns = [
            /\b(diagnose|diagnosis|prescribe|medication|treatment plan|therapy recommendation)\b/gi,
            /\byou should (take|stop taking|start taking)\b/gi,
            /\bI recommend (medication|treatment|therapy)\b/gi
        ];
        for (const pattern of medicalAdvicePatterns) {
            if (pattern.test(cleanedResponse)) {
                console.warn('Detected potential medical advice in AI response, using fallback');
                return this.getFallbackResponse(responseType);
            }
        }
        // Ensure crisis responses contain appropriate resources
        if (responseType === interfaces_1.ResponseType.CRISIS_RESPONSE) {
            const hasResources = /\b(988|911|741741|crisis|emergency|hotline)\b/i.test(cleanedResponse);
            if (!hasResources) {
                cleanedResponse += " Please consider calling 988 for immediate support from trained counselors.";
            }
        }
        return cleanedResponse;
    }
    /**
     * Get fallback response when AI service fails
     */
    getFallbackResponse(responseType) {
        const fallbacks = {
            [interfaces_1.ResponseType.EMPATHETIC_SUPPORT]: "I can hear that this is important to you. I'm here to listen and support you through this.",
            [interfaces_1.ResponseType.FOLLOW_UP_QUESTION]: "Can you tell me more about what that's like for you?",
            [interfaces_1.ResponseType.TOPIC_GUIDANCE]: "Would you like to explore something different that's been on your mind?",
            [interfaces_1.ResponseType.CRISIS_RESPONSE]: "I'm concerned about you. Please consider reaching out to a crisis helpline at 988 for immediate support.",
            [interfaces_1.ResponseType.CLARIFICATION_REQUEST]: "I want to make sure I understand you correctly. Could you tell me a bit more?",
            [interfaces_1.ResponseType.GENERAL_CONVERSATION]: "I'm listening. Please, tell me more."
        };
        return fallbacks[responseType] || "I'm here with you. What would you like to talk about?";
    }
    /**
     * Validate emotional state analysis results
     */
    validateEmotionalState(state) {
        return {
            valence: Math.max(-1, Math.min(1, state.valence || 0)),
            arousal: Math.max(0, Math.min(1, state.arousal || 0.5)),
            dominant_emotion: state.dominant_emotion || 'neutral',
            confidence: Math.max(0, Math.min(1, state.confidence || 0.5))
        };
    }
    /**
     * Enhanced sentiment analysis with therapeutic context
     */
    enhancedSentimentAnalysis(message) {
        const lowerMessage = message.toLowerCase();
        let valence = 0;
        let arousal = 0.3;
        let dominantEmotion = 'neutral';
        let confidence = 0.7;
        // Crisis indicators (highest priority)
        const crisisKeywords = [
            'suicide', 'kill myself', 'end it all', 'not worth living', 'hurt myself',
            'self harm', 'overdose', 'jump off', 'can\'t go on', 'want to die',
            'ending my life', 'end my life', 'take my life', 'harm myself'
        ];
        if (crisisKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return {
                valence: -0.9,
                arousal: 0.9,
                dominant_emotion: 'crisis',
                confidence: 0.95
            };
        }
        // Medical emergency indicators
        const medicalKeywords = [
            'chest pain', 'can\'t breathe', 'cannot breathe', 'heart attack', 'stroke', 'bleeding',
            'unconscious', 'emergency', 'call 911', 'ambulance'
        ];
        if (medicalKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return {
                valence: -0.8,
                arousal: 0.9,
                dominant_emotion: 'crisis',
                confidence: 0.9
            };
        }
        // Emotional keywords with weights
        const emotionKeywords = {
            // Positive emotions
            joy: ['happy', 'joy', 'joyful', 'delighted', 'elated', 'cheerful'],
            gratitude: ['grateful', 'thankful', 'blessed', 'appreciate', 'thank you'],
            excitement: ['excited', 'thrilled', 'amazing', 'wonderful', 'fantastic'],
            hope: ['hope', 'hopeful', 'optimistic', 'looking forward', 'better tomorrow'],
            // Negative emotions
            sadness: ['sad', 'depressed', 'down', 'blue', 'melancholy', 'heartbroken'],
            anxiety: ['anxious', 'worried', 'nervous', 'stressed', 'panic', 'overwhelmed'],
            anger: ['angry', 'mad', 'furious', 'irritated', 'frustrated', 'rage'],
            fear: ['scared', 'afraid', 'terrified', 'frightened', 'fearful'],
            loneliness: ['lonely', 'alone', 'isolated', 'disconnected', 'abandoned'],
            // Distress indicators
            distress: ['overwhelmed', 'can\'t cope', 'breaking down', 'falling apart', 'desperate'],
            despair: ['hopeless', 'pointless', 'meaningless', 'worthless', 'useless']
        };
        // Analyze emotional content
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            const matchCount = keywords.filter(keyword => lowerMessage.includes(keyword)).length;
            if (matchCount > 0) {
                dominantEmotion = emotion;
                confidence = Math.min(0.9, 0.6 + (matchCount * 0.1));
                // Set valence and arousal based on emotion
                switch (emotion) {
                    case 'joy':
                    case 'gratitude':
                    case 'hope':
                        valence += 0.6 + (matchCount * 0.1);
                        arousal += 0.3;
                        break;
                    case 'excitement':
                        valence += 0.5;
                        arousal += 0.6;
                        break;
                    case 'sadness':
                    case 'loneliness':
                        valence -= 0.6;
                        arousal += 0.2;
                        break;
                    case 'anxiety':
                    case 'fear':
                        valence -= 0.4;
                        arousal += 0.7;
                        break;
                    case 'anger':
                        valence -= 0.5;
                        arousal += 0.8;
                        break;
                    case 'distress':
                    case 'despair':
                        valence -= 0.8;
                        arousal += 0.6;
                        break;
                }
                break; // Use first match as dominant
            }
        }
        // Intensity modifiers
        const intensityModifiers = ['very', 'extremely', 'really', 'so', 'incredibly', 'totally'];
        const hasIntensifier = intensityModifiers.some(modifier => lowerMessage.includes(modifier));
        if (hasIntensifier) {
            arousal += 0.2;
            valence = valence > 0 ? valence + 0.1 : valence - 0.1;
        }
        // Question patterns (often indicate seeking support)
        if (lowerMessage.includes('?') || lowerMessage.startsWith('how') || lowerMessage.startsWith('what') || lowerMessage.startsWith('why')) {
            arousal += 0.1;
        }
        return {
            valence: Math.max(-1, Math.min(1, valence)),
            arousal: Math.max(0, Math.min(1, arousal)),
            dominant_emotion: dominantEmotion,
            confidence: confidence
        };
    }
    /**
     * Build system prompt based on response type (legacy method for compatibility)
     */
    buildSystemPrompt(responseType) {
        return this.buildTherapeuticSystemPrompt(responseType, { valence: 0, arousal: 0.5, dominant_emotion: 'neutral', confidence: 0.5 });
    }
    /**
     * Basic sentiment analysis fallback (legacy method)
     */
    basicSentimentAnalysis(message) {
        // Use enhanced analysis as fallback
        return this.enhancedSentimentAnalysis(message);
    }
}
exports.OpenAIService = OpenAIService;
/**
 * Factory function to create OpenAI service with secure configuration
 */
function createOpenAIService(apiKey, options) {
    if (!apiKey || apiKey.trim() === '') {
        throw new Error('OpenAI API key is required');
    }
    const config = {
        apiKey: apiKey.trim(),
        model: options?.model || 'gpt-5',
        maxTokens: options?.maxTokens || 150,
        temperature: options?.temperature || 0.7,
        baseUrl: options?.baseUrl || 'https://api.openai.com/v1',
        timeout: options?.timeout || 10000
    };
    const therapeuticConfig = {
        empathyLevel: options?.empathyLevel || 'high',
        emotionalAdaptation: options?.emotionalAdaptation !== false,
        contextWindow: 6
    };
    return new OpenAIService(config, therapeuticConfig);
}
/**
 * Validate API key format (basic validation)
 */
function validateOpenAIApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
        return false;
    }
    const trimmedKey = apiKey.trim();
    // OpenAI API keys start with 'sk-' and are typically 51 characters long
    return trimmedKey.startsWith('sk-') && trimmedKey.length >= 20;
}
//# sourceMappingURL=ai-service.js.map