# Public Opportunities Visibility and Manual Sync Bugfix Design

## Overview

This bugfix addresses two visibility and control issues: (1) the homepage lacks prominent display of opportunities/laws content that exists on dedicated pages, reducing SEO value and user engagement, and (2) the admin dashboard references a non-existent RunPostSyncButton component for manual sync triggering. The fix adds a featured opportunities section to the homepage and creates the missing button component with proper loading states and error handling.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when users visit the homepage or admins access the prilike dashboard
- **Property (P)**: The desired behavior - homepage prominently displays recent opportunities/laws, and admin dashboard has a functional manual sync button
- **Preservation**: Existing navigation, dedicated pages, automatic cron sync, and all other functionality must remain unchanged
- **LandingPage**: The client component in `components/landing/landing-page.tsx` that renders the homepage
- **HomePage**: The server component in `app/page.tsx` that fetches data and renders LandingPage
- **RunPostSyncButton**: The missing client component that should exist at `components/admin/run-post-sync-button.tsx`
- **Post-sync pipeline**: The scraping and AI content generation process in `sync/post-sync-pipeline.ts`
- **OpportunityCard**: The existing component in `components/public/opportunity-card.tsx` for displaying opportunities

## Bug Details

### Bug Condition

The bug manifests in two scenarios: (1) when users visit the homepage, they see no featured opportunities or laws content despite these pages existing with valuable SEO content, and (2) when admins access `/dashboard/admin/prilike`, the page imports and renders `<RunPostSyncButton />` but this component file does not exist, causing a build/runtime error.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { page: string, userRole: string }
  OUTPUT: boolean
  
  RETURN (input.page === "homepage" AND NOT hasOpportunitiesSection())
         OR (input.page === "admin-prilike" AND input.userRole === "admin" AND NOT componentExists("RunPostSyncButton"))
END FUNCTION
```

### Examples

- **Homepage visitor**: User lands on homepage, sees hero, features, pricing, but no opportunities/laws preview → misses valuable content, reduced SEO
- **Admin user**: Admin navigates to `/dashboard/admin/prilike`, page fails to render or shows error because RunPostSyncButton component is missing
- **SEO crawler**: Search engine crawls homepage, finds no opportunities content → reduced indexing of valuable public pages
- **Admin after fresh scrape**: Admin wants to manually trigger sync to populate database, but has no UI control to do so

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Navigation links to "Prilike" and "Zakon" in public layout header must continue to work
- Dedicated pages `/prilike` and `/zakon` must continue to display full content with filtering
- Automatic cron job at `/api/cron/post-sync` must continue to run on schedule
- Existing admin dashboard KPIs, scraper logs, and opportunities list must remain unchanged
- All other landing page sections (hero, how it works, pricing, FAQ) must remain unchanged
- OpportunityCard component display logic must remain unchanged

**Scope:**
All inputs that do NOT involve the homepage opportunities section or admin manual sync button should be completely unaffected by this fix. This includes:
- All other landing page sections and navigation
- Dedicated prilike/zakon pages functionality
- Automatic cron sync execution
- All other admin dashboard pages and features

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Missing Homepage Section**: The LandingPage component was designed with marketing sections (hero, features, pricing) but never included a section to showcase actual opportunities/laws content from the database
   - The component is purely client-side and doesn't receive opportunities data as props
   - No data fetching happens in the parent HomePage server component to pass opportunities down

2. **Missing Component File**: The RunPostSyncButton component is imported and used in `app/(dashboard)/dashboard/admin/prilike/page.tsx` but the file `components/admin/run-post-sync-button.tsx` was never created
   - The import statement exists: `import { RunPostSyncButton } from "@/components/admin/run-post-sync-button";`
   - The component is rendered: `<RunPostSyncButton />`
   - But the actual component implementation is missing

3. **No API Route for Manual Sync**: The existing `/api/cron/post-sync` route requires Bearer token authentication intended for cron jobs, not suitable for admin UI calls
   - Needs a separate admin-authenticated endpoint or modification to accept admin session auth

## Correctness Properties

Property 1: Bug Condition - Homepage Displays Opportunities

_For any_ user visiting the homepage, the system SHALL display a prominent section featuring recent opportunities and laws with clear calls-to-action linking to the full pages, improving discoverability and SEO value.

**Validates: Requirements 2.1, 2.4**

Property 2: Bug Condition - Admin Manual Sync Button Exists

_For any_ admin user accessing the admin prilike dashboard, the system SHALL display a functional "Pokreni scraper" button that triggers the post-sync pipeline, shows loading state during execution, and displays results or errors upon completion.

**Validates: Requirements 2.2, 2.3**

Property 3: Preservation - Existing Navigation and Pages

_For any_ user interaction with navigation links, dedicated pages, or automatic sync processes, the system SHALL produce exactly the same behavior as before, preserving all existing functionality for non-homepage and non-admin-button interactions.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `app/page.tsx`

**Function**: `HomePage` server component

**Specific Changes**:
1. **Add data fetching**: Query Supabase for recent opportunities (limit 6) and legal updates (limit 3)
   - Filter: `published = true`, `status = 'active'` for opportunities
   - Order: `deadline ASC` for opportunities, `published_date DESC` for legal updates
   - Select minimal fields needed for preview cards

2. **Pass data to LandingPage**: Add new props `recentOpportunities` and `recentLegalUpdates` to LandingPage component

**File 2**: `components/landing/landing-page.tsx`

**Function**: `LandingPage` client component

**Specific Changes**:
1. **Update interface**: Add optional props for `recentOpportunities` and `recentLegalUpdates`

2. **Create new section component**: `OpportunitiesPreviewSection` to be inserted between `HowItWorksSection` and `BeforeAfterSection`
   - Display heading: "Aktivne prilike i pravne izmjene"
   - Show 2 columns: opportunities on left, legal updates on right
   - Use existing OpportunityCard component for opportunities
   - Create simple card layout for legal updates
   - Add CTAs: "Vidi sve prilike →" and "Prati pravne izmjene →"
   - Use framer-motion animations consistent with other sections

3. **Conditional rendering**: Only show section if data exists (graceful degradation)

**File 3**: `components/admin/run-post-sync-button.tsx` (NEW FILE)

**Function**: Client component for manual sync trigger

**Specific Changes**:
1. **Create client component**: Mark with "use client" directive

2. **State management**: 
   - `isLoading` boolean for loading state
   - `result` object for success results
   - `error` string for error messages

3. **API call function**: 
   - POST to `/api/admin/trigger-sync` (new endpoint)
   - Handle loading, success, and error states
   - Display results in toast or inline message

4. **UI rendering**:
   - Button with "Pokreni scraper" label
   - Disabled state during loading
   - Loading spinner icon when active
   - Success message showing opportunities processed/published
   - Error message if sync fails

**File 4**: `app/api/admin/trigger-sync/route.ts` (NEW FILE)

**Function**: Admin-authenticated API endpoint for manual sync

**Specific Changes**:
1. **Create POST handler**: Accept POST requests from admin users

2. **Authentication check**: 
   - Verify user is authenticated via Supabase session
   - Check user has admin role using `requireAdminUser()` helper

3. **Execute sync**: 
   - Call `runPostSyncPipeline()` from `sync/post-sync-pipeline.ts`
   - Return results with proper error handling

4. **Response format**: 
   - Success: JSON with opportunities_processed, opportunities_published, duration_ms
   - Error: JSON with error message and 500 status

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: 
1. Visit homepage and verify no opportunities section exists
2. Attempt to build/run app and observe RunPostSyncButton import error
3. Navigate to admin prilike page and observe component error
4. Inspect HomePage component and verify no data fetching for opportunities

**Test Cases**:
1. **Homepage Missing Section**: Navigate to `/` and scroll through all sections (will fail - no opportunities section found)
2. **Component Import Error**: Run `npm run build` or `npm run dev` (will fail - cannot resolve RunPostSyncButton import)
3. **Admin Page Error**: Navigate to `/dashboard/admin/prilike` as admin (will fail - component not found)
4. **No Data Fetching**: Inspect `app/page.tsx` source (will fail - no Supabase queries for opportunities)

**Expected Counterexamples**:
- Homepage renders without opportunities preview section
- Build fails with "Module not found: Can't resolve '@/components/admin/run-post-sync-button'"
- Admin page shows error or fails to render
- HomePage component only fetches user auth, no opportunities data

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  IF input.page === "homepage" THEN
    result := renderHomePage()
    ASSERT result.hasOpportunitiesSection === true
    ASSERT result.opportunitiesCount > 0 OR result.showsEmptyState === true
    ASSERT result.hasLegalUpdatesSection === true
  END IF
  
  IF input.page === "admin-prilike" AND input.userRole === "admin" THEN
    result := renderAdminPrilikePage()
    ASSERT result.hasRunPostSyncButton === true
    ASSERT result.buttonIsClickable === true
    
    clickResult := clickRunPostSyncButton()
    ASSERT clickResult.showsLoadingState === true
    ASSERT clickResult.triggersSync === true
    ASSERT clickResult.displaysResults === true OR clickResult.displaysError === true
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT navigationLinks_original() = navigationLinks_fixed()
  ASSERT prilikePage_original() = prilikePage_fixed()
  ASSERT zakonPage_original() = zakonPage_fixed()
  ASSERT cronSync_original() = cronSync_fixed()
  ASSERT adminDashboardOtherPages_original() = adminDashboardOtherPages_fixed()
END FOR
```

**Testing Approach**: Manual testing and visual regression testing are recommended for preservation checking because:
- UI components require visual verification
- Navigation flows need end-to-end testing
- Existing pages should look and behave identically
- Automated screenshot comparison can catch unintended changes

**Test Plan**: 
1. Navigate to `/prilike` and verify page renders identically with all filters and cards
2. Navigate to `/zakon` and verify page renders identically with all legal updates
3. Click navigation links and verify routing works unchanged
4. Verify cron job continues to run on schedule (check logs)
5. Navigate to other admin pages and verify they render unchanged

**Test Cases**:
1. **Prilike Page Preservation**: Visit `/prilike`, verify OpportunityCard display, filtering, and layout unchanged
2. **Zakon Page Preservation**: Visit `/zakon`, verify legal updates display and layout unchanged
3. **Navigation Preservation**: Click "Prilike" and "Zakon" nav links, verify routing works
4. **Cron Preservation**: Check scraper_log table for automatic sync entries
5. **Admin Pages Preservation**: Visit `/dashboard/admin/agencies`, `/dashboard/admin/system`, etc., verify unchanged
6. **Landing Sections Preservation**: Verify hero, how-it-works, pricing, FAQ sections render identically

### Unit Tests

- Test HomePage component fetches correct data from Supabase
- Test LandingPage renders OpportunitiesPreviewSection when data provided
- Test LandingPage gracefully handles empty opportunities array
- Test RunPostSyncButton shows loading state when clicked
- Test RunPostSyncButton displays success results
- Test RunPostSyncButton displays error messages
- Test admin API route requires authentication
- Test admin API route calls runPostSyncPipeline

### Property-Based Tests

- Generate random opportunities datasets and verify homepage section renders correctly
- Generate random legal updates datasets and verify homepage section renders correctly
- Test RunPostSyncButton with various API response scenarios (success, error, timeout)
- Verify OpportunityCard component renders consistently with same data

### Integration Tests

- Test full flow: homepage load → see opportunities → click "Vidi sve prilike" → land on `/prilike`
- Test full flow: admin login → navigate to prilike dashboard → click sync button → see results
- Test that manual sync populates database and homepage reflects new data
- Test that homepage opportunities section updates after cron sync runs
- Verify SEO meta tags and structured data for opportunities section
