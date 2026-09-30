# New-lead email notifications

Administrators can configure **App settings → Email** in the staff portal. App settings is pinned to the bottom of the navigation and is unavailable to technician/client accounts.

## Resend setup

1. In [Resend Domains](https://resend.com/domains), add and verify the domain you will send from. Complete the DNS records Resend requires. Domain verification happens in Resend, not in this application.
2. Create a [Resend API key](https://resend.com/api-keys) with sending access to that domain. Use the least-privileged sending key available; full account access is unnecessary.
3. Open **App settings**, enter the API key and a sender email on your verified domain. Optionally supply a sender name and reply-to address.
4. Enable new-lead notifications and save. Recipients are the email addresses of active accounts with the ADMIN role. Each recipient receives a separate email.

Resend's testing domain is restricted to permitted test recipients. Use a verified domain for normal admin delivery. Saving settings does not verify your Resend account, domain, quota, or inbox delivery. Check the Resend dashboard for provider delivery/bounce details.

Both homepage consultation submissions and staff-created leads trigger notifications when enabled. Editing or converting an existing lead does not. Existing leads are not backfilled. Delivery runs outside the request path through a persisted queue; provider errors do not discard a saved lead. Notifications include the lead's submitted contact details and message, but not internal staff notes. Treat recipient mailboxes and the database as containing customer personal information.

## Secret management and deployment

Set `EMAIL_SETTINGS_ENCRYPTION_KEY` in the backend environment before saving a Resend key. It must be a base64-encoded, cryptographically random 32-byte key. For example, generate one on the deployment host with `openssl rand -base64 32`, then store it securely in your protected environment/secrets manager—not in Git or the browser. Do not paste the output into logs or support chats.

The Resend API key is encrypted in the database and is never returned by the settings API. A blank API-key field preserves the current key. Only ADMIN accounts can read or change these settings. Notifications start disabled and no Resend credentials are bundled.

Back up the encryption key separately with restricted access alongside the database backup. Losing or replacing it makes the saved provider credential unreadable: restore the matching key or save a new Resend credential. Do not rotate it casually. Database encryption does not protect against a compromised application server with access to both the database and environment key. Use HTTPS for the staff portal outside localhost.

Apply the new additive migration using the guarded `npm run db:migrate:deploy`, then regenerate Prisma with `npm run db:generate` and restart the API. Never run seed as part of an upgrade. See [operations](operations.md) for backup and safe migration guidance.

## Provider reference

- [Send Email API](https://resend.com/docs/api-reference/emails/send-email): HTTPS REST API, Bearer key, `from`, `to`, `subject`, `text`, optional `reply_to`.
- [Idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys): provider deduplication lasts 24 hours; it is not a permanent exactly-once delivery guarantee.

No SMTP hostname, port, or password is needed for this API integration.

## Queue behavior and troubleshooting

The API process checks the persisted queue serially, with a one-second pause between work cycles. Multiple API processes coordinate through a PostgreSQL advisory transaction lock. Each job freezes its sender, recipient, subject and text, and uses a stable provider idempotency key so a retry does not become a new message. Settings changes apply to newly queued messages; they do not rewrite an existing retry's payload.

Temporary provider/network failures and rate limits use bounded exponential retry delays. Jobs stop retrying after seven attempts or once they are 23 hours old, within Resend's 24-hour idempotency window. Permanent provider rejections are not retried automatically. Disabling notifications, removing the key, or making a recipient ineligible cancels a pending job when processed. A request already accepted by Resend cannot be recalled. These policies prioritize avoiding duplicate notifications over indefinite redelivery.

`LeadEmailJob` stores sanitized status codes (`PENDING`, `SENT`, `FAILED`, `CANCELLED`) and `lastStatus`; provider error bodies and API keys are not stored in queue rows. `SENT` means accepted by Resend, not proven inbox delivery. Operators can inspect counts without exposing message content:

```sql
SELECT status, "lastStatus", count(*)
FROM "LeadEmailJob"
GROUP BY status, "lastStatus";
```

For rejection, check API-key permissions, verified sender/domain, and Resend quota/status. For configuration errors, check the server's encryption key without printing it. There is no automatic retry of terminal failed/cancelled jobs and no webhook-based delivery/bounce tracking in this feature.

Queue payloads contain personal information and persist independently of lead deletion. No automatic retention purge is configured. Include these records in your data-retention/deletion process and protect database backups accordingly.
