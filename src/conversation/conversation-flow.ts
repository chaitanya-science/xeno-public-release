import { ConversationFlow, ResponseType } from './interfaces';
import { ConversationSession, Message, Speaker } from '../types';
import { AdvancedCrisisDetector, CrisisType } from '../crisis';

/**
 * Controls conversation flow with empathetic response routing
 * and topic guidance to prevent repetitive discussions
 */
export class ConversationFlowController implements ConversationFlow {
  private readonly REPETITIVE_THRESHOLD = 5; // Number of similar exchanges before guidance
  private crisisDetector: AdvancedCrisisDetector;
  private readonly DISTRESS_KEYWORDS = [
    'depressed', 'anxious', 'panic', 'scared', 'hopeless', 'overwhelmed',
    'crying', 'can\'t cope', 'falling apart', 'breaking down'
  ];

  constructor(crisisDetector?: AdvancedCrisisDetector) {
    this.crisisDetector = crisisDetector || new AdvancedCrisisDetector();
  }

  /**
   * Determine the appropriate response type based on message content and context
   */
  determineResponseType(message: string, context: ConversationSession): ResponseType {
    const lowerMessage = message.toLowerCase();

    // Use advanced crisis detection system (highest priority)
    try {
      const conversationHistory = context.conversation_history
        .filter(msg => msg.speaker === Speaker.USER)
        .map(msg => msg.content);
      
      // For now, use synchronous crisis detection until async is fully supported
      if (this.containsBasicCrisisKeywords(lowerMessage)) {
        return ResponseType.CRISIS_RESPONSE;
      }
    } catch (error) {
      console.error('Crisis detection failed, falling back to keyword detection:', error);
      // Fall back to basic keyword detection
      if (this.containsBasicCrisisKeywords(lowerMessage)) {
        return ResponseType.CRISIS_RESPONSE;
      }
    }

    // Check if topic guidance is needed
    if (this.shouldGuideTopic(context.conversation_history)) {
      return ResponseType.TOPIC_GUIDANCE;
    }

    // Check for distress requiring empathetic support
    if (this.containsDistressKeywords(lowerMessage) || this.detectEmotionalDistress(context)) {
      return ResponseType.EMPATHETIC_SUPPORT;
    }

    // Check if message is unclear or very short
    if (this.isUnclearMessage(message)) {
      return ResponseType.CLARIFICATION_REQUEST;
    }

    // Determine if a follow-up question would be appropriate
    if (this.shouldAskFollowUp(message, context)) {
      return ResponseType.FOLLOW_UP_QUESTION;
    }

    // Default to general conversation
    return ResponseType.GENERAL_CONVERSATION;
  }

  /**
   * Check if topic guidance is needed to prevent repetitive discussions
   */
  shouldGuideTopic(conversationHistory: Message[]): boolean {
    if (conversationHistory.length < 6) {
      return false; // Need some conversation before guiding
    }

    // Get recent messages (last 10)
    const recentMessages = conversationHistory.slice(-10);
    const userMessages = recentMessages.filter(msg => msg.speaker === Speaker.USER);

    if (userMessages.length < 3) {
      return false;
    }

    // Check for repetitive patterns
    const topics = userMessages.map(msg => this.extractTopic(msg.content));
    const topicCounts = this.countTopics(topics);

    // If any topic appears more than threshold times, suggest guidance
    return Object.values(topicCounts).some(count => count >= this.REPETITIVE_THRESHOLD);
  }

  /**
   * Generate a topic suggestion to guide conversation in new directions
   */
  generateTopicSuggestion(context: ConversationSession): string {
    const suggestions = [
      "I've noticed we've been focusing on this topic for a while. Would you like to talk about something that brought you joy recently?",
      "Sometimes it helps to shift our perspective. Is there something you're looking forward to?",
      "I'm wondering if there's another part of your day or week you'd like to share with me?",
      "Would you like to explore a different topic? Perhaps something that's been on your mind lately?",
      "I sense this is important to you. Would it help to talk about how you're taking care of yourself through this?"
    ];

    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  /**
   * Basic crisis keyword detection as fallback
   */
  private containsBasicCrisisKeywords(message: string): boolean {
    const basicCrisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'not worth living', 'hurt myself',
      'self harm', 'overdose', 'jump off', 'can\'t go on', 'want to die',
      'ending my life', 'end my life', 'take my life', 'harm myself',
      'chest pain', 'can\'t breathe', 'heart attack', 'stroke', 'bleeding',
      'unconscious', 'emergency', 'call 911', 'ambulance'
    ];
    return basicCrisisKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Get crisis detector for external access
   */
  getCrisisDetector(): AdvancedCrisisDetector {
    return this.crisisDetector;
  }

  /**
   * Check if message contains distress-related keywords
   */
  private containsDistressKeywords(message: string): boolean {
    return this.DISTRESS_KEYWORDS.some(keyword => message.includes(keyword));
  }

  /**
   * Detect emotional distress from conversation context
   */
  private detectEmotionalDistress(context: ConversationSession): boolean {
    const emotionalState = context.emotional_context;
    
    // High arousal with negative valence indicates distress
    return emotionalState.arousal > 0.7 && emotionalState.valence < -0.5;
  }

  /**
   * Check if message is unclear and needs clarification
   */
  private isUnclearMessage(message: string): boolean {
    const trimmed = message.trim();
    
    // Very short messages might need clarification
    if (trimmed.length < 3) {
      return true;
    }

    // Check for multi-word filler phrases first
    const lowerMessage = trimmed.toLowerCase();
    if (lowerMessage === 'you know' || lowerMessage.includes('you know')) {
      // Remove "you know" and check remaining words
      const withoutYouKnow = lowerMessage.replace(/you know/g, '').trim();
      if (withoutYouKnow.length === 0) {
        return true;
      }
    }

    // Messages with only filler words
    const fillerWords = ['um', 'uh', 'hmm', 'well', 'like'];
    const words = trimmed.toLowerCase().split(/\s+/);
    const meaningfulWords = words.filter(word => !fillerWords.includes(word) && word !== 'you' && word !== 'know');
    
    return meaningfulWords.length === 0;
  }

  /**
   * Determine if a follow-up question would be appropriate
   */
  private shouldAskFollowUp(message: string, context: ConversationSession): boolean {
    // Don't ask follow-up if user just asked a question
    if (message.includes('?')) {
      return false;
    }

    // Ask follow-up for statements that could be explored deeper
    const followUpTriggers = [
      'feel', 'think', 'remember', 'worry', 'hope', 'wish', 'dream',
      'happened', 'experience', 'situation', 'problem', 'challenge'
    ];

    const lowerMessage = message.toLowerCase();
    return followUpTriggers.some(trigger => lowerMessage.includes(trigger));
  }

  /**
   * Extract main topic from a message for repetition detection
   */
  private extractTopic(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Simple topic extraction based on key nouns and themes
    const topicKeywords = {
      'family': ['family', 'mother', 'father', 'sister', 'brother', 'children', 'kids'],
      'health': ['health', 'doctor', 'medicine', 'pain', 'sick', 'hospital'],
      'work': ['work', 'job', 'career', 'boss', 'colleague', 'office'],
      'relationships': ['friend', 'relationship', 'partner', 'spouse', 'dating'],
      'emotions': ['sad', 'happy', 'angry', 'frustrated', 'excited', 'worried'],
      'daily_life': ['home', 'house', 'cooking', 'shopping', 'routine'],
      'past': ['remember', 'used to', 'before', 'when I was', 'back then'],
      'future': ['plan', 'hope', 'will', 'going to', 'want to', 'dream']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return topic;
      }
    }

    return 'general'; // Default topic
  }

  /**
   * Count occurrences of each topic
   */
  private countTopics(topics: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const topic of topics) {
      counts[topic] = (counts[topic] || 0) + 1;
    }
    
    return counts;
  }
}