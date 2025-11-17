# OmegaOps Academy - Frontend Auth Integration Checklist

**Last Updated:** 2025-11-17

Use this checklist to integrate the frontend authentication layer into your app.

---

## Pre-Integration

- [ ] **Review Documentation**
  - Read `FRONTEND_AUTH_IMPLEMENTATION.md` thoroughly
  - Understand token management flow
  - Review security considerations

- [ ] **Install Dependencies**
  ```bash
  npm install zustand zod react-router-dom
  ```

- [ ] **Set Environment Variables**
  - Create `.env` file:
    ```env
    VITE_API_URL=http://localhost:3001/api
    ```
  - Verify backend API URL is correct

- [ ] **Backup Existing Files**
  - Backup existing `App.tsx` (if any)
  - Backup existing `main.tsx` (if any)
  - Backup existing routing configuration

---

## Integration Steps

### Step 1: File Structure

- [ ] **Verify Directory Structure**
  ```
  frontend/src/
  ├── store/
  │   └── authStore.ts
  ├── contexts/
  │   └── AuthContext.tsx
  ├── components/
  │   ├── auth/
  │   │   ├── ProtectedRoute.tsx
  │   │   ├── AdminRoute.tsx
  │   │   ├── OptionalAuth.tsx
  │   │   ├── LoginForm.tsx
  │   │   ├── RegisterForm.tsx
  │   │   ├── ForgotPasswordForm.tsx
  │   │   ├── ResetPasswordForm.tsx
  │   │   ├── ChangePasswordForm.tsx
  │   │   ├── PasswordStrengthMeter.tsx
  │   │   └── EmailVerificationPrompt.tsx
  │   └── modals/
  │       ├── ConfirmDeleteAccountModal.tsx
  │       └── LogoutConfirmModal.tsx
  ├── pages/
  │   ├── auth/
  │   │   ├── LoginPage.tsx
  │   │   ├── RegisterPage.tsx
  │   │   ├── ForgotPasswordPage.tsx
  │   │   ├── ResetPasswordPage.tsx
  │   │   ├── VerifyEmailPage.tsx
  │   │   └── AdminLoginPage.tsx
  │   ├── DashboardPage.tsx
  │   └── ProfilePage.tsx
  └── FRONTEND_AUTH_IMPLEMENTATION.md
  ```

- [ ] **Verify All Files Present**
  - Run: `find src -type f -name "*.tsx" | wc -l`
  - Expected: ~30 TypeScript files
  - Run: `find src -type f -name "*.css" | wc -l`
  - Expected: ~10 CSS module files

---

### Step 2: Main Entry Point

- [ ] **Update `main.tsx` (or `index.tsx`)**
  - Reference: `main.example.tsx`
  - Wrap app in `<BrowserRouter>`
  - Wrap app in `<AuthProvider>`
  - Verify imports are correct

  ```typescript
  import { BrowserRouter } from 'react-router-dom';
  import { AuthProvider } from './contexts/AuthContext';

  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
  ```

---

### Step 3: App Routes

- [ ] **Update `App.tsx`**
  - Reference: `App.example.tsx`
  - Import all auth pages
  - Import route guards (ProtectedRoute, AdminRoute)
  - Add routes for:
    - `/login` → LoginPage
    - `/register` → RegisterPage
    - `/forgot-password` → ForgotPasswordPage
    - `/reset-password/:token` → ResetPasswordPage
    - `/verify-email/:token` → VerifyEmailPage
    - `/admin/login` → AdminLoginPage
    - `/dashboard` → DashboardPage (protected)
    - `/profile` → ProfilePage (protected)
    - `/admin` → AdminPage (admin-protected)
  - Add root redirect (/ → /login or /dashboard)
  - Add 404 handler

---

### Step 4: Layout (Optional)

- [ ] **Update Layout Component**
  - Add user menu (dropdown with username)
  - Show login/register buttons if not authenticated
  - Show profile/logout links if authenticated
  - Display user XP, level, streak (if available)

  Example:
  ```typescript
  import { useAuth } from './contexts/AuthContext';

  const { user, isAuthenticated } = useAuth();

  {isAuthenticated ? (
    <div>Welcome, {user?.username}!</div>
  ) : (
    <Link to="/login">Login</Link>
  )}
  ```

---

### Step 5: Testing

- [ ] **Test Registration Flow**
  - Navigate to `/register`
  - Fill form with valid data
  - Submit → verify success message
  - Check email for verification link
  - Click link → verify email
  - Verify redirect to `/login`

- [ ] **Test Login Flow**
  - Navigate to `/login`
  - Enter valid credentials
  - Submit → verify redirect to `/dashboard`
  - Verify user info displayed
  - Verify tokens stored in localStorage

- [ ] **Test Protected Routes**
  - While logged out, navigate to `/dashboard`
  - Verify redirect to `/login`
  - Log in → verify redirect back to `/dashboard`

- [ ] **Test Admin Routes**
  - While logged in as regular user, navigate to `/admin`
  - Verify redirect to `/admin/login`
  - Log in as admin (username = "metrik")
  - Verify redirect to `/admin`

- [ ] **Test Password Reset Flow**
  - Navigate to `/forgot-password`
  - Enter email → submit
  - Check email for reset link
  - Click link → verify redirect to `/reset-password/:token`
  - Enter new password → submit
  - Verify redirect to `/login` with success message

- [ ] **Test Profile Management**
  - Log in and navigate to `/profile`
  - Verify user info displayed
  - Test change password
  - Test export data (downloads JSON)
  - Test delete account (with confirmation)

- [ ] **Test Token Refresh**
  - Log in and wait 5 minutes
  - Verify access token refreshes automatically (check network tab)
  - Verify no session interruption

- [ ] **Test Auto-Logout**
  - Manually expire access token (edit localStorage)
  - Make an API call
  - Verify auto-logout and redirect to `/login`

- [ ] **Test Logout**
  - Click logout button
  - Verify confirmation modal appears
  - Confirm logout
  - Verify redirect to `/login`
  - Verify tokens cleared from localStorage

---

### Step 6: Backend Integration

- [ ] **Verify Backend Endpoints**
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/logout`
  - `POST /api/auth/refresh`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
  - `POST /api/auth/change-password`
  - `POST /api/auth/verify-email`
  - `POST /api/auth/resend-verification`
  - `GET /api/auth/export-data`
  - `DELETE /api/auth/delete-account`
  - `POST /api/auth/admin/login`

- [ ] **Verify CORS Configuration**
  - Backend allows origin: `http://localhost:5173` (Vite dev server)
  - Backend allows credentials: `credentials: true`

- [ ] **Verify Response Format**
  - Login/register returns:
    ```json
    {
      "user": { ... },
      "accessToken": "...",
      "refreshToken": "...",
      "csrfToken": "...",
      "expiresAt": "2025-11-17T12:00:00Z"
    }
    ```

- [ ] **Verify Error Format**
  - Errors return:
    ```json
    {
      "message": "User-friendly error message"
    }
    ```

- [ ] **Test All Endpoints**
  - Use Postman or curl to verify each endpoint
  - Verify 401/403 responses trigger auto-logout
  - Verify CSRF token validation

---

### Step 7: Styling

- [ ] **Verify Dark Theme**
  - All pages use dark background
  - Text is readable (contrast >= 4.5:1)
  - Forms use consistent styling

- [ ] **Verify Responsive Design**
  - Test on mobile viewport (< 640px)
  - Verify forms adapt to screen size
  - Verify modals work on mobile

- [ ] **Verify Accessibility**
  - Tab through forms (keyboard navigation)
  - Verify focus states visible
  - Test with screen reader (NVDA, JAWS, VoiceOver)
  - Verify ARIA labels present

---

### Step 8: Production Preparation

- [ ] **Environment Variables**
  - Create `.env.production`:
    ```env
    VITE_API_URL=https://api.omegaops.com
    ```

- [ ] **Security Audit**
  - Verify no tokens logged to console
  - Verify no sensitive data in error messages
  - Verify HTTPS enforced in production
  - Verify CORS restricted to production domain

- [ ] **Performance Audit**
  - Run Lighthouse audit
  - Verify bundle size < 100 KB (auth modules)
  - Verify LCP < 2.5s, FID < 100ms

- [ ] **Error Tracking**
  - Integrate Sentry or LogRocket
  - Test error reporting
  - Verify no PII in error logs

- [ ] **Analytics**
  - Track login/logout events
  - Track registration conversions
  - Track password reset success rate

---

## Post-Integration

- [ ] **Documentation**
  - Update README with auth setup instructions
  - Document environment variables
  - Document backend API requirements

- [ ] **Training**
  - Train team on auth flow
  - Document common issues and solutions
  - Create troubleshooting guide

- [ ] **Monitoring**
  - Set up uptime monitoring (Pingdom, UptimeRobot)
  - Set up error alerts (Sentry)
  - Set up performance monitoring (Web Vitals)

- [ ] **Backlog**
  - Add unit tests (Vitest)
  - Add E2E tests (Playwright)
  - Add visual regression tests (Percy)
  - Plan Phase 2 features (2FA, social login, etc.)

---

## Troubleshooting

### Issue: "Cannot find module './contexts/AuthContext'"

**Solution:**
- Verify `AuthContext.tsx` exists in `src/contexts/`
- Verify import path is correct (relative to file)
- Restart TypeScript server (VSCode: Cmd+Shift+P → Reload Window)

---

### Issue: "Uncaught ReferenceError: process is not defined"

**Solution:**
- This may occur if using `process.env` instead of `import.meta.env`
- Replace all `process.env.VITE_API_URL` with `import.meta.env.VITE_API_URL`

---

### Issue: "CORS error: No 'Access-Control-Allow-Origin' header"

**Solution:**
- Add CORS middleware to backend:
  ```javascript
  const cors = require('cors');
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }));
  ```

---

### Issue: "Tokens not persisting across refreshes"

**Solution:**
- Check browser console for localStorage errors
- Verify Zustand persist middleware is configured
- Clear localStorage and try again: `localStorage.clear()`

---

### Issue: "Password strength meter not updating"

**Solution:**
- Verify `password` prop is passed correctly
- Check React DevTools for component re-renders
- Force re-render by toggling component visibility

---

## Success Criteria

Your integration is successful when:

- ✅ Users can register and verify email
- ✅ Users can log in and access dashboard
- ✅ Protected routes redirect to login when not authenticated
- ✅ Admin routes redirect to admin login when not admin
- ✅ Password reset flow works end-to-end
- ✅ Profile management works (change password, export data, delete account)
- ✅ Tokens auto-refresh without session interruption
- ✅ Auto-logout on token expiration (401/403)
- ✅ All forms validate client-side before submission
- ✅ All pages are responsive and accessible
- ✅ No console errors or warnings
- ✅ Lighthouse score >= 90 (Performance, Accessibility, Best Practices)

---

## Next Steps

After successful integration:

1. **User Acceptance Testing (UAT)**
   - Test with real users
   - Collect feedback
   - Iterate on UX

2. **Load Testing**
   - Simulate 100+ concurrent users
   - Verify token refresh doesn't overwhelm backend
   - Optimize if needed

3. **Security Audit**
   - Penetration testing
   - Vulnerability scanning
   - Fix any issues found

4. **Production Deployment**
   - Deploy backend first
   - Deploy frontend second
   - Verify no breaking changes
   - Monitor for errors

5. **Post-Launch Monitoring**
   - Monitor error rates
   - Monitor login success rates
   - Monitor token refresh success rates
   - Collect user feedback

---

**Questions or Issues?**
- Review `FRONTEND_AUTH_IMPLEMENTATION.md`
- Check GitHub Issues
- Contact: metrik@omegaops.com

---

**Copyright:** 2025 OmegaOps Academy
