# Student password recovery

The website now exposes `/forgot-password` and `/reset-password`. The first posts a validated email to Strapi's native `/api/auth/forgot-password`; the second consumes the emailed `code` with `/api/auth/reset-password`. A successful reset returns the student to sign-in rather than exposing Strapi's returned token to the browser. Missing, malformed and reused reset links show a recovery link. Both routes are excluded from indexing.

## Delivery configuration

Set these server variables using the client's real mail provider, then restart the CMS:

```dotenv
PASSWORD_RESET_URL=https://your-approved-site.example/reset-password
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USERNAME=your-smtp-user
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=your-verified-sender@example.com
EMAIL_FROM_NAME=RS Education
EMAIL_REPLY_TO=your-support-address@example.com
```

These are examples to replace, not configured client values. Port 465 normally uses `SMTP_SECURE=true`; follow the provider's settings. An unauthenticated relay can leave username/password unset. SMTP delivery is enabled only when a host is supplied.

`PASSWORD_RESET_URL` updates only the Users & Permissions **Reset password page** setting on startup. `EMAIL_FROM` updates only the reset-password email's sender and reply address, preserving its authored body and subject. Unset variables leave CMS settings unchanged. The URL must use HTTPS outside localhost and cannot contain a query, fragment or credentials. Keep the default email template's `?code=<%= TOKEN %>` link when editing its message.

Before launch, verify **Users & Permissions → Email templates → Reset password** has the intended RS Education wording and that the provider permits the configured sender. Test delivery with a controlled test account, then confirm the emailed link changes that account's password and the link cannot be reused. No real student email was sent during implementation. Email requests intentionally show the same acknowledgement for known and unknown addresses; delivery failures belong in the CMS logs.

Real SMTP credentials, the final public site URL and delivery verification are still required. Code installation alone does not establish email deliverability.
