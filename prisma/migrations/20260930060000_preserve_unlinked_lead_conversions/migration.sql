-- Keep conversion history when a customer is deleted and the lead is unlinked.
-- Hold the table lock until both constraint changes commit; validate existing
-- rows immediately and abort without repairing inconsistent historical data.
BEGIN;

ALTER TABLE "Lead" DROP CONSTRAINT "Lead_conversion_integrity";
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_conversion_integrity" CHECK (
  (status = 'CONVERTED' AND "convertedAt" IS NOT NULL)
  OR (status <> 'CONVERTED' AND "convertedCustomerId" IS NULL AND "convertedAt" IS NULL)
);

COMMIT;
