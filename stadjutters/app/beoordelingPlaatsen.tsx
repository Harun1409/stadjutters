import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, View, Button, ScrollView } from 'react-native';
import StarRating from 'react-native-star-rating-widget';
import { supabase } from '../lib/supabase'; 
import { useLocalSearchParams } from 'expo-router';

export default function BeoordelingPlaatsen() {
  const [rating, setRating] = useState(0); // Sterrenbeoordeling
  const [description, setDescription] = useState(''); // Beschrijving
  const [loading, setLoading] = useState(false); // Voor een laadindicator
  const [reviewedUsername, setReviewedUsername] = useState<string | null>(null); // Naam van de beoordeelde gebruiker

  // User ID en titel uit URL-parameters ophalen
  const { user_id, title } = useLocalSearchParams();

  // Zorg ervoor dat user_id een string is
  const reviewedUserId = Array.isArray(user_id) ? user_id[0] : user_id;

  // Ophalen van de gebruikersnaam van de beoordeelde gebruiker
  useEffect(() => {
    if (reviewedUserId) {
      fetchReviewedUsername(reviewedUserId);
    }
  }, [reviewedUserId]);

  const fetchReviewedUsername = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Fout bij ophalen reviewed_username:', error.message);
        alert('Er ging iets mis bij het ophalen van de gebruikersnaam van de beoordeelde.');
      } else {
        setReviewedUsername(data.username); // Zet de opgehaalde gebruikersnaam in de state
      }
    } catch (err) {
      console.error('Onverwachte fout bij ophalen reviewed_username:', err);
      alert('Onverwachte fout opgetreden.');
    }
  };

  const handleSubmit = async () => {
    if (!reviewedUserId || !reviewedUsername) {
      alert('Geen gebruiker gevonden om een beoordeling voor te plaatsen.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Gebruiker niet ingelogd:', userError);
        alert('Je moet ingelogd zijn om een beoordeling te plaatsen.');
        return;
      }

      const currentUserId = user.id;

      // Huidige gebruiker ophalen voor reviewer-username
      const { data: userData, error: userFetchError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUserId)
        .single();

      if (userFetchError || !userData) {
        console.error('Fout bij ophalen reviewer_username:', userFetchError?.message);
        alert('Er ging iets mis bij het ophalen van je gebruikersgegevens.');
        return;
      }

      const reviewerUsername = userData.username;

      // Beoordeling toevoegen aan de database
      const { error } = await supabase.from('UserReview').insert([{
        user_id: currentUserId, // Huidige gebruiker ID (degene die de beoordeling plaatst)
        reviewed_user_id: reviewedUserId, // User ID uit URL gebruiken (degene die wordt beoordeeld)
        reviewed_username: reviewedUsername, // Gebruikersnaam van de beoordeelde gebruiker
        reviewer_username: reviewerUsername, 
        rating: rating,
        description: description,
        created_at: new Date().toISOString(),
      }]);

      if (error) {
        console.error('Fout bij het toevoegen van beoordeling:', error.message);
        alert('Er ging iets mis bij het indienen van je beoordeling.');
      } else {
        alert('Beoordeling succesvol ingediend!');
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>
        Gebruiker: {reviewedUsername || 'Gebruiker laden...'}
      </Text>
      <Text style={styles.subtitle}>{title || 'Geen titel gevonden'}</Text>

      <View style={styles.ratingContainer}>
        <StarRating
          rating={rating}
          onChange={setRating}
          starSize={30}
          color="#FFD700"
        />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Schrijf hier je beoordeling..."
        multiline={true}
        value={description}
        onChangeText={setDescription}
      />

      <Button
        title={loading ? 'Indienen...' : 'Beoordeling Indienen'}
        onPress={handleSubmit}
        disabled={loading || rating === 0 || !description.trim()}
        color="#4CAF50"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    paddingTop: 40,
  },
  subtitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#555',
    marginVertical: 5,
    textAlign: 'center',
  },
  input: {
    height: 120,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  ratingContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
});
