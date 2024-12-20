import {
  Button,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  FlatList,
  ScrollView,
  LogBox,
  TouchableOpacity,
} from 'react-native'; 
import { Image, StyleSheet, Platform, View } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useSession } from '../SessionContext'; // Assuming this provides session info (user ID)
import { supabase } from '../../lib/supabase'; // Correct import from your supabase.tsx file
import 'react-native-gesture-handler';

const mktest = '';
interface Finding {
  title: string;
  description: string;
  image_url: string | null; // Ensure image_url can be null
}
//console.log("-----------------------")
// Fetch findings and include image URL
const fetchFindings = async (): Promise<Finding[]> => {
  try {
    const { data, error } = await supabase
      .from('findings') // Your table name
      .select('title, description, image_url'); // Include 'image_url' in the query
      //const blabla = data;
      //console.log(data)
    if (error) {
      console.error('Error fetching data:', error);
      return [];
    }

    return data as Finding[]; // Typecast to Finding[]
  } catch (error) {
    console.error('Unexpected error fetching data:', error);
    return [];
  }
};
//console.log(blabla.toString)



const fetchSignedUrl = async (path: string) => {
  try {
    const { data, error } = await supabase
      .storage
      .from('UserUploadedImages/public')
      .createSignedUrl(path, 60); // Create signed URL valid for 60 seconds

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
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const getFindings = async () => {
      const data = await fetchFindings();

      // Fetch signed URLs for each finding with an image URL
      const findingsWithUrls = await Promise.all(data.map(async (finding) => {

        const mktest = finding.image_url.split('/').pop() || '';

        console.log(mktest);
        //console.log(finding.image_url);






        if (mktest) {
          const signedUrl = await fetchSignedUrl(mktest);
          console.log(signedUrl)
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
            {/* Display image if available */}
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
    justifyContent: 'space-between', // Ensures tiles are evenly distributed
  },
  tile: {
    width: '48%', // Ensures each tile takes up approximately half the width
    marginBottom: 10, // Space below each tile
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2, // For Android shadow
  },
  image: {
    width: '100%', // Ensures the image fills the full width of the tile
    height: 150, // Adjust the height of the image
    borderRadius: 8,
    marginBottom: 10, // Space between image and text
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
