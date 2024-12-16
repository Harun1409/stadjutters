import {
  Image,
  StyleSheet,
  Platform,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useState, useEffect } from 'react';
import { Link } from 'expo-router';
import { supabase } from '../../lib/supabase';



export default function HomeScreen({}) {
  const [text, setText] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]); // TypeScript weet nu dat dit een array van Review-objecten is
  const [loading, setLoading] = useState(true); // Laadstatus
  // Definieer een TypeScript-type voor beoordelingen

type Review = {
  id: number; // Gebruik het type dat overeenkomt met je database-id
  username: string; // Username van de gebruiker
  rating: number;
  description: string;
  created_at: string;
};

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase
          .from('UserReview') // Tabelnaam in Supabase
          .select(`
            id,
            rating,
            description,
            created_at,
            profiles(username) // Haal username op via de relatie met de profiles-tabel
          `)
          .order('created_at', { ascending: false }); // Sorteer beoordelingen op nieuwste eerst

        if (error) {
          console.error('Fout bij het ophalen van beoordelingen:', error.message);
          alert('Er ging iets mis bij het ophalen van de beoordelingen.');
        } else {
          // Map de data zodat de username op het hoogste niveau komt
          const mappedReviews = data.map((item) => ({
            id: item.id,
            rating: item.rating,
            description: item.description,
            created_at: item.created_at,
            username: item.profiles?.username || 'Onbekend', // Gebruik 'Onbekend' als username niet beschikbaar is
          }));
          setReviews(mappedReviews); // Zet de aangepaste beoordelingen in de state
        }
      } catch (err) {
        console.error('Onverwachte fout:', err);
        alert('Onverwachte fout opgetreden.');
      } finally {
        setLoading(false); // Zet de laadstatus op false
      }
    };

    fetchReviews();
  }, []); // Lege afhankelijkhedenarray zorgt ervoor dat dit maar één keer wordt uitgevoerd

  return (
    <View style={styles.container}>
      <ThemedText>Mijn beoordelingen</ThemedText>

      <TextInput
        style={styles.input}
        placeholder="Type hier..."
        onChangeText={(value) => setText(value)}
      />

      <Link href="/beoordelingPlaatsen" style={styles.output}>
        Beoordeling plaatsen
      </Link>

      {/* Beoordelingenlijst */}
      {loading ? (
        <ActivityIndicator size="large" color="#6200ee" style={styles.loader} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.reviewItem}>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.rating}>⭐ {item.rating}</Text>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.noReviews}>Geen beoordelingen gevonden.</Text>}
        />
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
    justifyContent: 'center',
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
    padding: 20,
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    height: 50,
    borderColor: '#6200ee',
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    width: '100%',
  },
  output: {
    fontSize: 16,
    color: '#6200ee',
    marginTop: 10,
  },
  loader: {
    marginTop: 20,
  },
  reviewItem: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    width: '100%',
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  rating: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    marginTop: 5,
    fontSize: 16,
    color: '#333',
  },
  date: {
    marginTop: 10,
    fontSize: 12,
    color: '#888',
  },
  noReviews: {
    fontSize: 16,
    color: '#888',
    marginTop: 20,
  },
});

