import { CrisisDetector, CrisisAnalysis, CrisisKeywords } from './interfaces';
/**
 * Advanced crisis detection system with keyword analysis, sentiment analysis,
 * and pattern recognition for mental health support
 */
export declare class AdvancedCrisisDetector implements CrisisDetector {
    private keywords;
    private sensitivity;
    private distressPatterns;
    constructor(keywords?: CrisisKeywords);
    /**
     * Analyze text for crisis indicators using multiple detection methods
     */
    analyzeCrisis(text: string, conversationHistory?: string[]): Promise<CrisisAnalysis>;
    /**
     * Update crisis detection keywords
     */
    updateKeywords(keywords: CrisisKeywords): void;
    /**
     * Set detection sensitivity level
     */
    setSensitivity(level: number): void;
    /**
     * Perform keyword-based crisis analysis
     */
    private performKeywordAnalysis;
    /**
     * Perform sentiment analysis to detect emotional distress
     */
    private performSentimentAnalysis;
    /**
     * Analyze patterns of repeated distress
     */
    private analyzeDistressPatterns;
    /**
     * Combine all analysis results into final crisis assessment
     */
    private combineAnalyses;
    /**
     * Update distress patterns for pattern recognition
     */
    private updateDistressPatterns;
    /**
     * Check if text contains keyword with context awareness
     */
    private containsKeyword;
    /**
     * Get weight for keyword based on severity
     */
    private getKeywordWeight;
    /**
     * Extract distress themes from text
     */
    private extractDistressThemes;
    /**
     * Calculate simple distress score for pattern analysis
     */
    private calculateSimpleDistressScore;
    /**
     * Check if distress scores show escalating pattern
     */
    private isEscalatingPattern;
    /**
     * Generate recommended action based on crisis type and urgency
     */
    private generateRecommendedAction;
    /**
     * Get default crisis detection keywords
     */
    private getDefaultKeywords;
}
//# sourceMappingURL=crisis-detector.d.ts.map