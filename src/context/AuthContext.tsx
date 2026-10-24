import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isOfficer: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithGoogleRedirect: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, fullName: string, phone?: string, businessName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Primary bootstrap admin email configured for deployment
const BOOTSTRAP_ADMIN_EMAIL = 'anthonyekong37@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync profile from Firestore
  const syncProfile = async (user: FirebaseUser) => {
    const isDefaultAdmin = user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

    // Default safe fallback profile based on verified Firebase auth user
    const fallbackProfile: UserProfile = {
      id: user.uid,
      fullName: user.displayName || user.email?.split('@')[0] || 'Eket Vendor',
      email: user.email || '',
      phone: user.phoneNumber || '',
      role: isDefaultAdmin ? 'admin' : 'vendor',
      businessName: '',
      lgaOrigin: 'Eket LGA',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      // Check whether user has an authoritative officer or admin document
      let determinedRole: UserRole = isDefaultAdmin ? 'admin' : 'vendor';
      try {
        const [adminSnap, officerSnap] = await Promise.all([
          getDoc(doc(db, 'admins', user.uid)).catch(() => null),
          getDoc(doc(db, 'officers', user.uid)).catch(() => null),
        ]);
        if (isDefaultAdmin || (adminSnap && adminSnap.exists())) {
          determinedRole = 'admin';
        } else if (officerSnap && officerSnap.exists()) {
          determinedRole = 'officer';
        }
      } catch (roleCheckErr) {
        console.warn('Role collection check notice:', roleCheckErr);
      }

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        const targetRole = determinedRole !== 'vendor' ? determinedRole : (data.role || 'vendor');
        if (targetRole !== data.role) {
          const updatedProfile: UserProfile = { ...data, role: targetRole };
          await setDoc(userRef, updatedProfile, { merge: true }).catch(() => {});
          setProfile(updatedProfile);
        } else {
          setProfile(data);
        }
      } else {
        const newProfile: UserProfile = {
          ...fallbackProfile,
          role: determinedRole,
        };

        await setDoc(userRef, newProfile).catch((e) => console.warn('Could not persist new user doc to Firestore:', e));
        setProfile(newProfile);

        if (isDefaultAdmin) {
          const adminRef = doc(db, 'admins', user.uid);
          await setDoc(adminRef, { id: user.uid, email: user.email, addedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Firestore profile sync fallback to authenticated Firebase user:', err);
      setProfile(fallbackProfile);
    }
  };

  useEffect(() => {
    // Process redirect result if returning from signInWithRedirect
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await syncProfile(result.user);
        }
      })
      .catch((err) => {
        // Ignored if not returning from redirect
        if (err?.code !== 'auth/null-user') {
          console.warn('Redirect sign-in notice:', err);
        }
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      try {
        if (user) {
          await syncProfile(user);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.warn('Profile sync error in onAuthStateChanged:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncProfile(result.user);
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogleRedirect = async () => {
    try {
      setLoading(true);
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      console.error('Google Redirect Sign-In failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        await syncProfile(result.user);
      }
    } catch (error) {
      console.error('Email sign-in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signupWithEmail = async (
    email: string,
    pass: string,
    fullName: string,
    phone?: string,
    businessName?: string
  ) => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      await fbUpdateProfile(result.user, { displayName: fullName });

      const isDefaultAdmin = email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      const newProfile: UserProfile = {
        id: result.user.uid,
        fullName,
        email,
        phone: phone || '',
        role: isDefaultAdmin ? 'admin' : 'vendor',
        businessName: businessName || '',
        lgaOrigin: 'Eket LGA',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', result.user.uid), newProfile);
      setProfile(newProfile);
    } catch (error) {
      console.error('Email signup failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
      setProfile(null);
    } catch (error) {
      console.error('Sign-out failed:', error);
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser || !profile) return;
    try {
      const updated = {
        ...profile,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', currentUser.uid), updated, { merge: true });
      setProfile(updated);
    } catch (error) {
      console.error('Profile update failed:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await syncProfile(currentUser);
    }
  };

  const isUserAdmin =
    currentUser?.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() ||
    profile?.role === 'admin';

  const isUserOfficer = profile?.role === 'officer' || isUserAdmin;

  const currentRole: UserRole = isUserAdmin ? 'admin' : (profile?.role || 'vendor');

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        role: currentRole,
        isAdmin: isUserAdmin,
        isOfficer: isUserOfficer,
        loading,
        loginWithGoogle,
        loginWithGoogleRedirect,
        loginWithEmail,
        signupWithEmail,
        logout,
        updateUserProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
