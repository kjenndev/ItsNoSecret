# Administrator customer deletion

Only active ADMIN accounts may delete customers. Technicians and clients cannot call the deletion endpoint; hiding a button is not the security boundary.

## Staff portal

- **Customers list:** use the red delete action next to the customer.
- **Customer details:** use **Delete customer**.
- Confirm the named customer in the warning dialog. Cancel makes no deletion request. Controls are disabled while deletion is pending.
- After success, the list refreshes (including pagination when the final item disappears), or the details page returns to the list. A failed deletion leaves the dialog open with an error.

## Permanent deletion scope

`DELETE /api/crm/customers/:id` deletes, in one transaction:

1. Comments on every ticket belonging to the customer, including internal and customer-visible comments.
2. All of the customer's tickets, regardless of status.
3. The customer record.

Converted leads are retained, with the customer link removed. Historical conversion status/time remain intact; the lead’s `updatedAt` reflects the unlink operation. a historical converted lead cannot be re-converted to silently recreate its deleted customer. An associated login account is **not** deleted, deactivated, or modified. Its customer association disappears with the customer record. Unrelated customers, tickets, comments, leads, users and email settings are not deleted.

This is not an archive and has no in-app undo. The confirmation explicitly warns about service-history deletion. A database error rolls back all deletion steps. Concurrent conflicting operations may fail safely and require a retry rather than deleting a partial set of data.

Retained lead records, email queue payloads and backups may still contain customer contact information. This action is not a comprehensive personal-data erasure workflow. Account deletion, retention policies and backup handling are separate administrative decisions.

## API responses

- `204`: deleted.
- `401`: missing/invalid/inactive session.
- `403`: authenticated caller is not an administrator.
- `404`: customer no longer exists.
- Failure: no partial deletion; safe error response.

Apply the new forward migration using the guarded `npm run db:migrate:deploy` before restarting the API. It permits a converted lead to retain its conversion timestamp after the customer link is removed, while still rejecting inconsistent conversion states. Existing migration files are unchanged. Take a protected backup and rehearse the upgrade first. Do not run seed. Never test deletion on live customer records; use an isolated disposable database.
