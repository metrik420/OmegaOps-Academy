# OmegaOps Academy - Authentication Flow Diagrams

Visual guide to understand authentication flows.

---

## Registration Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION FLOW                      │
└────────────────────────────────────────────────────────────────┘

1. User navigates to /register
   │
   ├─▶ RegisterPage renders RegisterForm
   │
   ├─▶ User fills form:
   │   • Email
   │   • Username
   │   • Password (strength meter shows real-time feedback)
   │   • Confirm password
   │   • Accept Terms checkbox
   │   • Accept Privacy Policy checkbox ✓ (required)
   │
   ├─▶ User submits form
   │
   ├─▶ Frontend validates with Zod
   │   ├─ Invalid → Show validation errors
   │   └─ Valid → Continue
   │
   ├─▶ Frontend calls: POST /api/auth/register
   │
   ├─▶ Backend:
   │   • Validates input (email unique, password strong)
   │   • Creates user (isVerified = false)
   │   • Sends verification email with token
   │   • Returns success response
   │
   ├─▶ Frontend:
   │   • Shows success message
   │   • Redirects to /login with message:
   │     "Account created! Check your email to verify."
   │
   └─▶ User checks email, clicks verification link

2. Email verification
   │
   ├─▶ User clicks link: /verify-email/:token
   │
   ├─▶ VerifyEmailPage auto-verifies on load
   │
   ├─▶ Frontend calls: POST /api/auth/verify-email
   │   { token: "..." }
   │
   ├─▶ Backend:
   │   • Validates token (not expired, not used)
   │   • Updates user (isVerified = true)
   │   • Invalidates token
   │
   ├─▶ Frontend:
   │   • Shows success message
   │   • Redirects to /login after 2 seconds
   │
   └─▶ User can now log in
```

---

## Login Flow

```
┌────────────────────────────────────────────────────────────────┐
│                       USER LOGIN FLOW                          │
└────────────────────────────────────────────────────────────────┘

1. User navigates to /login
   │
   ├─▶ LoginPage renders LoginForm
   │
   ├─▶ User fills form:
   │   • Email
   │   • Password
   │   • Remember me checkbox (optional)
   │
   ├─▶ User submits form
   │
   ├─▶ Frontend validates with Zod
   │   ├─ Invalid → Show validation errors
   │   └─ Valid → Continue
   │
   ├─▶ Frontend calls: POST /api/auth/login
   │   {
   │     email: "...",
   │     password: "...",
   │     rememberMe: true/false
   │   }
   │
   ├─▶ Backend:
   │   • Validates credentials (email exists, password correct)
   │   • Generates tokens:
   │     - accessToken (15 min TTL)
   │     - refreshToken (7 days if rememberMe, else 24 hours)
   │     - csrfToken
   │   • Updates lastLoginAt
   │   • Returns:
   │     {
   │       user: { id, email, username, isVerified, profile, ... },
   │       accessToken: "...",
   │       refreshToken: "...",
   │       csrfToken: "...",
   │       expiresAt: "2025-11-17T12:15:00Z"
   │     }
   │
   ├─▶ Frontend (authStore):
   │   • Stores user in state
   │   • Stores tokens in localStorage
   │   • Sets isAuthenticated = true
   │   • Sets isAdmin = (user.username === 'metrik')
   │   • Starts auto-refresh timer (checks every 5 minutes)
   │
   └─▶ Frontend redirects to:
       • Intended route (if came from ProtectedRoute)
       • OR /dashboard

2. Auto-refresh (background, every 5 minutes)
   │
   ├─▶ Timer checks if token expires within 10 minutes
   │   ├─ No → Do nothing
   │   └─ Yes → Continue
   │
   ├─▶ Frontend calls: POST /api/auth/refresh
   │   { refreshToken: "..." }
   │
   ├─▶ Backend:
   │   • Validates refreshToken (not expired, not revoked)
   │   • Generates new tokens:
   │     - accessToken (new 15 min TTL)
   │     - refreshToken (new expiry)
   │     - csrfToken (rotated)
   │   • Returns new tokens
   │
   ├─▶ Frontend:
   │   • Updates tokens in state + localStorage
   │   • User session continues uninterrupted
   │
   └─▶ Repeat every 5 minutes
```

---

## Password Reset Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    PASSWORD RESET FLOW                         │
└────────────────────────────────────────────────────────────────┘

1. Forgot password request
   │
   ├─▶ User navigates to /forgot-password
   │
   ├─▶ ForgotPasswordPage renders ForgotPasswordForm
   │
   ├─▶ User enters email
   │
   ├─▶ User submits form
   │
   ├─▶ Frontend calls: POST /api/auth/forgot-password
   │   { email: "..." }
   │
   ├─▶ Backend:
   │   • Checks if email exists
   │   • Generates password reset token (1 hour TTL)
   │   • Sends email with reset link:
   │     /reset-password/:token
   │   • Returns success (even if email doesn't exist, for security)
   │
   ├─▶ Frontend:
   │   • Shows success message:
   │     "If an account exists for this email, you will receive
   │      a password reset link shortly."
   │
   └─▶ User checks email, clicks reset link

2. Reset password
   │
   ├─▶ User clicks link: /reset-password/:token
   │
   ├─▶ ResetPasswordPage renders ResetPasswordForm
   │
   ├─▶ User enters:
   │   • New password (strength meter shows real-time feedback)
   │   • Confirm password
   │
   ├─▶ User submits form
   │
   ├─▶ Frontend calls: POST /api/auth/reset-password
   │   {
   │     token: "...",
   │     newPassword: "..."
   │   }
   │
   ├─▶ Backend:
   │   • Validates token (not expired, not used)
   │   • Validates password strength
   │   • Hashes new password (Argon2id)
   │   • Updates user password
   │   • Invalidates reset token
   │   • Invalidates all existing refresh tokens (force re-login)
   │
   ├─▶ Frontend:
   │   • Shows success message
   │   • Redirects to /login with message:
   │     "Password reset successful! Please log in."
   │
   └─▶ User logs in with new password
```

---

## Authenticated Request Flow

```
┌────────────────────────────────────────────────────────────────┐
│                  AUTHENTICATED REQUEST FLOW                    │
└────────────────────────────────────────────────────────────────┘

1. User makes authenticated request (e.g., change password)
   │
   ├─▶ Component calls hook: useChangePassword()
   │
   ├─▶ Hook executes operation:
   │   {
   │     currentPassword: "...",
   │     newPassword: "..."
   │   }
   │
   ├─▶ Frontend calls: POST /api/auth/change-password
   │   Headers:
   │   • Authorization: Bearer <accessToken>
   │   • X-CSRF-Token: <csrfToken>
   │   Body:
   │   {
   │     currentPassword: "...",
   │     newPassword: "..."
   │   }
   │
   ├─▶ Backend validates:
   │   ├─ Access token valid? (JWT signature, expiry)
   │   ├─ CSRF token valid? (matches session)
   │   ├─ Current password correct?
   │   └─ New password strong enough?
   │
   ├─▶ Backend responds:
   │   ├─ 200 OK → Success
   │   ├─ 401 Unauthorized → Token expired/invalid
   │   ├─ 403 Forbidden → CSRF token invalid
   │   └─ 400 Bad Request → Validation error
   │
   ├─▶ Frontend handles response:
   │   ├─ 200 OK → Show success message
   │   ├─ 401/403 → Auto-logout, redirect to /login
   │   └─ 400 → Show error message
   │
   └─▶ Operation complete
```

---

## Auto-Logout on Token Expiration

```
┌────────────────────────────────────────────────────────────────┐
│                 AUTO-LOGOUT ON 401/403 FLOW                    │
└────────────────────────────────────────────────────────────────┘

1. User makes authenticated request
   │
   ├─▶ Frontend sends request with accessToken
   │
   ├─▶ Backend validates token:
   │   ├─ Valid → Process request
   │   └─ Expired/Invalid → Return 401 Unauthorized
   │
   ├─▶ Frontend receives 401 response
   │
   ├─▶ fetchAPI() helper detects 401 in authStore.ts
   │
   ├─▶ Auto-logout triggered:
   │   • Clear user from state
   │   • Clear tokens from localStorage
   │   • Set isAuthenticated = false
   │
   ├─▶ Frontend redirects to /login
   │   • Shows message: "Session expired. Please log in again."
   │
   └─▶ User must log in again
```

---

## Protected Route Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    PROTECTED ROUTE FLOW                        │
└────────────────────────────────────────────────────────────────┘

1. User navigates to protected route (e.g., /dashboard)
   │
   ├─▶ React Router matches route:
   │   <Route path="/dashboard" element={
   │     <ProtectedRoute>
   │       <DashboardPage />
   │     </ProtectedRoute>
   │   } />
   │
   ├─▶ ProtectedRoute component renders
   │
   ├─▶ ProtectedRoute checks: isAuthenticated
   │   │
   │   ├─ YES (authenticated):
   │   │   └─▶ Render children (DashboardPage)
   │   │
   │   └─ NO (not authenticated):
   │       └─▶ Redirect to /login
   │           • Store intended route in state
   │           • User sees login page
   │
   └─▶ After login:
       • Frontend checks location state
       • Redirects to intended route (/dashboard)
```

---

## Admin Route Flow

```
┌────────────────────────────────────────────────────────────────┐
│                      ADMIN ROUTE FLOW                          │
└────────────────────────────────────────────────────────────────┘

1. User navigates to admin route (e.g., /admin)
   │
   ├─▶ React Router matches route:
   │   <Route path="/admin" element={
   │     <AdminRoute>
   │       <AdminPage />
   │     </AdminRoute>
   │   } />
   │
   ├─▶ AdminRoute component renders
   │
   ├─▶ AdminRoute checks:
   │   • isAuthenticated?
   │   • isAdmin? (user.username === 'metrik')
   │   │
   │   ├─ YES (authenticated AND admin):
   │   │   └─▶ Render children (AdminPage)
   │   │
   │   └─ NO (not authenticated OR not admin):
   │       └─▶ Redirect to /admin/login
   │           • User sees admin login page
   │
   └─▶ After admin login:
       • Frontend verifies username === 'metrik'
       • Redirects to /admin
```

---

## Logout Flow

```
┌────────────────────────────────────────────────────────────────┐
│                        LOGOUT FLOW                             │
└────────────────────────────────────────────────────────────────┘

1. User clicks logout button
   │
   ├─▶ LogoutConfirmModal appears:
   │   "Are you sure you want to log out?"
   │   [Cancel] [Logout]
   │
   ├─▶ User clicks "Logout"
   │
   ├─▶ Frontend calls: POST /api/auth/logout
   │   { refreshToken: "..." }
   │
   ├─▶ Backend:
   │   • Validates refreshToken
   │   • Invalidates refreshToken in database
   │   • Returns success
   │
   ├─▶ Frontend (even if backend call fails):
   │   • Clear user from state
   │   • Clear tokens from localStorage
   │   • Set isAuthenticated = false
   │   • Set isAdmin = false
   │
   ├─▶ Frontend redirects to /login
   │
   └─▶ User sees login page
```

---

## GDPR Data Export Flow

```
┌────────────────────────────────────────────────────────────────┐
│                   GDPR DATA EXPORT FLOW                        │
└────────────────────────────────────────────────────────────────┘

1. User navigates to /profile
   │
   ├─▶ ProfilePage renders
   │
   ├─▶ User clicks "Export My Data"
   │
   ├─▶ Frontend calls: GET /api/auth/export-data
   │   Headers:
   │   • Authorization: Bearer <accessToken>
   │   • X-CSRF-Token: <csrfToken>
   │
   ├─▶ Backend:
   │   • Validates authentication
   │   • Collects all user data:
   │     - User profile
   │     - Missions completed
   │     - Progress data
   │     - Activity logs
   │     - Any other personal data
   │   • Returns JSON response
   │
   ├─▶ Frontend:
   │   • Receives data
   │   • Creates JSON blob
   │   • Triggers download:
   │     omegaops-data-export-2025-11-17T12:00:00Z.json
   │
   └─▶ User has exported data (GDPR compliance)
```

---

## GDPR Account Deletion Flow

```
┌────────────────────────────────────────────────────────────────┐
│                 GDPR ACCOUNT DELETION FLOW                     │
└────────────────────────────────────────────────────────────────┘

1. User navigates to /profile
   │
   ├─▶ ProfilePage renders
   │
   ├─▶ User clicks "Delete Account"
   │
   ├─▶ ConfirmDeleteAccountModal appears:
   │   ⚠️ This action cannot be undone
   │
   │   Type your email to confirm: user@example.com
   │   [________________]
   │
   │   Enter your password to confirm:
   │   [••••••••]
   │
   │   [Cancel] [Delete Account]
   │
   ├─▶ User types email + password, clicks "Delete Account"
   │
   ├─▶ Frontend calls: DELETE /api/auth/delete-account
   │   Headers:
   │   • Authorization: Bearer <accessToken>
   │   • X-CSRF-Token: <csrfToken>
   │   Body:
   │   { password: "..." }
   │
   ├─▶ Backend:
   │   • Validates authentication
   │   • Validates password
   │   • Exports all user data (stored for 30 days)
   │   • Deletes user account and all associated data:
   │     - User profile
   │     - Missions progress
   │     - Activity logs
   │     - Sessions/tokens
   │   • Returns success
   │
   ├─▶ Frontend:
   │   • Auto-logout (clear tokens)
   │   • Redirect to / (home page)
   │   • Show message: "Account deleted. Goodbye!"
   │
   └─▶ Account permanently deleted (GDPR compliance)
```

---

## Token Storage & Persistence

```
┌────────────────────────────────────────────────────────────────┐
│               TOKEN STORAGE & PERSISTENCE                      │
└────────────────────────────────────────────────────────────────┘

localStorage (key: "omegaops-auth")
├─ state
│  ├─ user: {
│  │    id: 1,
│  │    email: "user@example.com",
│  │    username: "johndoe",
│  │    isVerified: true,
│  │    createdAt: "2025-11-01T...",
│  │    lastLoginAt: "2025-11-17T...",
│  │    profile: { xp: 500, level: 3, streak: 7, ... }
│  │  }
│  ├─ accessToken: "eyJhbGc..."
│  ├─ refreshToken: "eyJhbGc..."
│  ├─ csrfToken: "abc123..."
│  ├─ isAuthenticated: true
│  └─ isAdmin: false
│
└─ version: 0

On page refresh:
1. Zustand persist middleware loads state from localStorage
2. authStore initializes with persisted state
3. Auto-refresh timer starts (if authenticated)
4. User session continues seamlessly
```

---

## Security Considerations Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                   SECURITY LAYERS                              │
└────────────────────────────────────────────────────────────────┘

Frontend Security:
├─ Input Validation (Zod)
│  └─▶ Email format, password strength, required fields
├─ CSRF Protection
│  └─▶ X-CSRF-Token header on state-changing requests
├─ XSS Prevention
│  └─▶ React auto-escapes, no dangerouslySetInnerHTML
├─ Token Management
│  └─▶ Short-lived access tokens, auto-refresh, auto-logout on expiry
└─ Error Handling
   └─▶ User-safe messages, no sensitive data in logs

Backend Security (expected):
├─ Input Validation
│  └─▶ Validate all inputs server-side (defense in depth)
├─ Password Hashing
│  └─▶ Argon2id (preferred) or bcrypt
├─ Token Validation
│  └─▶ JWT signature, expiry, refresh token revocation
├─ CSRF Token Validation
│  └─▶ Match session CSRF token
├─ Rate Limiting
│  └─▶ Login attempts, password resets, API requests
└─ HTTPS Enforcement
   └─▶ All production traffic over HTTPS

Defense in Depth:
Frontend validation → Backend validation → Database constraints
```

---

This visual guide complements the implementation documentation.
For code examples and integration steps, see `FRONTEND_AUTH_IMPLEMENTATION.md`.

**Copyright:** 2025 OmegaOps Academy
