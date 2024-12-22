import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  Image 
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface Finding {
  title: string;
  description: string;
  image_url: string | null;
}

const fetchFindings = async (): Promise<Finding[]> => {
  try {
    const { data, error } = await supabase
      .from('findings')
      .select('title, description, image_url');
    
    if (error) {
      console.error('Error fetching data:', error);
      return [];
    }

    return data as Finding[];
  } catch (error) {
    console.error('Unexpected error fetching data:', error);
    return [];
  }
};

const fetchSignedUrl = async (path: string) => {
  try {
    const { data, error } = await supabase
      .storage
      .from('UserUploadedImages/public')
      .createSignedUrl(path, 60);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Unexpected error creating signed URL:', error);
    return null;
  }
};

export default function HomeScreen() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getFindings = async () => {
      const data = await fetchFindings();
      const findingsWithUrls = await Promise.all(data.map(async (finding) => {
        if (finding.image_url) {
          const imageUrl = finding.image_url.split(',')[0].trim(); // Get the first URL
          const signedUrl = await fetchSignedUrl(imageUrl);
          return { ...finding, image_url: signedUrl };
        }
        return finding;
      }));

      setFindings(findingsWithUrls);
      setLoading(false);
    };

    getFindings();
  }, []);

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.tilesContainer}>
        {findings.map((finding, index) => (
          <View key={index} style={styles.tile}>
            {finding.image_url && (
              <Image source={{ uri: finding.image_url }} style={styles.image} />
            )}
            <Text style={styles.title}>{finding.title}</Text>
            <Text style={styles.description}>{finding.description}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
  },
  tilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: '48%',
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  description: {
    fontSize: 14,
    marginTop: 5,
  },
});
