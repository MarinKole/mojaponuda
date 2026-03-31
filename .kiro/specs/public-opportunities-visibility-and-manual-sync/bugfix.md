# Bugfix Requirements Document

## Introduction

Public opportunities (prilike), laws (zakon), and incentives (poticaji) pages exist but are not sufficiently visible to users. The primary purpose of these pages is SEO and public accessibility, but they lack prominence on the homepage and the admin dashboard lacks a manual sync trigger button to populate data. This bugfix addresses visibility issues and adds manual control over the sync process.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user visits the homepage THEN the opportunities/laws/incentives sections are not featured or highlighted, making them difficult to discover

1.2 WHEN an admin wants to manually trigger the post-sync pipeline THEN there is no button or UI control available (the `RunPostSyncButton` component is referenced but does not exist)

1.3 WHEN the sync has not been run THEN the public pages show empty states with no data, reducing SEO value and user engagement

1.4 WHEN a user navigates the site THEN opportunities and laws are only accessible via small navigation links, not prominently featured

### Expected Behavior (Correct)

2.1 WHEN a user visits the homepage THEN the system SHALL prominently feature a section showcasing recent opportunities, laws, and incentives with clear calls-to-action

2.2 WHEN an admin accesses the admin prilike dashboard THEN the system SHALL display a functional "Pokreni scraper" button that triggers the `/api/cron/post-sync` endpoint

2.3 WHEN the admin clicks the manual sync button THEN the system SHALL show loading state, execute the sync, and display results (opportunities processed, published, errors)

2.4 WHEN the homepage features opportunities THEN the system SHALL display the most recent/relevant items with links to full pages, improving discoverability and SEO

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user clicks navigation links to "Prilike" or "Zakon" THEN the system SHALL CONTINUE TO navigate to the existing public pages

3.2 WHEN the cron job runs automatically THEN the system SHALL CONTINUE TO execute the post-sync pipeline without manual intervention

3.3 WHEN opportunities are displayed on their dedicated pages THEN the system SHALL CONTINUE TO show full details, AI analysis, and related opportunities

3.4 WHEN the sync process runs THEN the system SHALL CONTINUE TO scrape sources, score opportunities, generate AI content, and update the database as designed

3.5 WHEN users access the public layout THEN the system SHALL CONTINUE TO display the existing navigation header and footer
