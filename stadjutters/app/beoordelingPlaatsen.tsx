import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Button } from 'react-native';
import StarRating from 'react-native-star-rating-widget';
import { supabase } from '../lib/supabase'; // Zorg ervoor dat je de juiste import hebt voor Supabase


export default function BeoordelingPlaatsen() {
  const [rating, setRating] = useState(0); // Sterrenbeoordeling
  const [description, setDescription] = useState(''); // Beschrijving
  const [loading, setLoading] = useState(false); // Voor een laadindicator

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Haal de ingelogde gebruiker-ID op via Supabase auth
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Gebruiker niet ingelogd:', userError);
        alert('Je moet ingelogd zijn om een beoordeling te plaatsen.');
        return;
      }

      const userId = user.id;

      // Voeg beoordeling toe aan de database
      const { data, error } = await supabase
        .from('UserReview') // Tabelnaam in Supabase
        .insert([
          {
            user_id: userId, // Gebruik de ID van de ingelogde gebruiker
            rating: rating, // Kolomnaam in Supabase
            description: description, // Kolomnaam in Supabase
            created_at: new Date().toISOString(), // Tijdstempel
          },
        ]);

      if (error) {
        console.error('Fout bij het toevoegen van beoordeling:', error.message);
        alert('Er ging iets mis bij het indienen van je beoordeling.');
      } else {
        console.log('Beoordeling succesvol toegevoegd:', data);
        alert('Beoordeling succesvol ingediend!');
        // Reset de inputs na succesvolle indiening
        setRating(0);
        setDescription('');
      }
    } catch (err) {
      console.error('Onverwachte fout:', err);
      alert('Onverwachte fout opgetreden.');
    } finally {
      setLoading(false);
    }
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

      {/* Beschrijving */}
      <TextInput
        style={styles.input}
        placeholder="Schrijf hier je beoordeling..."
        multiline
        value={description}
        onChangeText={setDescription}
      />

      {/* Indienen */}
      <Button
        title={loading ? 'Indienen...' : 'Beoordeling Indienen'}
        onPress={handleSubmit}
        disabled={loading || rating === 0 || !description.trim()}
      />
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
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
    textAlignVertical: 'top',
  },
});
