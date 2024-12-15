import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Button } from 'react-native';
import StarRating from 'react-native-star-rating-widget';

export default function BeoordelingPlaatsen() {
  const [rating, setRating] = useState(0); // Sterrenbeoordeling
  const [description, setDescription] = useState(''); // Beschrijving

  const handleSubmit = () => {
    // Actie wanneer de beoordeling wordt ingediend
    console.log(`Rating: ${rating}`);
    console.log(`Beschrijving: ${description}`);
    alert(`Beoordeling ingediend! Score: ${rating}, Beschrijving: "${description}"`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plaats je Beoordeling</Text>
      
      {/* Sterrenbeoordeling */}
      <StarRating
        rating={rating}
        onChange={setRating}
        starSize={30} // Grootte van de sterren
        color="#FFD700" // Kleur van de sterren
      />
      {/* <Text style={styles.label}>Je hebt {rating} sterren gegeven.</Text> */}

      {/* Beschrijving */}
      <TextInput
        style={styles.input}
        placeholder="Schrijf hier je beoordeling..."
        multiline
        value={description}
        onChangeText={setDescription}
      />

      {/* Indienen */}
      <Button title="Beoordeling Indienen" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    alignItems:"baseline",
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginVertical: 10,
  },
  input: {
    height: 100,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 20,
    marginBottom: 20,
    textAlignVertical: 'top', // Zorgt ervoor dat de tekst bovenaan begint
  },
});