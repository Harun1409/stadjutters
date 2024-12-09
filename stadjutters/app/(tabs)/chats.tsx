// /apps/(tabs)/chats.tsx
import { Image, StyleSheet, Platform, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSession } from '@/app/SessionContext'; // Needed to get session information (id,email etc)

export default function ChatsScreen() {
  const { session } = useSession();

  return (
    <View style={styles.kikker}>
      {/*<ThemedText>Chats</ThemedText>*/}
      {session && session.user ? (
        <ThemedText>Welcome, {session.user.email}!</ThemedText> // Adjust to session.user.username if available
      ) : (
          <ThemedText>Log in om je chats te bekijken!</ThemedText>
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
