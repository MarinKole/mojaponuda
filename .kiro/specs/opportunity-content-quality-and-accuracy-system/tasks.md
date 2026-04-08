# Implementation Plan: Opportunity Content Quality and Accuracy System

## Overview

Implementacija sistema za poboljšanje kvaliteta i tačnosti sadržaja prilika kroz validaciju izvora, kontekstualni AI sadržaj, urgency signale, SEO optimizaciju i decision support module. Sistem se integriše sa postojećim post-sync pipeline-om i dodaje nove komponente za validaciju, analizu i prezentaciju sadržaja.

## Tasks

- [ ] 1. Database schema extensions and migrations
  - Create migration file for new columns on opportunities table (source_validated, source_validation_error, source_validated_at, ai_content, historical_context, decision_support, content_quality_score)
  - Create source_validation_log table with indexes
  - Create indexes for filtering (deadline_soon, high_value)
  - Add RLS policies for new tables
  - _Requirements: 1.1, 1.2, 1.4, 9.1_

- [ ] 2. Source Validator implementation
  - [ ] 2.1 Create SourceValidator class with URL validation logic
    - Implement validateSourceUrl method with fetch, timeout, and domain checking
    - Implement batchValidate method with rate limiting (5 req/s)
    - Add redirect chain tracking (max 3 redirects)
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ]* 2.2 Write property test for Source URL Validation Correctness
    - **Property 1: Source URL Validation Correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  
  - [ ] 2.3 Integrate SourceValidator into post-sync pipeline
    - Add validation step after quality filter, before AI review
    - Log validation failures to source_validation_log table
    - Update opportunity record with validation status
    - _Requirements: 1.4, 1.5_
  
  - [ ]* 2.4 Write unit tests for SourceValidator edge cases
    - Test 404, 500, timeout, redirect scenarios
    - Test domain mismatch detection
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 3. Historical Context calculation
  - [ ] 3.1 Create HistoricalContextCalculator class
    - Implement query for similar opportunities (same category, last 12 months)
    - Implement query for issuer opportunities (last 24 months)
    - Calculate category trend (increasing/stable/decreasing)
    - Detect typical frequency patterns
    - _Requirements: 2.1, 2.2, 2.3, 10.1, 10.4, 10.5_
  
  - [ ]* 3.2 Write property test for Historical Context Inclusion
    - **Property 4: Historical Context Inclusion**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  
  - [ ]* 3.3 Write unit tests for trend detection
    - Test increasing/stable/decreasing trend calculation
    - Test frequency pattern detection
    - _Requirements: 2.2, 10.4_

- [ ] 4. Enhanced AI Content Generator
  - [ ] 4.1 Extend AIContentGenerator with historical context integration
    - Modify OpenAI prompt to include historical data
    - Add eligibility_signals to prompt context
    - Implement generic phrase blacklist filtering
    - Structure content with required headings
    - _Requirements: 2.1, 2.4, 2.6, 5.6_
  
  - [ ]* 4.2 Write property test for Generic Phrase Avoidance
    - **Property 5: Generic Phrase Avoidance**
    - **Validates: Requirements 2.4**
  
  - [ ]* 4.3 Write property test for First Paragraph Data Completeness
    - **Property 6: First Paragraph Data Completeness**
    - **Validates: Requirements 2.5**
  
  - [ ]* 4.4 Write property test for Eligibility Signals Integration
    - **Property 7: Eligibility Signals Integration**
    - **Validates: Requirements 2.6**
  
  - [ ] 4.5 Implement error handling and retry logic
    - Add exponential backoff for API failures (1s, 2s, 4s)
    - Implement fallback to basic content on failure
    - Mark opportunities for regeneration
    - _Requirements: 2.1, 2.5_

- [ ] 5. SEO Optimizer implementation
  - [ ] 5.1 Create SEOOptimizer class
    - Implement generateSEOTitle method (format: "[Vrsta] za [ko] u [lokacija] (2026)")
    - Implement generateSEODescription method (140-155 chars, action-oriented)
    - Implement validateFirstParagraph method
    - Add keyword extraction and natural integration
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 5.2 Write property test for AI Content Contains Required SEO Elements
    - **Property 13: AI Content Contains Required SEO Elements**
    - **Validates: Requirements 5.1, 5.3, 5.6**
  
  - [ ]* 5.3 Write property test for SEO Title Format Compliance
    - **Property 14: SEO Title Format Compliance**
    - **Validates: Requirements 5.2**
  
  - [ ]* 5.4 Write property test for SEO Description Action-Oriented
    - **Property 15: SEO Description Action-Oriented**
    - **Validates: Requirements 5.4**
  
  - [ ]* 5.5 Write property test for SEO Length Constraints
    - **Property 16: SEO Length Constraints**
    - **Validates: Requirements 5.5**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Decision Support Analyzer implementation
  - [ ] 7.1 Create DecisionAnalyzer class
    - Implement analyzeCompetition method using historical data
    - Implement analyzeSuccessProbability method
    - Implement generateTypicalMistakes method based on difficulty
    - Generate recommendation with reasoning
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6_
  
  - [ ]* 7.2 Write property test for Decision Support Generation
    - **Property 21: Decision Support Generation**
    - **Validates: Requirements 7.1, 7.6**
  
  - [ ]* 7.3 Write property test for Competition Analysis Uses Historical Data
    - **Property 22: Competition Analysis Uses Historical Data**
    - **Validates: Requirements 7.2**
  
  - [ ]* 7.4 Write property test for Typical Mistakes Based on Difficulty
    - **Property 24: Typical Mistakes Based on Difficulty**
    - **Validates: Requirements 7.4**
  
  - [ ]* 7.5 Write property test for Success Probability Calculation
    - **Property 25: Success Probability Calculation**
    - **Validates: Requirements 7.5**

- [ ] 8. Urgency Layer components
  - [ ] 8.1 Create UrgencyBanner component
    - Implement calculateUrgency function with threshold logic
    - Define color schemes for critical/high/medium/expired states
    - Implement message formatting with day count
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 8.2 Write property test for Urgency Banner Display Logic
    - **Property 9: Urgency Banner Display Logic**
    - **Validates: Requirements 4.1**
  
  - [ ]* 8.3 Write property test for Urgency Styling Matches Deadline Threshold
    - **Property 10: Urgency Styling Matches Deadline Threshold**
    - **Validates: Requirements 4.2, 4.3, 4.5**
  
  - [ ]* 8.4 Write property test for Urgency Message Format
    - **Property 11: Urgency Message Format**
    - **Validates: Requirements 4.4**
  
  - [ ] 8.2 Add urgency badge to OpportunityCard component
    - Extend opportunity card data with urgency_badge field
    - Render badge in list views
    - _Requirements: 4.6_
  
  - [ ]* 8.5 Write property test for Urgency Badge in List Views
    - **Property 12: Urgency Badge in List Views**
    - **Validates: Requirements 4.6**

- [ ] 9. Enhanced CTA Component
  - [ ] 9.1 Create EnhancedCTA component
    - Implement generateCTAConfig function
    - Add outcome-focused text variations
    - Implement signup context tracking
    - Handle logged in/out states
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ]* 9.2 Write property test for CTA Configuration Matches Opportunity State
    - **Property 8: CTA Configuration Matches Opportunity State**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 10. Related Opportunities system
  - [ ] 10.1 Create RelatedOpportunitiesService
    - Implement relevance scoring (category + location + type match)
    - Query and rank 3-5 related opportunities
    - Generate similarity_reason for each match
    - Prioritize active opportunities with closer deadlines
    - Add category_link field
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ]* 10.2 Write property test for Related Opportunities Count and Ranking
    - **Property 17: Related Opportunities Count and Ranking**
    - **Validates: Requirements 6.1**
  
  - [ ]* 10.3 Write property test for Related Opportunities Metadata Completeness
    - **Property 18: Related Opportunities Metadata Completeness**
    - **Validates: Requirements 6.2, 6.3**
  
  - [ ]* 10.4 Write property test for Related Opportunities Prioritize Active
    - **Property 19: Related Opportunities Prioritize Active**
    - **Validates: Requirements 6.4, 6.5**
  
  - [ ] 10.2 Create RelatedOpportunitiesCard component
    - Display related opportunities with similarity reasons
    - Show key metadata (deadline, value, difficulty)
    - Add category link
    - _Requirements: 6.1, 6.2, 6.6_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Advanced Filter System
  - [ ] 12.1 Implement filter queries and logic
    - Create urgency filter (deadline ≤ 14 days)
    - Create high_value filter (top 25% percentile query)
    - Create difficulty filter (exact match)
    - Implement filter composition with AND logic
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 12.2 Write property test for Filters Return Only Matching Opportunities
    - **Property 26: Filters Return Only Matching Opportunities**
    - **Validates: Requirements 8.1, 8.2, 8.3**
  
  - [ ]* 12.3 Write property test for Filter Composition
    - **Property 27: Filter Composition**
    - **Validates: Requirements 8.4**
  
  - [ ] 12.2 Implement getFilterCounts function
    - Calculate counts for each filter option
    - Cache results for 5 minutes
    - _Requirements: 8.5_
  
  - [ ]* 12.4 Write property test for Filter Count Accuracy
    - **Property 28: Filter Count Accuracy**
    - **Validates: Requirements 8.5**
  
  - [ ] 12.3 Add filter UI components
    - Create filter controls with counts
    - Implement URL query parameter encoding/decoding
    - Add filter state persistence
    - _Requirements: 8.6_
  
  - [ ]* 12.5 Write property test for Filter State in URL
    - **Property 29: Filter State in URL**
    - **Validates: Requirements 8.6**

- [ ] 13. Content Quality Monitoring
  - [ ] 13.1 Implement quality score calculation
    - Create calculateQualityScore function (source_validated: 20pts, ai_content: 40pts, SEO: 40pts)
    - Update quality score on opportunity save
    - _Requirements: 9.1_
  
  - [ ]* 13.2 Write property test for Quality Score Calculation
    - **Property 30: Quality Score Calculation**
    - **Validates: Requirements 9.1**
  
  - [ ] 13.2 Create admin quality monitoring dashboard
    - Add low quality opportunities list (score < 70)
    - Display source validation errors
    - Show quality statistics (published, rejected, avg score)
    - Add quality trend chart
    - _Requirements: 9.2, 9.3, 9.4, 9.6_
  
  - [ ] 13.3 Implement manual override workflow
    - Add override button for rejected opportunities
    - Set manual_override flag on publish
    - Log override actions
    - _Requirements: 9.5_

- [ ] 14. Issuer Historical Context UI
  - [ ] 14.1 Create IssuerHistoryCard component
    - Display "Drugi pozivi od [issuer]" section
    - Show up to 3 previous calls with title, deadline, status
    - Detect and display frequency patterns
    - Add issuer filter link
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6_
  
  - [ ]* 14.2 Write property test for Issuer Historical Context Display
    - **Property 36: Issuer Historical Context Display**
    - **Validates: Requirements 10.1, 10.2, 10.3**
  
  - [ ]* 14.3 Write property test for Trend Detection and Messaging
    - **Property 37: Trend Detection and Messaging**
    - **Validates: Requirements 10.4**

- [ ] 15. Public Opportunity Page integration
  - [ ] 15.1 Update opportunity page layout
    - Add UrgencyBanner at top
    - Integrate EnhancedCTA component
    - Add DecisionSupportCard section
    - Add IssuerHistoryCard section
    - Add RelatedOpportunitiesCard section
    - _Requirements: 3.1, 4.1, 6.1, 7.1, 10.1_
  
  - [ ] 15.2 Update opportunity list pages
    - Add urgency badges to cards
    - Integrate advanced filters
    - Update card metadata display
    - _Requirements: 4.6, 8.1_

- [ ] 16. Post-Sync Pipeline integration
  - [ ] 16.1 Wire all components into pipeline
    - Add SourceValidator step after quality filter
    - Add HistoricalContextCalculator before AI generation
    - Update AIContentGenerator with SEOOptimizer
    - Add DecisionAnalyzer after AI generation
    - Calculate and save quality score
    - _Requirements: 1.1, 2.1, 5.1, 7.1, 9.1_
  
  - [ ] 16.2 Implement error handling and recovery
    - Add retry logic for transient failures
    - Implement fallback content generation
    - Add background regeneration jobs
    - _Requirements: 2.1, 5.1_
  
  - [ ]* 16.3 Write integration tests for complete pipeline
    - Test scrape → validate → generate → publish flow
    - Test error recovery at each stage
    - _Requirements: 1.1, 2.1, 5.1, 7.1, 9.1_

- [ ] 17. Admin source correction workflow
  - [ ] 17.1 Create admin UI for source validation errors
    - Display list of opportunities with validation errors
    - Add inline source_url edit field
    - Implement re-validation on save
    - _Requirements: 1.5, 1.6_
  
  - [ ]* 17.2 Write property test for Admin Source Correction Workflow
    - **Property 3: Admin Source Correction Workflow**
    - **Validates: Requirements 1.6**

- [ ] 18. Final checkpoint and integration verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify complete pipeline flow works end-to-end
  - Check all UI components render correctly
  - Validate database migrations applied successfully

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- System integrates with existing post-sync pipeline and extends opportunities table
- TypeScript is used throughout for type safety
