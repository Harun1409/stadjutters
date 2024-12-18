import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Button,} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Installatie nodig: npm install @react-native-picker/picker
import { supabase } from '../../lib/supabase';
import { ThemedText } from '@/components/ThemedText';
import { Link } from 'expo-router';

type Review = {
  id: number;
  rating: number;
  description: string;
  username: string;
};

export default function HomeScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'received' | 'given'>('received'); // Filtertype: ontvangen of gegeven

  useEffect(() => {
    const fetchReviews = async () => {  
      setLoading(true);
      try {
        // Haal huidige gebruiker op via Supabase Auth
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error('Gebruiker niet ingelogd:', userError);
          alert('Je moet ingelogd zijn om beoordelingen te bekijken.');
          return;
        }

        // Bepaal filtertype: ontvangen of gegeven beoordelingen
        let query = supabase.from('UserReview').select('*').order('created_at', { ascending: false });

        if (filterType === 'received') {
          query = query.eq('reviewed_username', user.user_metadata.username); // Beoordelingen over jou
        } else if (filterType === 'given') {
          query = query.eq('reviewer_username', user.user_metadata.username); // Beoordelingen die jij geplaatst hebt
        }

        const { data, error } = await query;

        if (error) {
          console.error('Fout bij ophalen beoordelingen:', error.message);
          alert('Er ging iets mis bij het ophalen van de beoordelingen.');
          setReviews([]);
          return;
        }

        const mappedReviews = data.map((item) => ({
          id: item.id,
          rating: item.rating,
          description: item.description,
          username:
            filterType === 'received'
              ? item.reviewer_username
              : item.reviewed_username, // Toon andere partij afhankelijk van filter
        }));
        setReviews(mappedReviews);
      } catch (err) {
        console.error('Onverwachte fout:', err);
        alert('Er ging iets mis bij het ophalen van de beoordelingen.');
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [filterType]); // Voer opnieuw uit bij wijziging van filtertype

  return (
    <View style={styles.container}>
      <ThemedText style={styles.header}>Beoordelingen</ThemedText>

      {/* Dropdown Filter */}
      <Picker
        selectedValue={filterType}
        onValueChange={(itemValue) => setFilterType(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Beoordelingen over jou" value="received" />
        <Picker.Item label="Beoordelingen die jij hebt geplaatst" value="given" />
      </Picker>

      {/* Beoordelingen Lijst */}
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
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.noReviews}>
              Geen beoordelingen gevonden voor deze categorie.
            </Text>
          }
        />
      )}

      {/* Link om beoordeling te plaatsen */}
      <Link href="/beoordelingPlaatsen" style={styles.link}>
        <Text style={styles.link}>Beoordeling plaatsen</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  picker: {
    width: '100%',
    marginBottom: 20,
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
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  rating: {
    fontSize: 16,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  noReviews: {
    fontSize: 16,
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
  },
  link: {
    fontSize: 16,
    color: '#6200ee',
    marginTop: 20,
    textAlign: 'center',
  },
});
