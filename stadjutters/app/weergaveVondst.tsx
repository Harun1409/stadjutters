import { Image, StyleSheet, Platform, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {useSession} from './SessionContext';
import {supabase} from '@/lib/supabase';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ThemedText>weergaveVondst</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
});
