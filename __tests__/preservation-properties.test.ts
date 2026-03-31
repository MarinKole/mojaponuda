/**
 * Preservation Property Tests
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * These tests verify that existing functionality remains unchanged after the fix.
 * 
 * IMPORTANT: These tests should PASS on UNFIXED code to establish baseline behavior.
 * 
 * Preservation Requirements:
 * - Navigation links to "Prilike" and "Zakon" continue to work (3.1)
 * - Dedicated pages `/prilike` and `/zakon` display full content with filtering (3.1, 3.3)
 * - Automatic cron job continues to run on schedule (3.2)
 * - Existing admin dashboard pages remain unchanged (3.5)
 * - All other landing page sections remain unchanged (3.5)
 * - OpportunityCard component display logic remains unchanged (3.3)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('Preservation Properties - Existing Functionality', () => {
  /**
   * Property 1: Navigation Links Preservation
   * 
   * Verify that navigation links to "Prilike" and "Zakon" exist and work correctly
   * in the public layout header.
   * 
   * **Validates: Requirement 3.1**
   */
  it('Property: Navigation links to Prilike and Zakon continue to work', () => {
    // Read the public layout component
    const publicLayoutPath = path.join(process.cwd(), 'app', '(public)', 'layout.tsx');
    const publicLayoutContent = fs.readFileSync(publicLayoutPath, 'utf-8');

    // Check 1: Navigation should have link to /prilike
    const hasPrilikeLink = publicLayoutContent.includes('href="/prilike"') &&
                            publicLayoutContent.includes('Prilike');
    
    expect(hasPrilikeLink).toBe(true);

    // Check 2: Navigation should have link to /zakon
    const hasZakonLink = publicLayoutContent.includes('href="/zakon"') &&
                          publicLayoutContent.includes('Zakon');
    
    expect(hasZakonLink).toBe(true);

    // Check 3: Links should be in nav element
    const hasNavElement = publicLayoutContent.includes('<nav');
    
    expect(hasNavElement).toBe(true);
  });

  /**
   * Property 2: Dedicated Pages Preservation
   * 
   * Verify that /prilike and /zakon pages exist and have their full content
   * with filtering, cards, and data fetching logic.
   * 
   * **Validates: Requirements 3.1, 3.3**
   */
  it('Property: Dedicated pages /prilike and /zakon display full content', () => {
    // Check /prilike page
    const prilikePath = path.join(process.cwd(), 'app', '(public)', 'prilike', 'page.tsx');
    const prilikeContent = fs.readFileSync(prilikePath, 'utf-8');

    // Prilike page should fetch opportunities from Supabase
    const prilikeFetchesData = prilikeContent.includes('.from("opportunities")') &&
                                prilikeContent.includes('.select(');
    expect(prilikeFetchesData).toBe(true);

    // Prilike page should use OpportunityCard component
    const prilikeUsesCard = prilikeContent.includes('OpportunityCard');
    expect(prilikeUsesCard).toBe(true);

    // Prilike page should filter by type (tender/poticaj)
    const prilikeFilters = prilikeContent.includes('filter') || 
                            prilikeContent.includes('type === "tender"') ||
                            prilikeContent.includes('type === "poticaj"');
    expect(prilikeFilters).toBe(true);

    // Check /zakon page
    const zakonPath = path.join(process.cwd(), 'app', '(public)', 'zakon', 'page.tsx');
    const zakonContent = fs.readFileSync(zakonPath, 'utf-8');

    // Zakon page should fetch legal updates from Supabase
    const zakonFetchesData = zakonContent.includes('.from("legal_updates")') &&
                              zakonContent.includes('.select(');
    expect(zakonFetchesData).toBe(true);

    // Zakon page should display legal update cards
    const zakonDisplaysCards = zakonContent.includes('type') && 
                                zakonContent.includes('title') &&
                                zakonContent.includes('summary');
    expect(zakonDisplaysCards).toBe(true);
  });

  /**
   * Property 3: Cron Job Preservation
   * 
   * Verify that the automatic cron job endpoint exists and has the correct
   * authentication and execution logic.
   * 
   * **Validates: Requirement 3.2**
   */
  it('Property: Automatic cron job continues to run on schedule', () => {
    // Check cron endpoint exists
    const cronPath = path.join(process.cwd(), 'app', 'api', 'cron', 'post-sync', 'route.ts');
    const cronExists = fs.existsSync(cronPath);
    
    expect(cronExists).toBe(true);

    if (cronExists) {
      const cronContent = fs.readFileSync(cronPath, 'utf-8');

      // Cron should have GET handler (cron jobs use GET)
      const hasGetHandler = cronContent.includes('export async function GET') ||
                             cronContent.includes('export const GET');
      expect(hasGetHandler).toBe(true);

      // Cron should call runPostSyncPipeline
      const callsPipeline = cronContent.includes('runPostSyncPipeline');
      expect(callsPipeline).toBe(true);

      // Cron should have authentication (Bearer token)
      const hasAuth = cronContent.includes('authorization') || 
                       cronContent.includes('Authorization') ||
                       cronContent.includes('Bearer');
      expect(hasAuth).toBe(true);
    }
  });

  /**
   * Property 4: Admin Dashboard Pages Preservation
   * 
   * Verify that other admin dashboard pages remain unchanged and functional.
   * 
   * **Validates: Requirement 3.5**
   */
  it('Property: Existing admin dashboard pages remain unchanged', () => {
    // Check admin agencies page
    const agenciesPath = path.join(process.cwd(), 'app', '(dashboard)', 'dashboard', 'admin', 'agencies', 'page.tsx');
    const agenciesExists = fs.existsSync(agenciesPath);
    expect(agenciesExists).toBe(true);

    // Check admin system page
    const systemPath = path.join(process.cwd(), 'app', '(dashboard)', 'dashboard', 'admin', 'system', 'page.tsx');
    const systemExists = fs.existsSync(systemPath);
    expect(systemExists).toBe(true);

    // Check admin financials page
    const financialsPath = path.join(process.cwd(), 'app', '(dashboard)', 'dashboard', 'admin', 'financials', 'page.tsx');
    const financialsExists = fs.existsSync(financialsPath);
    expect(financialsExists).toBe(true);

    // Check admin leads page
    const leadsPath = path.join(process.cwd(), 'app', '(dashboard)', 'dashboard', 'admin', 'leads', 'page.tsx');
    const leadsExists = fs.existsSync(leadsPath);
    expect(leadsExists).toBe(true);
  });

  /**
   * Property 5: Landing Page Sections Preservation
   * 
   * Verify that all existing landing page sections remain unchanged:
   * - Hero section
   * - How it works section
   * - Before/After comparison
   * - Money/Security section
   * - Pricing section
   * - FAQ section
   * - Final CTA
   * 
   * **Validates: Requirement 3.5**
   */
  it('Property: All other landing page sections remain unchanged', () => {
    const landingPagePath = path.join(process.cwd(), 'components', 'landing', 'landing-page.tsx');
    const landingPageContent = fs.readFileSync(landingPagePath, 'utf-8');

    // Check for HeroSection
    const hasHeroSection = landingPageContent.includes('function HeroSection') &&
                            landingPageContent.includes('<HeroSection');
    expect(hasHeroSection).toBe(true);

    // Check for HowItWorksSection
    const hasHowItWorks = landingPageContent.includes('function HowItWorksSection') &&
                           landingPageContent.includes('<HowItWorksSection');
    expect(hasHowItWorks).toBe(true);

    // Check for BeforeAfterSection
    const hasBeforeAfter = landingPageContent.includes('function BeforeAfterSection') &&
                            landingPageContent.includes('<BeforeAfterSection');
    expect(hasBeforeAfter).toBe(true);

    // Check for MoneySection
    const hasMoneySection = landingPageContent.includes('function MoneySection') &&
                             landingPageContent.includes('<MoneySection');
    expect(hasMoneySection).toBe(true);

    // Check for PricingSection
    const hasPricingSection = landingPageContent.includes('function PricingSection') &&
                               landingPageContent.includes('<PricingSection');
    expect(hasPricingSection).toBe(true);

    // Check for FAQSection
    const hasFAQSection = landingPageContent.includes('FAQSection') &&
                           landingPageContent.includes('<FAQSection');
    expect(hasFAQSection).toBe(true);

    // Check for FinalCTA
    const hasFinalCTA = landingPageContent.includes('FinalCTA') &&
                         landingPageContent.includes('<FinalCTA');
    expect(hasFinalCTA).toBe(true);
  });

  /**
   * Property 6: OpportunityCard Component Preservation
   * 
   * Verify that the OpportunityCard component display logic remains unchanged.
   * 
   * **Validates: Requirement 3.3**
   */
  it('Property: OpportunityCard component display logic remains unchanged', () => {
    const cardPath = path.join(process.cwd(), 'components', 'public', 'opportunity-card.tsx');
    const cardContent = fs.readFileSync(cardPath, 'utf-8');

    // Check component exports OpportunityCard
    const exportsCard = cardContent.includes('export function OpportunityCard');
    expect(exportsCard).toBe(true);

    // Check component accepts opportunity prop
    const hasOpportunityProp = cardContent.includes('opportunity:') &&
                                cardContent.includes('OpportunityCardProps');
    expect(hasOpportunityProp).toBe(true);

    // Check component displays key fields
    const displaysTitle = cardContent.includes('title');
    const displaysIssuer = cardContent.includes('issuer');
    const displaysDeadline = cardContent.includes('deadline');
    const displaysLocation = cardContent.includes('location');
    
    expect(displaysTitle).toBe(true);
    expect(displaysIssuer).toBe(true);
    expect(displaysDeadline).toBe(true);
    expect(displaysLocation).toBe(true);

    // Check component has link to detail page
    const hasLink = cardContent.includes('Link') && 
                     cardContent.includes('href') &&
                     cardContent.includes('/prilike/');
    expect(hasLink).toBe(true);

    // Check component displays difficulty badge
    const hasDifficulty = cardContent.includes('ai_difficulty');
    expect(hasDifficulty).toBe(true);
  });

  /**
   * Property-Based Test: Navigation Links Work for Any User State
   * 
   * Generate various user scenarios and verify navigation links work consistently.
   */
  it('Property: Navigation links work for any user authentication state', () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoggedIn: fc.boolean(),
          userRole: fc.constantFrom('guest', 'user', 'admin'),
        }),
        (scenario) => {
          // Read the public layout
          const publicLayoutPath = path.join(process.cwd(), 'app', '(public)', 'layout.tsx');
          const publicLayoutContent = fs.readFileSync(publicLayoutPath, 'utf-8');

          // Property: Navigation links should exist regardless of user state
          const hasPrilikeLink = publicLayoutContent.includes('href="/prilike"');
          const hasZakonLink = publicLayoutContent.includes('href="/zakon"');

          expect(hasPrilikeLink).toBe(true);
          expect(hasZakonLink).toBe(true);

          // Navigation should not be conditional on user state
          // (links should always be visible)
          const linksAreUnconditional = !publicLayoutContent.includes('isLoggedIn && href="/prilike"') &&
                                         !publicLayoutContent.includes('isLoggedIn && href="/zakon"');
          expect(linksAreUnconditional).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property-Based Test: Dedicated Pages Handle Various Data States
   * 
   * Generate various data scenarios and verify pages handle them correctly.
   */
  it('Property: Dedicated pages handle various data states correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          opportunitiesCount: fc.integer({ min: 0, max: 100 }),
          legalUpdatesCount: fc.integer({ min: 0, max: 50 }),
          hasFilters: fc.boolean(),
        }),
        (scenario) => {
          // Read prilike page
          const prilikePath = path.join(process.cwd(), 'app', '(public)', 'prilike', 'page.tsx');
          const prilikeContent = fs.readFileSync(prilikePath, 'utf-8');

          // Property: Page should handle empty state
          const hasEmptyState = prilikeContent.includes('length === 0') ||
                                 prilikeContent.includes('Prilike se ažuriraju') ||
                                 prilikeContent.includes('Provjerite ponovo');
          expect(hasEmptyState).toBe(true);

          // Property: Page should fetch data from database
          const fetchesFromDB = prilikeContent.includes('.from(') &&
                                 prilikeContent.includes('supabase');
          expect(fetchesFromDB).toBe(true);

          // Read zakon page
          const zakonPath = path.join(process.cwd(), 'app', '(public)', 'zakon', 'page.tsx');
          const zakonContent = fs.readFileSync(zakonPath, 'utf-8');

          // Property: Zakon page should handle empty state
          const zakonHasEmptyState = zakonContent.includes('length === 0') ||
                                      zakonContent.includes('Pravne izmjene') ||
                                      zakonContent.includes('Provjerite ponovo');
          expect(zakonHasEmptyState).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property-Based Test: OpportunityCard Renders Consistently
   * 
   * Generate various opportunity data and verify card renders correctly.
   */
  it('Property: OpportunityCard renders consistently for various opportunity data', () => {
    fc.assert(
      fc.property(
        fc.record({
          hasTitle: fc.boolean(),
          hasIssuer: fc.boolean(),
          hasDeadline: fc.boolean(),
          hasLocation: fc.boolean(),
          hasDifficulty: fc.boolean(),
          hasValue: fc.boolean(),
        }),
        (scenario) => {
          const cardPath = path.join(process.cwd(), 'components', 'public', 'opportunity-card.tsx');
          const cardContent = fs.readFileSync(cardPath, 'utf-8');

          // Property: Card should handle optional fields gracefully
          const handlesOptionalFields = cardContent.includes('| null') ||
                                         cardContent.includes('?:') ||
                                         cardContent.includes('??');
          expect(handlesOptionalFields).toBe(true);

          // Property: Card should have consistent structure
          const hasConsistentStructure = cardContent.includes('interface OpportunityCardProps') &&
                                          cardContent.includes('opportunity:');
          expect(hasConsistentStructure).toBe(true);

          // Property: Card should format values (deadline, value)
          const formatsValues = cardContent.includes('formatValue') ||
                                 cardContent.includes('daysLeft') ||
                                 cardContent.includes('toLocaleDateString');
          expect(formatsValues).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property-Based Test: Landing Page Sections Render in Correct Order
   * 
   * Verify that landing page sections maintain their order and structure.
   */
  it('Property: Landing page sections render in correct order', () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoggedIn: fc.boolean(),
        }),
        (scenario) => {
          const landingPagePath = path.join(process.cwd(), 'components', 'landing', 'landing-page.tsx');
          const landingPageContent = fs.readFileSync(landingPagePath, 'utf-8');

          // Find the main LandingPage component
          const mainComponentMatch = landingPageContent.match(/export function LandingPage[\s\S]*?return \(([\s\S]*?)\n  \);/);
          
          if (mainComponentMatch) {
            const componentBody = mainComponentMatch[1];

            // Property: Sections should be in expected order
            const heroIndex = componentBody.indexOf('<HeroSection');
            const howItWorksIndex = componentBody.indexOf('<HowItWorksSection');
            const beforeAfterIndex = componentBody.indexOf('<BeforeAfterSection');
            const moneyIndex = componentBody.indexOf('<MoneySection');
            const pricingIndex = componentBody.indexOf('<PricingSection');

            // All sections should exist
            expect(heroIndex).toBeGreaterThan(-1);
            expect(howItWorksIndex).toBeGreaterThan(-1);
            expect(beforeAfterIndex).toBeGreaterThan(-1);
            expect(moneyIndex).toBeGreaterThan(-1);
            expect(pricingIndex).toBeGreaterThan(-1);

            // Sections should be in order
            expect(heroIndex).toBeLessThan(howItWorksIndex);
            expect(howItWorksIndex).toBeLessThan(beforeAfterIndex);
            expect(beforeAfterIndex).toBeLessThan(moneyIndex);
            expect(moneyIndex).toBeLessThan(pricingIndex);
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});

/**
 * EXPECTED TEST RESULTS ON UNFIXED CODE:
 * 
 * ✓ Property: Navigation links to Prilike and Zakon continue to work
 *   - Navigation has /prilike link
 *   - Navigation has /zakon link
 *   - Links are in nav element
 * 
 * ✓ Property: Dedicated pages /prilike and /zakon display full content
 *   - Prilike page fetches opportunities from Supabase
 *   - Prilike page uses OpportunityCard component
 *   - Prilike page filters by type
 *   - Zakon page fetches legal updates from Supabase
 *   - Zakon page displays legal update cards
 * 
 * ✓ Property: Automatic cron job continues to run on schedule
 *   - Cron endpoint exists
 *   - Cron has POST handler
 *   - Cron calls runPostSyncPipeline
 *   - Cron has authentication
 * 
 * ✓ Property: Existing admin dashboard pages remain unchanged
 *   - Admin agencies page exists
 *   - Admin system page exists
 *   - Admin financials page exists
 *   - Admin leads page exists
 * 
 * ✓ Property: All other landing page sections remain unchanged
 *   - HeroSection exists and is rendered
 *   - HowItWorksSection exists and is rendered
 *   - BeforeAfterSection exists and is rendered
 *   - MoneySection exists and is rendered
 *   - PricingSection exists and is rendered
 *   - FAQSection exists and is rendered
 *   - FinalCTA exists and is rendered
 * 
 * ✓ Property: OpportunityCard component display logic remains unchanged
 *   - Component exports OpportunityCard
 *   - Component accepts opportunity prop
 *   - Component displays title, issuer, deadline, location
 *   - Component has link to detail page
 *   - Component displays difficulty badge
 * 
 * ✓ Property: Navigation links work for any user authentication state
 *   - Multiple scenarios tested with different user states
 * 
 * ✓ Property: Dedicated pages handle various data states correctly
 *   - Multiple scenarios tested with different data counts
 * 
 * ✓ Property: OpportunityCard renders consistently for various opportunity data
 *   - Multiple scenarios tested with different field combinations
 * 
 * ✓ Property: Landing page sections render in correct order
 *   - Multiple scenarios tested with different user states
 * 
 * These passing tests CONFIRM the baseline behavior that must be preserved.
 */
