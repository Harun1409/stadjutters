import { Image, StyleSheet, Platform, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import 'react-native-gesture-handler';


export default function HomeScreen() {
  return (
    <View style={styles.kikker}>
      <ThemedText>Home</ThemedText>
      {/*<Link href="/explore" style={{ color: 'blue'}}>explore</Link>*/}
      {/*<Link href="/login" style={{ color: 'blue'}}>login</Link>*/}
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
