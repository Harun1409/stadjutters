import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';
import { useSession } from '../SessionContext';
import { ThemedText } from '@/components/ThemedText';
import { Link } from 'expo-router';

type Review = {
  id: number;
  rating: number;
  description: string;
  userId: string;
  username: string;
};

type User = {
  id: string;
  username: string;
};

export default function HomeScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'received' | 'given'>('received');
  const { session } = useSession();

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        if (!session || !session.user) {
          console.error('Gebruiker niet ingelogd');
          alert('Je moet ingelogd zijn om beoordelingen te bekijken.');
          return;
        }
    
        const userId = session.user.id;
        console.log('Huidige gebruiker ID:', userId);
    
        // Stel de query samen afhankelijk van het filtertype
        let query = supabase
          .from('UserReview')
          .select('*')
          .order('created_at', { ascending: false });
    
        if (filterType === 'received') {
          query = query.eq('reviewed_user_id', userId);
        } else if (filterType === 'given') {
          query = query.eq('user_id', userId);
        }
    
        const { data, error } = await query;
    
        if (error) {
          console.error('Fout bij ophalen beoordelingen:', error.message);
          alert('Er ging iets mis bij het ophalen van de beoordelingen.');
          setReviews([]);
          return;
        }
    
        console.log('Beoordelingen opgehaald:', data);
    
        // Haal gebruikersnamen op voor de relevante user_id's
        const userIds = Array.from(
          new Set(
            data.map((item) =>
              filterType === 'received' ? item.user_id : item.reviewed_user_id
            )
          )
        );
    
        console.log('Gebruikers ID\'s voor ophalen:', userIds);
    
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
    
        if (usersError) {
          console.error('Fout bij ophalen gebruikersnamen:', usersError.message);
          alert('Er ging iets mis bij het ophalen van gebruikersnamen.');
          setReviews([]);
          return;
        }
    
        console.log('Ophalen gebruikers:', usersData);
    
        const userMap: Record<string, string> = usersData.reduce(
          (acc: Record<string, string>, user: User) => {
            acc[user.id] = user.username;
            return acc;
          },
          {}
        );
    
        console.log('Gebruikersnamen map:', userMap);
    
        const mappedReviews = data.map((item) => ({
          id: item.id,
          rating: item.rating,
          description: item.description,
          userId: filterType === 'received' ? item.user_id : item.user_id,
          username:
            userMap[
              filterType === 'received' ? item.user_id : item.reviewed_user_id
            ] || 'Onbekend',
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
  }, [filterType, session]);

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
        <Picker.Item label="Geplaatste beoordelingen" value="given" />
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
              <Text style={styles.username}>Gebruiker: {item.username}</Text>
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
    fontSize: 16,
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
});
