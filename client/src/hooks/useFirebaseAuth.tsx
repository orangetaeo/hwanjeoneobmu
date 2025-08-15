import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For development - create a mock user immediately to bypass Firebase auth issues
    const mockUser = {
      uid: 'demo-user-' + Date.now(),
      email: 'demo@example.com',
      displayName: 'Demo User'
    } as User;
    
    setUser(mockUser);
    setLoading(false);
  }, []);

  return { user, loading };
}
