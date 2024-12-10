import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

export default function HomeScreen() {
  const [text, setText] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Voer je naam in:</Text>
      <TextInput
        style={styles.input}
        placeholder="Type hier..."
        value={text}
        onChangeText={(value) => setText(value)} // Bijwerken van de state
      />
      <Text style={styles.output}>Je hebt getypt: {text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    width: '80%',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  output: {
    fontSize: 16,
    marginTop: 10,
  },
});