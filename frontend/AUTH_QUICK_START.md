# Frontend Auth - Quick Start Guide

**5-Minute Integration Guide**

---

## Installation

```bash
cd /home/metrik/docker/learn/frontend
npm install zustand zod react-router-dom
```

---

## Environment Setup

Create `.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

---

## Integration (3 Steps)

### 1. Wrap App in AuthProvider

**File:** `src/main.tsx`

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

### 2. Add Routes

**File:** `src/App.tsx` (see `App.example.tsx`)

```typescript
import { Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/dashboard" element={
    <ProtectedRoute><DashboardPage /></ProtectedRoute>
  } />
</Routes>
```

---

### 3. Use Auth State

```typescript
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.username}!</p>
      ) : (
        <a href="/login">Login</a>
      )}
    </div>
  );
}
```

---

## Testing

```bash
# Start backend (port 3001)
cd /home/metrik/docker/learn/backend
npm run dev

# Start frontend (port 5173)
cd /home/metrik/docker/learn/frontend
npm run dev

# Open browser
open http://localhost:5173
```

**Test Flow:**
1. Register → `/register`
2. Verify email (check email)
3. Login → `/login`
4. Dashboard → `/dashboard`
5. Profile → `/profile`

---

## File Structure

```
frontend/src/
├── store/authStore.ts              # ✅ Zustand state
├── contexts/AuthContext.tsx        # ✅ React context + hooks
├── components/auth/                # ✅ Forms, guards, components
│   ├── ProtectedRoute.tsx
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── ...
├── pages/
│   ├── auth/                       # ✅ Auth pages
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── ...
│   ├── DashboardPage.tsx           # ✅ User dashboard
│   └── ProfilePage.tsx             # ✅ User profile
└── components/modals/              # ✅ Modals
    ├── ConfirmDeleteAccountModal.tsx
    └── LogoutConfirmModal.tsx
```

---

## Key Features

✅ **Zustand state management** with localStorage persistence
✅ **Auto-refresh tokens** (every 5 minutes)
✅ **Protected routes** (user + admin)
✅ **Complete auth UI** (login, register, password reset, email verification)
✅ **User dashboard** and profile management
✅ **GDPR compliance** (data export, account deletion)
✅ **Secure token handling** (CSRF protection)
✅ **Responsive dark theme** (mobile-first)
✅ **Accessible** (WCAG 2.1 AA)

---

## Common Usage Patterns

### Login

```typescript
import { useLogin } from './contexts/AuthContext';

const { execute: login, isLoading, error } = useLogin();

await login({ email, password, rememberMe: true });
```

### Register

```typescript
import { useRegister } from './contexts/AuthContext';

const { execute: register, isLoading, error } = useRegister();

await register({
  email,
  username,
  password,
  acceptPrivacyPolicy: true,
});
```

### Logout

```typescript
import { useLogout } from './contexts/AuthContext';

const { execute: logout } = useLogout();

await logout();
navigate('/login');
```

### Change Password

```typescript
import { useChangePassword } from './contexts/AuthContext';

const { execute: changePassword, isLoading, error, isSuccess } = useChangePassword();

await changePassword({ currentPassword, newPassword });
```

### Export Data (GDPR)

```typescript
import { useExportData } from './contexts/AuthContext';

const { execute: exportData, isLoading } = useExportData();

await exportData(); // Downloads JSON file
```

### Delete Account (GDPR)

```typescript
import { useDeleteAccount } from './contexts/AuthContext';

const { execute: deleteAccount } = useDeleteAccount();

await deleteAccount(password); // Requires password confirmation
```

---

## Troubleshooting

### "Cannot find module './contexts/AuthContext'"
→ Verify `AuthContext.tsx` exists in `src/contexts/`

### "CORS error"
→ Add CORS middleware to backend (allow origin + credentials)

### "Tokens not persisting"
→ Check localStorage, clear and retry: `localStorage.clear()`

### "Password strength meter not updating"
→ Verify `password` prop is passed correctly

---

## Documentation

- **Full Implementation Guide:** `FRONTEND_AUTH_IMPLEMENTATION.md`
- **Integration Checklist:** `INTEGRATION_CHECKLIST.md`
- **Example App:** `App.example.tsx`
- **Example Main:** `main.example.tsx`

---

## Support

- **Issues:** GitHub Issues
- **Email:** metrik@omegaops.com
- **Docs:** `/frontend/FRONTEND_AUTH_IMPLEMENTATION.md`

---

**Copyright:** 2025 OmegaOps Academy
**License:** MIT
**Version:** 1.0.0
