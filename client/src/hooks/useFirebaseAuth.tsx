import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        try {
          // Check for custom token first, then fallback to anonymous
          if (import.meta.env.VITE_INITIAL_AUTH_TOKEN) {
            await signInWithCustomToken(auth, import.meta.env.VITE_INITIAL_AUTH_TOKEN);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Authentication Error:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
