/*This file is designed to manage and provide the user's session state throughout the entire app.
to track the session (logged in or logged out) import this file on the page you need to retrieve this information.
Below an example to show the userid on any given page:
---------------------
import { useSession } from '../SessionContext'; // Adjust the import path as needed

{session && session.user && (
  <ThemedText>Welcome, {session.user.email}!</ThemedText>
)}
--------------------
*/
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; //supabase
import { Session } from '@supabase/supabase-js'; //supabase

interface SessionContextProps {
  session: Session | null;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
}

const SessionContext = createContext<SessionContextProps | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <SessionContext.Provider value={{ session, setSession }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
