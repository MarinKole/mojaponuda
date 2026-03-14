-- Fix broken EJN portal URLs: old www.ejn.gov.ba/Notice/ is deprecated
-- New portal is at next.ejn.gov.ba/advertisement/procurement/
UPDATE tenders
SET portal_url = REPLACE(portal_url, 'https://www.ejn.gov.ba/Notice/', 'https://next.ejn.gov.ba/advertisement/procurement/')
WHERE portal_url LIKE 'https://www.ejn.gov.ba/Notice/%';
