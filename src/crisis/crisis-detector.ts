import { CrisisDetector, CrisisAnalysis, CrisisType, CrisisKeywords } from './interfaces';

/**
 * Advanced crisis detection system with keyword analysis, sentiment analysis,
 * and pattern recognition for mental health support
 */
export class AdvancedCrisisDetector implements CrisisDetector {
  private keywords: CrisisKeywords;
  private sensitivity: number = 0.7; // 0-1 scale, higher = more sensitive
  private distressPatterns: Map<string, DistressPattern> = new Map();

  constructor(keywords?: CrisisKeywords) {
    this.keywords = keywords || this.getDefaultKeywords();
  }

  /**
   * Analyze text for crisis indicators using multiple detection methods
   */
  async analyzeCrisis(text: string, conversationHistory?: string[]): Promise<CrisisAnalysis> {
    const normalizedText = text.toLowerCase().trim();
    
    // Perform multiple analysis methods
    const keywordAnalysis = this.performKeywordAnalysis(normalizedText);
    const sentimentAnalysis = await this.performSentimentAnalysis(normalizedText);
    const patternAnalysis = this.analyzeDistressPatterns(normalizedText, conversationHistory);
    
    // Combine analyses to determine crisis type and confidence
    const combinedAnalysis = this.combineAnalyses(keywordAnalysis, sentimentAnalysis, patternAnalysis);
    
    // Update distress patterns for future analysis
    this.updateDistressPatterns(normalizedText, combinedAnalysis);
    
    return combinedAnalysis;
  }

  /**
   * Update crisis detection keywords
   */
  updateKeywords(keywords: CrisisKeywords): void {
    this.keywords = { ...keywords };
  }

  /**
   * Set detection sensitivity level
   */
  setSensitivity(level: number): void {
    this.sensitivity = Math.max(0, Math.min(1, level));
  }

  /**
   * Perform keyword-based crisis analysis
   */
  private performKeywordAnalysis(text: string): KeywordAnalysisResult {
    const results: KeywordAnalysisResult = {
      selfHarmScore: 0,
      medicalEmergencyScore: 0,
      severeDistressScore: 0,
      matchedKeywords: []
    };

    // Check self-harm keywords
    for (const keyword of this.keywords.selfHarm) {
      if (this.containsKeyword(text, keyword)) {
        results.selfHarmScore += this.getKeywordWeight(keyword);
        results.matchedKeywords.push(keyword);
      }
    }

    // Check medical emergency keywords
    for (const keyword of this.keywords.medicalEmergency) {
      if (this.containsKeyword(text, keyword)) {
        results.medicalEmergencyScore += this.getKeywordWeight(keyword);
        results.matchedKeywords.push(keyword);
      }
    }

    // Check severe distress keywords
    for (const keyword of this.keywords.severeDistress) {
      if (this.containsKeyword(text, keyword)) {
        results.severeDistressScore += this.getKeywordWeight(keyword);
        results.matchedKeywords.push(keyword);
      }
    }

    return results;
  }

  /**
   * Perform sentiment analysis to detect emotional distress
   */
  private async performSentimentAnalysis(text: string): Promise<SentimentAnalysisResult> {
    // Simple rule-based sentiment analysis
    // In a production system, this would use a proper NLP library
    
    const negativeWords = [
      'hopeless', 'worthless', 'useless', 'terrible', 'awful', 'horrible',
      'desperate', 'overwhelmed', 'exhausted', 'broken', 'empty', 'numb',
      'trapped', 'suffocating', 'drowning', 'lost', 'alone', 'isolated'
    ];

    const intensifiers = ['very', 'extremely', 'completely', 'totally', 'absolutely'];
    const negations = ['not', 'never', 'no', "don't", "can't", "won't"];

    let sentimentScore = 0;
    let intensity = 1;
    let hasNegation = false;

    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Check for intensifiers
      if (intensifiers.includes(word)) {
        intensity = 1.5;
        continue;
      }
      
      // Check for negations
      if (negations.includes(word)) {
        hasNegation = true;
        continue;
      }
      
      // Check for negative sentiment words
      if (negativeWords.includes(word)) {
        const score = hasNegation ? -0.5 : -1.0;
        sentimentScore += score * intensity;
      }
      
      // Reset modifiers after processing a word
      if (!intensifiers.includes(word) && !negations.includes(word)) {
        intensity = 1;
        hasNegation = false;
      }
    }

    return {
      sentimentScore: Math.max(-5, Math.min(0, sentimentScore)), // Clamp to -5 to 0
      emotionalIntensity: Math.abs(sentimentScore) / words.length,
      negativeIndicators: words.filter(word => negativeWords.includes(word))
    };
  }

  /**
   * Analyze patterns of repeated distress
   */
  private analyzeDistressPatterns(text: string, conversationHistory?: string[]): PatternAnalysisResult {
    if (!conversationHistory || conversationHistory.length === 0) {
      return { patternScore: 0, patternType: 'none' };
    }

    // Look for repeated themes of distress
    const recentHistory = conversationHistory.slice(-10); // Last 10 messages
    const distressThemes = this.extractDistressThemes(text);
    
    let patternScore = 0;
    let patternType = 'none';

    // Check for repeated distress themes
    for (const theme of distressThemes) {
      const occurrences = recentHistory.filter(msg => 
        msg.toLowerCase().includes(theme)
      ).length;
      
      if (occurrences >= 3) {
        patternScore += 0.3;
        patternType = 'repeated_distress';
      }
    }

    // Check for escalating distress
    const recentDistressScores = recentHistory.map(msg => 
      this.calculateSimpleDistressScore(msg)
    );
    
    if (this.isEscalatingPattern(recentDistressScores)) {
      patternScore += 0.4;
      patternType = 'escalating_distress';
    }

    return { patternScore, patternType };
  }

  /**
   * Combine all analysis results into final crisis assessment
   */
  private combineAnalyses(
    keywordAnalysis: KeywordAnalysisResult,
    sentimentAnalysis: SentimentAnalysisResult,
    patternAnalysis: PatternAnalysisResult
  ): CrisisAnalysis {
    // Determine crisis type based on highest scoring category
    let crisisType = CrisisType.NONE;
    let confidence = 0;
    let urgency = 0;

    const selfHarmThreshold = 0.1 * this.sensitivity;
    const medicalThreshold = 0.1 * this.sensitivity;
    const distressThreshold = 0.1 * this.sensitivity;

    // Self-harm detection (highest priority)
    if (keywordAnalysis.selfHarmScore > selfHarmThreshold) {
      crisisType = CrisisType.SELF_HARM;
      confidence = Math.min(0.9, keywordAnalysis.selfHarmScore + 
        (sentimentAnalysis.emotionalIntensity * 0.3) +
        (patternAnalysis.patternScore * 0.2));
      urgency = 9; // Very high urgency
    }
    // Medical emergency detection
    else if (keywordAnalysis.medicalEmergencyScore > medicalThreshold) {
      crisisType = CrisisType.MEDICAL_EMERGENCY;
      confidence = Math.min(0.9, keywordAnalysis.medicalEmergencyScore + 
        (sentimentAnalysis.emotionalIntensity * 0.2));
      urgency = 10; // Maximum urgency
    }
    // Severe distress detection
    else if (
      keywordAnalysis.severeDistressScore > distressThreshold ||
      sentimentAnalysis.sentimentScore < -2.0 ||
      patternAnalysis.patternScore > 0.3
    ) {
      crisisType = CrisisType.SEVERE_DISTRESS;
      confidence = Math.min(0.8, 
        (keywordAnalysis.severeDistressScore * 0.4) +
        (Math.abs(sentimentAnalysis.sentimentScore) * 0.1) +
        (patternAnalysis.patternScore * 0.4) +
        (sentimentAnalysis.emotionalIntensity * 0.1));
      urgency = Math.min(8, Math.floor(confidence * 10));
    }

    const recommendedAction = this.generateRecommendedAction(crisisType, urgency);

    return {
      crisisType,
      confidence,
      urgency,
      keywords: keywordAnalysis.matchedKeywords,
      recommendedAction
    };
  }

  /**
   * Update distress patterns for pattern recognition
   */
  private updateDistressPatterns(text: string, analysis: CrisisAnalysis): void {
    if (analysis.crisisType !== CrisisType.NONE) {
      const userId = 'current_user'; // In real implementation, this would be passed in
      const existing = this.distressPatterns.get(userId) || {
        occurrences: [] as DistressOccurrence[],
        themes: new Map()
      };

      existing.occurrences.push({
        timestamp: new Date(),
        crisisType: analysis.crisisType,
        confidence: analysis.confidence,
        text: text.substring(0, 100) // Store first 100 chars for pattern analysis
      });

      // Keep only recent occurrences (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      existing.occurrences = existing.occurrences.filter(
        occ => occ.timestamp > thirtyDaysAgo
      );

      this.distressPatterns.set(userId, existing);
    }
  }

  /**
   * Check if text contains keyword with context awareness
   */
  private containsKeyword(text: string, keyword: string): boolean {
    // Handle multi-word phrases
    if (keyword.includes(' ')) {
      return text.toLowerCase().includes(keyword.toLowerCase());
    }
    
    // Simple word boundary matching for single words
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
    return regex.test(text);
  }

  /**
   * Get weight for keyword based on severity
   */
  private getKeywordWeight(keyword: string): number {
    // High-severity keywords
    const highSeverity = [
      'kill myself', 'end it all', 'suicide', 'self-harm', 'hurt myself',
      'heart attack', 'can\'t breathe', 'chest pain', 'overdose'
    ];
    
    // Medium-severity keywords
    const mediumSeverity = [
      'hopeless', 'worthless', 'give up', 'no point', 'emergency',
      'help me', 'dying', 'pain'
    ];

    if (highSeverity.includes(keyword.toLowerCase())) {
      return 1.0;
    } else if (mediumSeverity.includes(keyword.toLowerCase())) {
      return 0.6;
    } else {
      return 0.3;
    }
  }

  /**
   * Extract distress themes from text
   */
  private extractDistressThemes(text: string): string[] {
    const themes = [];
    const themeKeywords = {
      'loneliness': ['alone', 'lonely', 'isolated', 'nobody'],
      'hopelessness': ['hopeless', 'no point', 'give up', 'useless'],
      'physical_pain': ['pain', 'hurt', 'ache', 'sick'],
      'anxiety': ['anxious', 'worried', 'scared', 'panic'],
      'depression': ['sad', 'depressed', 'empty', 'numb']
    };

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        themes.push(theme);
      }
    }

    return themes;
  }

  /**
   * Calculate simple distress score for pattern analysis
   */
  private calculateSimpleDistressScore(text: string): number {
    const distressWords = [
      'sad', 'depressed', 'anxious', 'worried', 'scared', 'hopeless',
      'alone', 'tired', 'overwhelmed', 'stressed', 'pain', 'hurt'
    ];

    const words = text.toLowerCase().split(/\s+/);
    const distressCount = words.filter(word => distressWords.includes(word)).length;
    
    return distressCount / words.length;
  }

  /**
   * Check if distress scores show escalating pattern
   */
  private isEscalatingPattern(scores: number[]): boolean {
    if (scores.length < 3) return false;
    
    const recent = scores.slice(-3);
    return recent[0] < recent[1] && recent[1] < recent[2] && recent[2] > 0.2;
  }

  /**
   * Generate recommended action based on crisis type and urgency
   */
  private generateRecommendedAction(crisisType: CrisisType, urgency: number): string {
    switch (crisisType) {
      case CrisisType.SELF_HARM:
        return 'immediate_crisis_resources';
      case CrisisType.MEDICAL_EMERGENCY:
        return 'emergency_services';
      case CrisisType.SEVERE_DISTRESS:
        return urgency > 6 ? 'mental_health_resources' : 'supportive_conversation';
      default:
        return 'continue_conversation';
    }
  }

  /**
   * Get default crisis detection keywords
   */
  private getDefaultKeywords(): CrisisKeywords {
    return {
      selfHarm: [
        'kill myself', 'end it all', 'ending it all', 'suicide', 'self-harm', 'hurt myself',
        'cut myself', 'end my life', 'ending my life', 'not worth living', 'better off dead',
        'want to die', 'take my own life', 'harm myself', 'end the pain'
      ],
      medicalEmergency: [
        'heart attack', 'can\'t breathe', 'cannot breathe', 'chest pain', 'overdose',
        'poisoned', 'bleeding heavily', 'unconscious', 'stroke', 'seizure',
        'emergency', 'ambulance', 'hospital', 'call 911'
      ],
      severeDistress: [
        'hopeless', 'worthless', 'useless', 'give up', 'no point',
        'overwhelmed', 'can\'t cope', 'breaking down', 'falling apart',
        'desperate', 'trapped', 'suffocating', 'drowning', 'lost',
        'alone', 'isolated', 'abandoned', 'empty', 'numb', 'broken'
      ]
    };
  }
}

// Supporting interfaces for internal analysis
interface KeywordAnalysisResult {
  selfHarmScore: number;
  medicalEmergencyScore: number;
  severeDistressScore: number;
  matchedKeywords: string[];
}

interface SentimentAnalysisResult {
  sentimentScore: number; // -5 to 0 (negative sentiment)
  emotionalIntensity: number; // 0 to 1
  negativeIndicators: string[];
}

interface PatternAnalysisResult {
  patternScore: number; // 0 to 1
  patternType: string;
}

interface DistressPattern {
  occurrences: DistressOccurrence[];
  themes: Map<string, number>;
}

interface DistressOccurrence {
  timestamp: Date;
  crisisType: CrisisType;
  confidence: number;
  text: string;
}