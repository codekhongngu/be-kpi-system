# Auth Module DB

## purpose
Identity, authentication artifacts, credential lifecycle.

## entities
- users
- roles
- permissions
- user_roles
- role_permissions
- auth_refresh_tokens
- auth_password_resets

## business rules
- username/email unique.
- token hashes unique.
- password reset token single-use (`used_at`).
- lock account by failed attempts + locked_until.

## relationships
- users M:N roles.
- roles M:N permissions.
- users 1:N refresh_tokens/password_resets.

## state machine
- user status: `active|inactive|suspended`.
- refresh token: active -> revoked/expired.

## permission scope
- `users.manage`, `roles.manage`, `audit.read`.

## query patterns
- login by username/email.
- validate refresh token by hash + expiry + revoked null.
- list users by org/status.

## index strategy
- users(username), users(email), partial users(code).
- auth_refresh_tokens(token_hash), (user_id, expires_at).
- auth_password_resets(token_hash), (user_id, expires_at).

## async jobs/events
- emit `user.login`, `user.locked`, `password.reset.requested`.

## anti-patterns tránh
- luu raw token/password.
- cho phép role soft-deleted v?n du?c assign.
