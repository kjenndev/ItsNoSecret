-- Defaults apply only to future accounts; do not rewrite any existing roles.
ALTER TABLE "User" ALTER COLUMN "roles" SET DEFAULT ARRAY['CLIENT']::"Role"[];
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0,
                   ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Comment" ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT true;
-- Historical staff (including mixed-role authors) and unknown authors stay private.
UPDATE "Comment" c SET "isInternal" = false FROM "User" u
WHERE c."authorId" = u.id AND 'CLIENT'::"Role" = ANY(u.roles)
  AND NOT (u.roles && ARRAY['ADMIN','TECHNICIAN']::"Role"[]);
-- Fail safely on inconsistent legacy conversion data; operator preflight must repair it explicitly.
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_conversion_integrity" CHECK (
  (status = 'CONVERTED' AND "convertedCustomerId" IS NOT NULL AND "convertedAt" IS NOT NULL)
  OR (status <> 'CONVERTED' AND "convertedCustomerId" IS NULL AND "convertedAt" IS NULL)
);
