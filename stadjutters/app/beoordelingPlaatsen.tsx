import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Button, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import StarRating from 'react-native-star-rating-widget';
import { supabase } from '../lib/supabase'; // Zorg ervoor dat je de juiste import hebt voor Supabase

type User = {
  id: string;       // Of number, afhankelijk van je Supabase setup
  username: string;
};

export default function BeoordelingPlaatsen() {
  const [rating, setRating] = useState(0); // Sterrenbeoordeling
  const [description, setDescription] = useState(''); // Beschrijving
  const [loading, setLoading] = useState(false); // Voor een laadindicator
  const [recipient, setRecipient] = useState<User | null>(null); // Ontvanger van de beoordeling
  const [query, setQuery] = useState(''); // Zoekterm voor gebruikers
  const [users, setUsers] = useState<User[]>([]); // Gezochte gebruikers
  const [searching, setSearching] = useState(false); // Indicator voor zoeken

  // Gebruikers zoeken op basis van zoekterm
  const handleSearch = async () => {
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${query}%`);

      if (error) {
        console.error('Fout bij zoeken naar gebruikers:', error.message);
        alert('Er ging iets mis bij het zoeken naar gebruikers.');
      } else {
        console.log(data); // Inspecteer de ontvangen data
        setUsers(data);
      }
    } catch (err) {
      console.error('Onverwachte fout bij zoeken:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!recipient) {
      alert('Selecteer een gebruiker om een beoordeling voor te plaatsen.');
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
  
      const userId = user.id;
  
      const { data: userData, error: userFetchError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
  
      if (userFetchError || !userData) {
        console.error('Fout bij ophalen beoordelaar:', userFetchError?.message);
        alert('Er ging iets mis bij het ophalen van je gebruikersgegevens.');
        return;
      }
  
      const reviewerUsername = userData.username;
  
      const { error } = await supabase.from('UserReview').insert([{
        user_id: userId, 
        reviewed_user_id: recipient.id,
        reviewed_username: recipient.username, 
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
        setRecipient(null);
        setQuery('');
        setUsers([]);
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
      <Text style={styles.title}>Plaats een Beoordeling</Text>

      {/* Zoek naar gebruikers */}
      <TextInput
        style={styles.input}
        placeholder="Zoek naar een gebruiker..."
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSearch}
      />
      {searching ? (
        <ActivityIndicator size="small" color="#6200ee" style={styles.loader} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: User }) => (  
            <TouchableOpacity
              style={styles.userItem}
              onPress={() => setRecipient(item)}
            >
              <Text>{item.username}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text>Geen gebruikers gevonden.</Text>}
        />
      )}

      {recipient && (
        <Text style={styles.selectedUser}>
          Beoordeling voor: {recipient.username}
        </Text>
      )}

      {/* Beschrijving */}
      <TextInput
        style={styles.input}
        placeholder="Schrijf hier je beoordeling..."
        multiline
        value={description}
        onChangeText={setDescription}
      />

      {/* Sterrenbeoordeling direct onder de tekstinvoer */}
      <View style={styles.ratingContainer}>
        <StarRating
          rating={rating}
          onChange={setRating}
          starSize={30}
          color="#FFD700"
        />
        {/* Indienen */}
      <Button
        title={loading ? 'Indienen...' : 'Beoordeling Indienen'}
        onPress={handleSubmit}
        disabled={loading || rating === 0 || !description.trim() || !recipient}
      />
      </View>

      {/* Indienen */}
      <Button
        title={loading ? 'Indienen...' : 'Beoordeling Indienen'}
        onPress={handleSubmit}
        disabled={loading || rating === 0 || !description.trim() || !recipient}
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
    height: 40,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  loader: {
    marginTop: 10,
  },
  userItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  selectedUser: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  ratingContainer: {
    marginBottom: 350, // Voeg wat ruimte toe onder de sterrenbeoordeling
  },
});
