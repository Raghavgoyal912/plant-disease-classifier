"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthValue = { session: Session | null; signOut: () => Promise<void> };

const AuthContext = createContext<AuthValue>({
  session: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Wraps the whole app. Signed out -> /login. Signed in on /login -> /.
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const onLogin = pathname === "/login";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!session && !onLogin) router.replace("/login");
    if (session && onLogin) router.replace("/");
  }, [ready, session, onLogin, router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // Blank screen while the session loads or a redirect is in flight,
  // so protected pages never fire API calls without a token.
  if (!ready || (!session && !onLogin) || (session && onLogin)) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <AuthContext.Provider value={{ session, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}