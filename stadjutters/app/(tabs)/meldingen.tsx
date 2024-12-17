import { Image, StyleSheet, Platform, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {useSession} from "@/app/SessionContext";



export default function NotificationsScreen() {
  const { session } = useSession();

  return (
    <View style={styles.kikker}>
      <ThemedText>Meldingen</ThemedText>
      {session && session.user ? (
          <ThemedText>Welcome, {session.user.email}!</ThemedText> // Adjust to session.user.username if available
      ) : (
          <ThemedText>Log in om je meldingen te bekijken!</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kikker: {
    display: 'flex',
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
});
