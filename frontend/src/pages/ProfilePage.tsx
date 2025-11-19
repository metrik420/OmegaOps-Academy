/**
 * FILE: frontend/src/pages/ProfilePage.tsx
 * PURPOSE: User profile page (protected route, /profile).
 * FEATURES: User info, change password, export data (GDPR), delete account
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useLogout, useExportData } from '../contexts/AuthContext';
import { ChangePasswordForm } from '../components/auth/ChangePasswordForm';
import { ConfirmDeleteAccountModal } from '../components/modals/ConfirmDeleteAccountModal';
import { LogoutConfirmModal } from '../components/modals/LogoutConfirmModal';
import styles from './ProfilePage.module.css';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { execute: logout } = useLogout();
  const { execute: exportData, isLoading: exportLoading } = useExportData();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleExportData = async () => {
    try {
      await exportData();
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Profile</h1>
      </div>

      {/* User Info Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Account Information</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{user.email}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Username</span>
            <span className={styles.infoValue}>{user.username}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Status</span>
            <span className={`${styles.infoValue} ${user.isVerified ? styles.verified : styles.unverified}`}>
              {user.isVerified ? '✓ Verified' : '○ Not verified'}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Joined</span>
            <span className={styles.infoValue}>
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
          {user.lastLoginAt && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Last login</span>
              <span className={styles.infoValue}>
                {new Date(user.lastLoginAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Security</h2>
        {!showChangePassword ? (
          <button
            onClick={() => setShowChangePassword(true)}
            className={styles.secondaryButton}
          >
            Change Password
          </button>
        ) : (
          <div>
            <ChangePasswordForm
              onSuccess={() => {
                setShowChangePassword(false);
              }}
            />
            <button
              onClick={() => setShowChangePassword(false)}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Privacy & Data Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Privacy & Data</h2>
        <p className={styles.sectionDescription}>
          Manage your data and privacy settings in accordance with GDPR.
        </p>
        <div className={styles.buttonGroup}>
          <button
            onClick={handleExportData}
            className={styles.secondaryButton}
            disabled={exportLoading}
          >
            {exportLoading ? 'Exporting...' : 'Export My Data'}
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className={styles.dangerButton}
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Logout Section */}
      <div className={styles.section}>
        <button onClick={() => setShowLogoutModal(true)} className={styles.logoutButton}>
          Log out
        </button>
      </div>

      {/* Modals */}
      {showDeleteModal && (
        <ConfirmDeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => {
            setShowDeleteModal(false);
            navigate('/');
          }}
        />
      )}

      {showLogoutModal && (
        <LogoutConfirmModal
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleLogout}
        />
      )}
    </div>
  );
};

export default ProfilePage;
