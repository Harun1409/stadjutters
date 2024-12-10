import { Image, StyleSheet, Platform, View, Text,TextInput,Button } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';


export default function HomeScreen({}) {
  return (
    <View style={styles.kikker}>
      <ThemedText>Mijn beoordelingen</ThemedText>
      <Button title='beoordeling plaatsen'
       // onPress={() => navigation.navigate('beoordelingPlaatsen')}
      >
      </Button>
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
  text: {
    fontSize: 20,
    color: 'black',
  },
  
});
