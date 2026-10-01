 # Auth Testing Playbook - Blood Bank & Donor Locator

 ## Verification Steps:
 1. `POST /api/auth/login` with `{"email": "admin@bloodpulse.org", "password": "Admin@123"}` -> Returns 200 OK, user object with role 'admin', and sets JWT token.
 2. `POST /api/auth/login` with `{"email": "donor.john@bloodpulse.org", "password": "Donor@123"}` -> Returns 200 OK with donor profile.
 3. `POST /api/auth/login` with `{"email": "recipient.emily@bloodpulse.org", "password": "Recipient@123"}` -> Returns 200 OK with recipient profile.
 4. `GET /api/auth/me` with Bearer token or cookie -> Returns authenticated user profile.
 5. `POST /api/auth/demo-login` with `{"role": "admin"|"donor"|"recipient"}` -> Fast one-click authentication.