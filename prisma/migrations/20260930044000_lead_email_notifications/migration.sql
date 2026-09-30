-- Additive: no changes to existing leads, accounts, roles, or credentials.
CREATE TABLE "EmailSettings" (
 "id" TEXT NOT NULL DEFAULT 'default',
 "enabled" BOOLEAN NOT NULL DEFAULT false,
 "fromEmail" TEXT NOT NULL DEFAULT '',
 "fromName" TEXT NOT NULL DEFAULT '',
 "replyTo" TEXT NOT NULL DEFAULT '',
 "apiKeyEncrypted" TEXT,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LeadEmailJob" (
 "id" TEXT NOT NULL,
 "leadId" TEXT NOT NULL,
 "recipient" TEXT NOT NULL,
 "payload" JSONB NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING',
 "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "firstAttemptAt" TIMESTAMP(3),
 "lastStatus" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "LeadEmailJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LeadEmailJob_leadId_recipient_key" ON "LeadEmailJob"("leadId", "recipient");
CREATE INDEX "LeadEmailJob_status_nextAttemptAt_idx" ON "LeadEmailJob"("status", "nextAttemptAt");
