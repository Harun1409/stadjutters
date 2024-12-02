import { useState, useEffect } from 'react'; //supabase
import { StyleSheet, View } from 'react-native';
import { supabase } from '../lib/supabase'; //supabase
import Auth from '../components/Auth'; //supabase
import Account from '../components/Account'; //supabase
import { Session } from '@supabase/supabase-js'; //supabase

export default function LoginScreen() {
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
    <View style={styles.container}>
      {session && session.user ? <Account key={session.user.id} session={session} /> : <Auth />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    /*display: 'flex',
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',*/
  },
});
