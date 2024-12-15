import { Image, StyleSheet, Platform, View, Text,TextInput,Button,  }  from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useState } from 'react';
import { Link } from 'expo-router';



export default function HomeScreen({}) {
  const [text, setText] = useState('');
  return (
    <View style={styles.container}>
      <ThemedText>Mijn beoordelingen</ThemedText>
      {/* <Text style={styles.label}>hier kan je beoordeling typen</Text> */}
        <TextInput style={styles.inupt}
        placeholder='type hier...'
        // value='text'
        onChangeText={(value) => setText(value)}
        />
        
        <Link href="/beoordelingPlaatsen"  style={styles.output}>beoordeling plaatsen</Link>
      {/* <Button title='beoordeling plaatsen'></Button> */}
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
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
    },
    label: {
      fontSize: 18,
      marginBottom: 10,
    },
    inupt:{
      height: 50,
      borderColor: '#6200ee',
      borderWidth: 2,
      borderRadius: 8,
      paddingHorizontal: 10,
      marginBottom: 12,
    },
    output:{
    fontSize: 16,
    color: 'black',
    marginTop: 10,
    },

    }
);
