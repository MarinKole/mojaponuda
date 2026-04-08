# Design Document: Opportunity Content Quality and Accuracy System

## Overview

Sistem transformiše postojeći agregator prilika u decision tool koji pruža stvarnu vrijednost korisnicima kroz validaciju izvora, kontekstualni AI sadržaj, urgency signale, SEO optimizaciju i decision support module. Sistem se integriše sa postojećim post-sync pipeline-om i dodaje nove komponente za validaciju, analizu i prezentaciju sadržaja.

Ključne komponente:
- **Source Validator**: Validira tačnost source_url polja prije publikacije
- **Enhanced AI Generator**: Generiše kontekstualni sadržaj sa historijskim podacima i insights
- **Urgency Layer**: Vizualni sistem za naglašavanje bliskih rokova
- **Decision Support Module**: Analiza konkurencije, šansi i tipičnih grešaka
- **SEO Optimizer**: Osigurava optimizaciju za Google.ba pretraživanja
- **Advanced Filtering**: Filtriranje po hitnosti, iznosu i težini

## Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Public Opportunity Page                   │
│  (urgency banners, decision support, enhanced CTAs)         │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│              Presentation Layer Components                   │
│  - UrgencyBanner                                            │
│  - DecisionSupportCard                                      │
│  - EnhancedCTA                                              │
│  - HistoricalContext                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                  Data Processing Layer                       │
│  - SourceValidator (pre-publish validation)                 │
│  - EnhancedAIGenerator (contextual content)                 │
│  - DecisionAnalyzer (competition, success rate)             │
│  - SEOOptimizer (search-optimized titles/descriptions)      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                Post-Sync Pipeline Integration                │
│  1. Scrape → 2. Quality Filter → 3. Source Validate →      │
│  4. AI Review → 5. Enhanced AI Content → 6. Publish        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                    Database Layer                            │
│  - opportunities (extended with validation fields)           │
│  - source_validation_log (new table)                        │
│  - opportunity_analytics (enhanced)                         │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

1. **Post-Sync Pipeline**: Source validation dodaje se nakon quality filter, prije AI review
2. **AI Content Generator**: Proširuje se sa historijskim kontekstom i decision support
3. **Opportunity Page**: Dodaju se novi UI komponenti za urgency, decision support i enhanced CTAs
4. **Admin Dashboard**: Nova sekcija za monitoring kvaliteta i source validation errors

## Components and Interfaces

### 1. Source Validator

```typescript
interface SourceValidationResult {
  valid: boolean;
  status_code?: number;
  error?: string;
  domain_match: boolean;
  redirect_chain?: string[];
  validated_at: string;
}

interface SourceValidator {
  /**
   * Validates that source_url is accessible and matches expected domain
   * @param url - Source URL to validate
   * @param expectedDomain - Expected domain pattern (e.g., "fmrpo.gov.ba")
   * @returns Validation result with status and error details
   */
  validateSourceUrl(
    url: string,
    expectedDomain: string
  ): Promise<SourceValidationResult>;

  /**
   * Batch validates multiple URLs with rate limiting
   * @param items - Array of {url, expectedDomain, opportunityId}
   * @returns Map of opportunityId to validation result
   */
  batchValidate(
    items: Array<{ url: string; expectedDomain: string; opportunityId: string }>
  ): Promise<Map<string, SourceValidationResult>>;
}
```

**Implementation Notes**:
- Uses `fetch()` with timeout (5s) and follows redirects (max 3)
- Validates HTTP status 200-299 as success
- Checks domain match using URL parsing
- Logs failures to `source_validation_log` table
- Rate limits to 5 requests/second to avoid blocking

### 2. Enhanced AI Content Generator

```typescript
interface HistoricalContext {
  similar_calls_count: number; // Last 12 months
  issuer_calls_count: number; // From same issuer
  category_trend: "increasing" | "stable" | "decreasing";
  typical_frequency?: string; // e.g., "2-3 puta godišnje"
  last_similar_call?: {
    title: string;
    deadline: string;
    value: number;
  };
}

interface DecisionSupport {
  competition_level: "niska" | "srednja" | "visoka";
  success_probability: "niska" | "srednja" | "visoka";
  typical_mistakes: string[]; // Max 3
  recommendation: string; // "Da li vrijedi aplicirati?"
  reasoning: string;
}

interface EnhancedOpportunityContent extends OpportunityAiContent {
  historical_context: HistoricalContext;
  decision_support: DecisionSupport;
}

interface EnhancedAIGenerator {
  /**
   * Generates contextual AI content with historical data and decision support
   * @param opportunity - Base opportunity data
   * @param historicalData - Historical context from database
   * @returns Enhanced content with context and decision support
   */
  generateEnhancedContent(
    opportunity: OpportunityData,
    historicalData: HistoricalContext
  ): Promise<EnhancedOpportunityContent>;
}
```

**Implementation Notes**:
- Queries database for similar opportunities (same category, last 12 months)
- Queries opportunities from same issuer (last 24 months)
- Calculates trend based on month-over-month comparison
- Passes historical context to OpenAI prompt for contextual generation
- Generates decision support based on historical success rates

### 3. Urgency Layer Components

```typescript
interface UrgencyConfig {
  days_until_deadline: number;
  urgency_level: "critical" | "high" | "medium" | "none";
  color_scheme: {
    bg: string;
    border: string;
    text: string;
  };
  icon: "Clock" | "AlertTriangle" | "Ban";
  message: string;
}

interface UrgencyBanner {
  /**
   * Calculates urgency configuration based on deadline
   * @param deadline - Opportunity deadline
   * @returns Urgency configuration for UI rendering
   */
  calculateUrgency(deadline: string | null): UrgencyConfig;
}
```

**Urgency Thresholds**:
- **Critical** (≤ 1 day): Red background, "⚡ ROK ISTJEČE DANAS/SUTRA"
- **High** (≤ 3 days): Orange background, "⚡ ROK ZA PRIJAVU ZA X DANA"
- **Medium** (≤ 7 days): Amber background, "⏰ ROK ZA PRIJAVU ZA X DANA"
- **None** (> 7 days): No banner
- **Expired**: Red background with Ban icon, "ROK ZA PRIJAVU JE ISTEKAO"

### 4. Decision Support Analyzer

```typescript
interface CompetitionAnalysis {
  estimated_applicants: number;
  competition_level: "niska" | "srednja" | "visoka";
  reasoning: string;
}

interface SuccessAnalysis {
  success_probability: "niska" | "srednja" | "visoka";
  factors: string[]; // Positive and negative factors
}

interface DecisionAnalyzer {
  /**
   * Analyzes competition level based on historical data
   * @param opportunity - Opportunity data
   * @param historicalContext - Historical context
   * @returns Competition analysis
   */
  analyzeCompetition(
    opportunity: OpportunityData,
    historicalContext: HistoricalContext
  ): Promise<CompetitionAnalysis>;

  /**
   * Analyzes success probability based on eligibility and competition
   * @param opportunity - Opportunity data
   * @param competition - Competition analysis
   * @returns Success analysis
   */
  analyzeSuccessProbability(
    opportunity: OpportunityData,
    competition: CompetitionAnalysis
  ): Promise<SuccessAnalysis>;

  /**
   * Generates list of typical mistakes based on requirements complexity
   * @param requirements - Opportunity requirements
   * @param difficulty - AI difficulty rating
   * @returns List of typical mistakes (max 3)
   */
  generateTypicalMistakes(
    requirements: string | null,
    difficulty: "lako" | "srednje" | "tesko"
  ): string[];
}
```

**Implementation Notes**:
- Competition analysis uses historical data: similar calls count, category trend
- Success probability considers: eligibility match, competition level, value/effort ratio
- Typical mistakes generated by AI based on requirements complexity
- All analysis results cached in database for performance

### 5. SEO Optimizer

```typescript
interface SEOOptimizedContent {
  seo_title: string; // Max 65 chars, search-query format
  seo_description: string; // 140-155 chars, action-oriented
  first_paragraph: string; // Must include: type, location, target, year
  keywords: string[]; // Natural keywords for content
}

interface SEOOptimizer {
  /**
   * Generates SEO-optimized title in search query format
   * @param title - Original opportunity title
   * @param type - Opportunity type (poticaj/tender)
   * @param location - Location
   * @param target - Target audience
   * @returns SEO-optimized title (max 65 chars)
   */
  generateSEOTitle(
    title: string,
    type: string,
    location: string,
    target: string
  ): string;

  /**
   * Generates action-oriented meta description
   * @param opportunity - Opportunity data
   * @returns SEO description (140-155 chars)
   */
  generateSEODescription(opportunity: OpportunityData): string;

  /**
   * Validates first paragraph contains required SEO elements
   * @param paragraph - First paragraph of ai_content
   * @returns Validation result with missing elements
   */
  validateFirstParagraph(paragraph: string): {
    valid: boolean;
    missing: string[];
  };
}
```

**SEO Title Format**:
- Pattern: `[Vrsta] za [ko] u [lokacija] (2026)`
- Examples:
  - "Poticaji za mikro firme u Tuzlanskom kantonu (2026)"
  - "EU grant za izvoznike u FBiH (2026)"
  - "Subvencije za zapošljavanje Kanton Sarajevo (2026)"

**First Paragraph Requirements**:
- Must include: tip finansiranja (poticaj/grant/subvencija)
- Must include: lokacija (specific location or "BiH")
- Must include: ciljna skupina (firme/preduzetnici/MSP)
- Must include: godina (2026)

### 6. Enhanced CTA Component

```typescript
interface CTAConfig {
  primary_text: string;
  primary_action: "follow" | "signup" | "check_eligibility";
  secondary_text?: string;
  secondary_action?: "download_checklist" | "view_similar";
  outcome_message: string; // What user gets
  signup_context?: {
    ref: string;
    opportunity_id: string;
    category: string;
  };
}

interface EnhancedCTA {
  /**
   * Generates outcome-focused CTA configuration
   * @param opportunity - Opportunity data
   * @param userLoggedIn - Whether user is authenticated
   * @returns CTA configuration for rendering
   */
  generateCTAConfig(
    opportunity: OpportunityData,
    userLoggedIn: boolean
  ): CTAConfig;
}
```

**CTA Variations**:
- **Has deadline + not logged in**: "Automatski prati rok i dokumentaciju" → signup
- **Has deadline + logged in**: "Prati ovu priliku" → follow action
- **Complex requirements (tesko)**: "Dobij checklistu za prijavu" → signup with checklist
- **Expired**: "Pratite sljedeće slične prilike" → category page

### 7. Advanced Filter System

```typescript
interface FilterOptions {
  urgency?: "deadline_soon"; // ≤ 14 days
  value?: "high_value"; // Top 25% by value
  difficulty?: "lako" | "srednje" | "tesko";
  category?: string;
  location?: string;
}

interface FilterResult {
  opportunities: OpportunityData[];
  count: number;
  applied_filters: FilterOptions;
}

interface AdvancedFilter {
  /**
   * Applies multiple filters to opportunity list
   * @param filters - Filter options
   * @returns Filtered opportunities with count
   */
  applyFilters(filters: FilterOptions): Promise<FilterResult>;

  /**
   * Gets filter counts before applying (for UI display)
   * @param filters - Filter options
   * @returns Count for each filter option
   */
  getFilterCounts(filters: FilterOptions): Promise<Record<string, number>>;
}
```

**Filter Implementation**:
- **Urgency**: `deadline <= NOW() + INTERVAL '14 days'`
- **High Value**: `value >= (SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) FROM opportunities)`
- **Difficulty**: Direct match on `ai_difficulty` field
- **Category/Location**: Direct match with index support
- Filters combinable with AND logic
- Results cached for 5 minutes

## Data Models

### Extended Opportunities Table

```sql
-- Add new columns to existing opportunities table
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS source_validated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_validation_error TEXT,
  ADD COLUMN IF NOT EXISTS source_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_content TEXT, -- Long-form SEO article
  ADD COLUMN IF NOT EXISTS historical_context JSONB,
  ADD COLUMN IF NOT EXISTS decision_support JSONB,
  ADD COLUMN IF NOT EXISTS content_quality_score INTEGER DEFAULT 0;

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline_soon 
  ON opportunities(deadline) 
  WHERE deadline <= NOW() + INTERVAL '14 days' AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_opportunities_high_value 
  ON opportunities(value DESC) 
  WHERE value IS NOT NULL AND status = 'active';
```

### New Source Validation Log Table

```sql
CREATE TABLE IF NOT EXISTS source_validation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  expected_domain TEXT NOT NULL,
  status_code INTEGER,
  valid BOOLEAN NOT NULL,
  error TEXT,
  redirect_chain TEXT[],
  validated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_source_validation_opportunity 
  ON source_validation_log(opportunity_id);

CREATE INDEX idx_source_validation_invalid 
  ON source_validation_log(valid) 
  WHERE valid = false;
```

### Historical Context JSONB Structure

```typescript
interface HistoricalContextData {
  similar_calls_count: number;
  issuer_calls_count: number;
  category_trend: "increasing" | "stable" | "decreasing";
  typical_frequency?: string;
  last_similar_call?: {
    title: string;
    deadline: string;
    value: number;
  };
  calculated_at: string;
}
```

### Decision Support JSONB Structure

```typescript
interface DecisionSupportData {
  competition_level: "niska" | "srednja" | "visoka";
  estimated_applicants?: number;
  success_probability: "niska" | "srednja" | "visoka";
  typical_mistakes: string[];
  recommendation: string;
  reasoning: string;
  calculated_at: string;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Source URL Validation Correctness

*For any* scraped opportunity with a source_url and expected_domain, the Source_Validator should correctly identify whether the URL is accessible (HTTP 200-299), matches the expected domain, and mark invalid URLs for manual review.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Source Validation Error Logging

*For any* opportunity with an invalid source_url, the validation failure should be logged with complete details including opportunity_id, expected_domain, actual_url, status_code, and error message.

**Validates: Requirements 1.4**

### Property 3: Admin Source Correction Workflow

*For any* opportunity marked with source_validation_error, when an admin updates the source_url, the system should update the database, set source_validated=true, clear the error, and record the validation timestamp.

**Validates: Requirements 1.6**

### Property 4: Historical Context Inclusion

*For any* opportunity being processed, if similar opportunities exist in the database (same category, last 12 months), the generated content should include historical context with similar_calls_count, issuer_calls_count, and category_trend.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 5: Generic Phrase Avoidance

*For any* generated ai_content, the text should not contain generic marketing phrases from the blacklist ("odlična prilika", "ne propustite", "jedinstvena šansa") and should focus on concrete facts.

**Validates: Requirements 2.4**

### Property 6: First Paragraph Data Completeness

*For any* generated ai_content, the first paragraph should contain all required data points: tip finansiranja, lokacija, ciljna skupina, and specific numerical data (value or deadline) when available.

**Validates: Requirements 2.5**

### Property 7: Eligibility Signals Integration

*For any* opportunity with non-empty eligibility_signals array, the generated ai_content should reference or incorporate at least one of the eligibility signals in the "Ko treba aplicirati?" section.

**Validates: Requirements 2.6**

### Property 8: CTA Configuration Matches Opportunity State

*For any* opportunity and user authentication state, the generated CTA configuration should match the expected pattern: deadline present → "Automatski prati rok", difficulty="tesko" → includes checklist option, not logged in → includes signup context, logged in → direct follow action.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

### Property 9: Urgency Banner Display Logic

*For any* opportunity with a deadline, the urgency banner should be displayed if and only if the deadline is ≤ 7 days from now, or if the deadline has passed (expired state).

**Validates: Requirements 4.1**

### Property 10: Urgency Styling Matches Deadline Threshold

*For any* opportunity with urgency banner displayed, the color scheme and emoji should match the deadline threshold: ≤1 day → red + "⚡", ≤3 days → red + "⚡", ≤7 days → amber + "⏰", expired → red + Ban icon.

**Validates: Requirements 4.2, 4.3, 4.5**

### Property 11: Urgency Message Format

*For any* opportunity with deadline ≤ 7 days and not expired, the urgency message should contain the exact number of days until deadline in the format "ROK ZA PRIJAVU ZA X DANA" or "ROK ISTJEČE DANAS/SUTRA" for ≤1 day.

**Validates: Requirements 4.4**

### Property 12: Urgency Badge in List Views

*For any* opportunity in a list view with deadline ≤ 7 days, the opportunity card data should include an urgency_badge field with appropriate styling and text.

**Validates: Requirements 4.6**

### Property 13: AI Content Contains Required SEO Elements

*For any* generated ai_content, the content should include: (1) required headings (## O ovom pozivu, ## Ko treba aplicirati), (2) natural keywords (poticaji, grantovi, location, BiH, 2026), and (3) first paragraph with all four required elements (tip, lokacija, ciljna skupina, godina).

**Validates: Requirements 5.1, 5.3, 5.6**

### Property 14: SEO Title Format Compliance

*For any* generated seo_title, it should match the pattern "[Vrsta] za [ko] u [lokacija] (2026)" and should NOT be a direct copy of the original opportunity title.

**Validates: Requirements 5.2**

### Property 15: SEO Description Action-Oriented

*For any* generated seo_description, it should start with one of the approved action words (Prijavite se, Saznajte, Iskoristite) and include key information (tip poticaja, lokacija, ciljna skupina).

**Validates: Requirements 5.4**

### Property 16: SEO Length Constraints

*For any* generated SEO content, the seo_title should be ≤ 65 characters and the seo_description should be between 140-155 characters.

**Validates: Requirements 5.5**

### Property 17: Related Opportunities Count and Ranking

*For any* opportunity, the related opportunities list should contain 3-5 items (or fewer if insufficient matches exist) ranked by relevance score (category match + location match + type match).

**Validates: Requirements 6.1**

### Property 18: Related Opportunities Metadata Completeness

*For any* opportunity in the related opportunities list, it should include: similarity_reason (why it's related), deadline, value, difficulty, and all metadata should be non-null where available.

**Validates: Requirements 6.2, 6.3**

### Property 19: Related Opportunities Prioritize Active

*For any* related opportunities list, active opportunities with closer deadlines should rank higher than expired opportunities or those with distant deadlines, and expired opportunities should only appear if no active alternatives exist.

**Validates: Requirements 6.4, 6.5**

### Property 20: Related Opportunities Category Link

*For any* related opportunities response, it should include a category_link field pointing to the category page for viewing all similar opportunities.

**Validates: Requirements 6.6**

### Property 21: Decision Support Generation

*For any* published opportunity, the decision_support field should be populated with: competition_level, success_probability, typical_mistakes array (max 3), recommendation, and reasoning.

**Validates: Requirements 7.1, 7.6**

### Property 22: Competition Analysis Uses Historical Data

*For any* opportunity with historical_context data, the competition_level should be calculated based on similar_calls_count and category_trend (high count + increasing trend → "visoka", low count + stable → "niska").

**Validates: Requirements 7.2**

### Property 23: Historical Award Data Display

*For any* opportunity where historical award data exists (previous calls with award counts), the decision_support should include estimated_applicants and award_rate in the reasoning.

**Validates: Requirements 7.3**

### Property 24: Typical Mistakes Based on Difficulty

*For any* opportunity, the typical_mistakes array should contain items that relate to the ai_difficulty level (more complex mistakes for "tesko", basic mistakes for "lako").

**Validates: Requirements 7.4**

### Property 25: Success Probability Calculation

*For any* opportunity, the success_probability should be calculated using both eligibility_signals match (high match → higher probability) and competition_level (low competition → higher probability).

**Validates: Requirements 7.5**

### Property 26: Filters Return Only Matching Opportunities

*For any* applied filter (urgency, high_value, difficulty), all returned opportunities should satisfy the filter condition: urgency → deadline ≤ 14 days, high_value → value in top 25%, difficulty → exact match.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 27: Filter Composition

*For any* combination of filters applied simultaneously, all returned opportunities should satisfy ALL filter conditions (AND logic).

**Validates: Requirements 8.4**

### Property 28: Filter Count Accuracy

*For any* filter option, the getFilterCounts function should return the exact count of opportunities that would match that filter if applied.

**Validates: Requirements 8.5**

### Property 29: Filter State in URL

*For any* applied filter configuration, the URL query parameters should encode all active filters, and parsing those parameters should restore the exact same filter state.

**Validates: Requirements 8.6**

### Property 30: Quality Score Calculation

*For any* opportunity, the content_quality_score should be calculated based on: source_validated (20 points), ai_content completeness (40 points), SEO optimization (40 points), with total score 0-100.

**Validates: Requirements 9.1**

### Property 31: Low Quality Opportunities Query

*For any* query for low-quality opportunities, it should return only opportunities where content_quality_score < 70, ordered by score ascending.

**Validates: Requirements 9.2**

### Property 32: AI Review Rejection Logging

*For any* opportunity rejected by AI review, a log entry should be created with: opportunity_id, rejection_reason, rejected_at timestamp, and the opportunity should not be published.

**Validates: Requirements 9.3**

### Property 33: Quality Statistics Accuracy

*For any* time period, the admin statistics should accurately calculate: total opportunities processed, count published, count rejected, and average content_quality_score.

**Validates: Requirements 9.4**

### Property 34: Manual Override Workflow

*For any* opportunity rejected by AI review, if an admin applies manual override, the opportunity should be published with published=true and a manual_override flag set.

**Validates: Requirements 9.5**

### Property 35: Quality Trend Time Series

*For any* time period query, the quality trend data should return average content_quality_score grouped by the specified time interval (day/week/month).

**Validates: Requirements 9.6**

### Property 36: Issuer Historical Context Display

*For any* opportunity page, if other opportunities from the same issuer exist, the page should include a "Drugi pozivi od [issuer]" section with up to 3 previous calls, each showing title, deadline, and status.

**Validates: Requirements 10.1, 10.2, 10.3**

### Property 37: Trend Detection and Messaging

*For any* opportunity where similar calls from the same issuer occur at regular intervals (yearly pattern detected), the historical_context should include a typical_frequency message like "Ovaj poziv se objavljuje svake godine u [mjesec]".

**Validates: Requirements 10.4**

### Property 38: Issuer Call Count Accuracy

*For any* opportunity, the historical_context.issuer_calls_count should accurately count all opportunities from the same issuer published in the last 12 months.

**Validates: Requirements 10.5**

### Property 39: Issuer Filter Link

*For any* opportunity page, the issuer name should be clickable and link to a filtered view showing all opportunities from that issuer.

**Validates: Requirements 10.6**


## Error Handling

### Source Validation Errors

**Scenario**: Source URL is unreachable or returns non-200 status

**Handling**:
- Log error to `source_validation_log` table with full details
- Set `source_validated = false` and `source_validation_error` on opportunity
- Do NOT block publication if other quality checks pass
- Admin dashboard shows validation errors for manual review
- Retry validation after 24 hours for transient failures

**Recovery**: Admin can manually correct source_url, triggering re-validation

### AI Content Generation Failures

**Scenario**: OpenAI API timeout, rate limit, or invalid response

**Handling**:
- Log error with opportunity_id and error details
- Retry up to 3 times with exponential backoff (1s, 2s, 4s)
- If all retries fail, publish opportunity with basic content (title, description, requirements)
- Set `ai_generated_at = null` to mark for regeneration in next pipeline run
- Continue processing other opportunities (fail gracefully)

**Recovery**: Auto-regeneration batch process runs every 6 hours to fill missing AI content

### Historical Context Query Failures

**Scenario**: Database query timeout or connection error

**Handling**:
- Log error and continue with empty historical context
- Generate AI content without historical data (degraded mode)
- Set `historical_context = null` to mark for recalculation
- Opportunity still gets published with available data

**Recovery**: Background job recalculates missing historical context every 12 hours

### Decision Support Calculation Errors

**Scenario**: Insufficient data for competition analysis or success probability

**Handling**:
- Use conservative defaults: competition_level = "srednja", success_probability = "srednja"
- Generate generic typical_mistakes based on difficulty level only
- Include disclaimer in reasoning: "Nedovoljno historijskih podataka za preciznu procjenu"
- Still publish opportunity with partial decision support

**Recovery**: As more historical data accumulates, recalculate decision support monthly

### Filter Query Performance Issues

**Scenario**: Complex filter combination causes slow query (>2s)

**Handling**:
- Implement query timeout at 5 seconds
- Return cached results if available (5-minute cache)
- Log slow query for optimization
- Show user "Filteri se primjenjuju..." loading state

**Recovery**: Database indexes on filter columns, query optimization, consider materialized views

### URL Encoding and Special Characters

**Scenario**: Opportunity title or location contains special characters causing URL issues

**Handling**:
- Sanitize all text before slug generation (remove/replace special chars)
- Use `encodeURIComponent()` for all URL parameters
- Validate slug uniqueness before insert
- If slug collision, append random suffix

**Recovery**: Automatic slug regeneration if validation fails

### Deadline Calculation Edge Cases

**Scenario**: Deadline is null, invalid date format, or in distant past

**Handling**:
- Null deadline: No urgency banner, CTA shows "Pratite za ažuriranja"
- Invalid format: Log error, treat as null deadline
- Past deadline: Mark status='expired', show expired banner
- Distant future (>1 year): No urgency indicators

**Recovery**: Manual admin correction if deadline data is incorrect

### SEO Content Validation Failures

**Scenario**: Generated content doesn't meet SEO requirements (missing elements, wrong format)

**Handling**:
- Validate content before saving
- If validation fails, retry generation once with stricter prompt
- If still fails, use fallback templates with available data
- Log validation failure for monitoring
- Reduce content_quality_score by 20 points

**Recovery**: Weekly batch job re-generates failed SEO content with improved prompts

## Testing Strategy

### Dual Testing Approach

This system requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Source validation with specific URLs (404, 500, redirect chains)
- AI content generation with known inputs
- Urgency banner rendering for specific dates
- Filter query results for known datasets
- Admin dashboard actions (override, correction)

**Property-Based Tests**: Verify universal properties across all inputs
- Source validation correctness for any URL and domain combination
- Content generation includes required elements for any opportunity
- Urgency calculations correct for any deadline
- Filters return only matching items for any filter combination
- Quality scores calculated correctly for any opportunity state

### Property-Based Testing Configuration

**Library**: Use `fast-check` for TypeScript/JavaScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: opportunity-content-quality-and-accuracy-system, Property X: [property text]`

**Example Test Structure**:

```typescript
import fc from 'fast-check';

describe('Feature: opportunity-content-quality-and-accuracy-system', () => {
  it('Property 1: Source URL Validation Correctness', () => {
    fc.assert(
      fc.property(
        fc.webUrl(), // Generate random URLs
        fc.domain(), // Generate random expected domains
        async (url, expectedDomain) => {
          const result = await validateSourceUrl(url, expectedDomain);
          
          // Property: validation result should be consistent with actual URL state
          if (result.valid) {
            expect(result.status_code).toBeGreaterThanOrEqual(200);
            expect(result.status_code).toBeLessThan(300);
            expect(result.domain_match).toBe(true);
          } else {
            expect(result.error).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Data Generators

**Opportunity Generator**:
```typescript
const opportunityArbitrary = fc.record({
  title: fc.string({ minLength: 10, maxLength: 200 }),
  issuer: fc.string({ minLength: 5, maxLength: 100 }),
  category: fc.constantFrom(...AI_CATEGORY_VALUES),
  deadline: fc.option(fc.date({ min: new Date(), max: new Date('2027-12-31') })),
  value: fc.option(fc.integer({ min: 1000, max: 10000000 })),
  location: fc.option(fc.constantFrom('Sarajevo', 'Tuzla', 'Mostar', 'Banja Luka')),
  eligibility_signals: fc.array(fc.string(), { maxLength: 5 }),
  ai_difficulty: fc.constantFrom('lako', 'srednje', 'tesko'),
});
```

**Historical Context Generator**:
```typescript
const historicalContextArbitrary = fc.record({
  similar_calls_count: fc.integer({ min: 0, max: 50 }),
  issuer_calls_count: fc.integer({ min: 0, max: 20 }),
  category_trend: fc.constantFrom('increasing', 'stable', 'decreasing'),
  typical_frequency: fc.option(fc.string()),
});
```

### Integration Testing

**Post-Sync Pipeline Integration**:
- Test complete pipeline flow: scrape → validate → generate → publish
- Use test database with known seed data
- Verify each stage produces expected outputs
- Test error recovery at each stage

**Database Integration**:
- Test all queries with realistic data volumes (10k+ opportunities)
- Verify index usage with EXPLAIN ANALYZE
- Test concurrent access scenarios
- Verify RLS policies work correctly

**API Integration**:
- Test OpenAI API with rate limiting and retries
- Mock API responses for deterministic tests
- Test timeout handling
- Verify cost tracking and limits

### Performance Testing

**Query Performance**:
- Filter queries should complete in <500ms for 10k opportunities
- Related opportunities query <200ms
- Historical context calculation <300ms
- Admin dashboard statistics <1s

**Load Testing**:
- Source validation: 100 URLs/minute sustained
- AI content generation: 20 opportunities/minute
- Public page loads: 100 req/s with <1s response time

**Monitoring**:
- Track slow queries (>1s) in logs
- Monitor AI API usage and costs
- Alert on validation failure rate >10%
- Track content_quality_score trends

### Manual Testing Checklist

**Source Validation**:
- [ ] Valid URL from expected domain → passes validation
- [ ] Valid URL from wrong domain → fails with domain_match=false
- [ ] 404 URL → fails with appropriate error
- [ ] Redirect chain → follows and validates final URL
- [ ] Timeout → fails gracefully with timeout error

**AI Content Quality**:
- [ ] Generated content includes historical context when available
- [ ] SEO title follows required format
- [ ] First paragraph contains all required elements
- [ ] No generic phrases in content
- [ ] Headings properly formatted

**Urgency Display**:
- [ ] Deadline ≤ 1 day → critical red banner
- [ ] Deadline 2-3 days → high urgency orange banner
- [ ] Deadline 4-7 days → medium urgency amber banner
- [ ] Deadline > 7 days → no banner
- [ ] Expired deadline → expired banner

**Decision Support**:
- [ ] Competition level reflects historical data
- [ ] Success probability considers eligibility match
- [ ] Typical mistakes relate to difficulty level
- [ ] Recommendation includes reasoning

**Filters**:
- [ ] Urgency filter returns only deadline ≤ 14 days
- [ ] High value filter returns top 25%
- [ ] Difficulty filter exact match
- [ ] Combined filters use AND logic
- [ ] Filter counts accurate before applying

**Admin Dashboard**:
- [ ] Low quality opportunities list shows score < 70
- [ ] Source validation errors displayed
- [ ] Manual override publishes rejected opportunity
- [ ] Quality trend chart shows accurate data
- [ ] Statistics calculations correct

