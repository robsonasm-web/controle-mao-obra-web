import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ProtectedPage({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Carregando...</div>;
  if (!user) return <div>Você precisa estar logado.</div>;
  return <>{children}</>;
}
