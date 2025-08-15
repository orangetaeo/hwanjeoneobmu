import { useState, useEffect } from 'react';

// PostgreSQL 기반 인증 시스템 (Firebase 보류)
export function useFirebaseAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // PostgreSQL 기반 개발용 사용자
    const postgresUser = {
      uid: 'dev-user-1', // PostgreSQL과 일치하는 사용자 ID
      email: 'dev@example.com',
      displayName: '개발 사용자'
    };
    
    setUser(postgresUser);
    setLoading(false);
  }, []);

  return { user, loading };
}
