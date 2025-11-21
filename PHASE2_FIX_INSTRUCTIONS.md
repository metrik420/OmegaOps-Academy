# Phase 2: Critical Fixes Checklist

**Status:** Backend blocked by 28 TypeScript errors  
**Estimated Fix Time:** 4-6 hours  
**Priority:** P0 (blocks everything)

---

## Fix 1: AuthService Method Calls (2-3 hours)

### Problem
AuthService methods are `static` but auth.ts calls them as instance methods.

### Solution: Option A (Recommended - Static Calls)

Replace all instance method calls with static method calls in `/home/metrik/docker/learn/backend/src/api/routes/auth.ts`:

**Line 49:** Remove instance creation
```typescript
// DELETE THIS LINE:
const authService = new AuthService();
```

**Replace all `authService.METHOD()` with `AuthService.METHOD()`:**

```typescript
// Line 123: Register
- const result = await authService.register({
+ const result = await AuthService.register({

// Line 261: Login
- const result = await authService.login({
+ const result = await AuthService.login({

// Line 426: Admin Login
- const result = await authService.adminLogin({
+ const result = await AuthService.adminLogin({

// Line 566: Refresh Token (ALSO FIX METHOD NAME)
- const result = await authService.refreshAccessToken(validatedData.refreshToken);
+ const result = await AuthService.refreshToken(validatedData.refreshToken);

// Line 686: Logout
- await authService.logout(userId, refreshToken);
+ await AuthService.logout(refreshToken);

// Line 760: Logout All
- await authService.logoutAll(userId);
+ await AuthService.logoutAll(userId);

// Line 820: Verify Email
- const user = await authService.verifyEmail(validatedData.token);
+ const user = await AuthService.verifyEmail(validatedData.token);

// Line 941: Resend Verification
- const user = await authService.resendVerificationEmail(userId);
+ const user = await AuthService.resendVerificationEmail(userId);

// Line 1059: Forgot Password
- const token = await authService.forgotPassword(validatedData);
+ const token = await AuthService.forgotPassword(validatedData);

// Line 1162: Reset Password
- await authService.resetPassword({
+ await AuthService.resetPassword({

// Line 1289: Change Password
- await authService.changePassword(userId, {
+ await AuthService.changePassword(userId, {

// Line 1473: Export User Data
- const data = await authService.exportUserData(userId);
+ const data = await AuthService.exportUserData(userId);

// Line 1541: Delete Account
- await authService.deleteAccount(userId);
+ await AuthService.deleteAccount(userId);
```

### Test Fix
```bash
cd /home/metrik/docker/learn/backend
npm run build
# Should compile without the 24 "authService is not defined" errors
```

---

## Fix 2: Add Missing Zod Schemas (30 minutes)

### Problem
auth.ts imports `resendVerificationSchema` and `deleteAccountSchema` but they don't exist in auth.types.ts

### Solution

Add to `/home/metrik/docker/learn/backend/src/types/auth.types.ts` at the end (after line 260):

```typescript
/**
 * ==========================================================================
 * RESEND VERIFICATION SCHEMA
 * ==========================================================================
 * Validates request to resend email verification token.
 */
export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

/**
 * ==========================================================================
 * DELETE ACCOUNT SCHEMA
 * ==========================================================================
 * Validates account deletion request (requires password confirmation).
 */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password required'),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
```

### Test Fix
```bash
cd /home/metrik/docker/learn/backend
npm run build
# Should compile without the 2 "has no exported member" errors
```

---

## Fix 3: Reset Password Parameter Names (15 minutes)

### Problem
resetPasswordSchema returns `{ password, confirmPassword }` but code accesses `newPassword`

### Solution

In `/home/metrik/docker/learn/backend/src/api/routes/auth.ts`:

**Line 1150-1151:** Fix password comparison
```typescript
// BEFORE:
if (validatedData.newPassword !== validatedData.confirmPassword) {

// AFTER:
if (validatedData.password !== validatedData.confirmPassword) {
```

**Line 1164:** Fix parameter passed to AuthService
```typescript
// BEFORE:
await authService.resetPassword({
  token: validatedData.token,
  newPassword: validatedData.newPassword,
});

// AFTER:
await AuthService.resetPassword({
  token: validatedData.token,
  password: validatedData.password,
});
```

**Note:** Check that `AuthService.resetPassword()` in AuthService.ts expects:
```typescript
public static async resetPassword(input: ResetPasswordInput): Promise<void>
// where ResetPasswordInput = { token, password, confirmPassword }
```

---

## Fix 4: Change Password Parameter Names (15 minutes)

### Problem
changePasswordSchema returns `{ currentPassword, newPassword, confirmNewPassword }` but code checks `confirmPassword`

### Solution

In `/home/metrik/docker/learn/backend/src/api/routes/auth.ts`:

**Line 1277:** Fix password comparison
```typescript
// BEFORE:
if (validatedData.newPassword !== validatedData.confirmPassword) {

// AFTER:
if (validatedData.newPassword !== validatedData.confirmNewPassword) {
```

---

## Fix 5: Unused Variable (5 minutes)

### Problem
authMiddleware.ts has unused `res` parameter

### Solution

In `/home/metrik/docker/learn/backend/src/api/middleware/authMiddleware.ts` line 167:

```typescript
// BEFORE:
private static (res: Response): void {

// AFTER (prefix with underscore to indicate intentionally unused):
private static (_res: Response): void {
```

---

## Fix 6: EmailService Method Calls (10 minutes)

### Problem
auth.ts line 133, 945, 1063 call `emailService.METHOD()` but EmailService has static methods

### Solution

In `/home/metrik/docker/learn/backend/src/api/routes/auth.ts`:

```typescript
// Line 133: Resend verification email
// BEFORE:
try {
  await emailService.sendVerificationEmail(...)
} catch (emailError) {

// AFTER:
try {
  await EmailService.sendVerificationEmail(...)
} catch (emailError: unknown) {  // Add type

// Line 945: Same pattern
try {
  await EmailService.sendVerificationEmail(...)
} catch (emailError: unknown) {

// Line 1063: Reset password email
try {
  await EmailService.sendPasswordResetEmail(...)
} catch (emailError: unknown) {
```

Also remove instance creation:
```typescript
// DELETE THIS LINE (around line 51):
const emailService = new EmailService();
```

---

## Validation Script

After all fixes, run:

```bash
cd /home/metrik/docker/learn/backend

# Check TypeScript compilation
npm run build

# If successful, you should see:
# > tsc
# (no errors, command exits with code 0)

# Count remaining errors:
npm run build 2>&1 | grep "error TS" | wc -l
# Should be: 0
```

---

## Testing the Fixes

Once TypeScript compilation succeeds:

```bash
cd /home/metrik/docker/learn/backend

# Install dependencies (if not already installed)
npm install

# Start the backend
npm run dev

# Expected output:
# [info] Starting OmegaOps Academy API server...
# [info] Initializing database...
# [info] Database initialized successfully
# [info] Seeding database with sample data...
# [info] Database seeded successfully
# [info] Server is running on port 3001
```

### Verify Database Created
```bash
ls -lh /home/metrik/docker/learn/data/omegaops.db
# Should show file with size > 100KB
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Get missions (should return empty array until seeded)
curl http://localhost:3001/api/missions

# Should get JSON responses (not errors)
```

---

## Summary of Files to Modify

| File | Changes | Lines | Time |
|------|---------|-------|------|
| auth.ts | Replace authService calls with AuthService (static) | 10+ | 30m |
| auth.types.ts | Add 2 missing schemas | +15 | 30m |
| auth.ts | Fix password parameter names | 3 | 15m |
| authMiddleware.ts | Mark unused variable | 1 | 5m |
| auth.ts | Fix EmailService calls | 4 | 10m |
| **TOTAL** | | | **90 minutes** |

---

## Troubleshooting

### Error: "authService is not defined"
Solution: Remove `const authService = new AuthService();` and use `AuthService.METHOD()`

### Error: "has no exported member 'resendVerificationSchema'"
Solution: Add both schemas to auth.types.ts

### Error: "Property 'newPassword' does not exist"
Solution: Use correct property names (password for resetPasswordSchema, confirmNewPassword for changePasswordSchema)

### Database not initializing after fixes
Solution: Make sure `SEED_DATABASE_ON_STARTUP=true` in .env and backend starts without errors

### Port 3001 already in use
Solution: Kill existing process: `lsof -i :3001 | grep -v PID | awk '{print $2}' | xargs kill -9`

---

**Estimated Total Time: 2-3 hours**  
**Then: 15 minutes to initialize database and verify**

Next step: Database seeding (Week 2-12 curriculum)
