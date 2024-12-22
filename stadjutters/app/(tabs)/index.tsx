import React, { useState, useEffect } from 'react';
import { 
  FlatList, 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  ActivityIndicator 
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Link } from 'expo-router';  // Use Link from expo-router

interface Finding {
  title: string;
  stad: string;
  image_url: string | null;
}

const PAGE_SIZE = 15; // Number of items to load per page

const fetchFindings = async (page: number): Promise<Finding[]> => {
  try {
    const { data, error } = await supabase
      .from('findings')
      .select('title, stad, image_url')
      .eq('findingTypeId', 'Huisvondst') // Filter op 'Huisvondst'
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadFindings = async (nextPage: number) => {
    if (!hasMore) return;

    setLoadingMore(true);
    const data = await fetchFindings(nextPage);
    if (data.length === 0) {
      setHasMore(false);
    } else {
      const findingsWithUrls = await Promise.all(data.map(async (finding) => {
        if (finding.image_url) {
          const imageUrl = finding.image_url.split(',')[0].trim();
          const signedUrl = await fetchSignedUrl(imageUrl);
          return { ...finding, image_url: signedUrl };
        }
        return finding;
      }));

      setFindings((prev) => [...prev, ...findingsWithUrls]);
    }
    setLoadingMore(false);
  };

  useEffect(() => {
    const fetchInitialFindings = async () => {
      await loadFindings(0);
      setLoading(false);
    };

    fetchInitialFindings();
  }, []);

  const handleLoadMore = () => {
    if (!loadingMore) {
      setPage((prevPage) => {
        const nextPage = prevPage + 1;
        loadFindings(nextPage);
        return nextPage;
      });
    }
  };

  const truncateTitle = (title: string) => {
    return title.length > 33 ? title.substring(0, 33) + '...' : title;
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.loadingIndicator} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={findings}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          
          <View style={styles.tile} >
            <Link href={`/weergaveVondst`}>
            {item.image_url && (
              <Image source={{ uri: item.image_url }} style={styles.image} />
            )}
            <View>
            <Text style={styles.title}>{truncateTitle(item.title)}</Text>
            <Text style={styles.stad}>{item.stad}</Text>
            </View>
            </Link>
          </View>
          
        )}
        contentContainerStyle={styles.tilesContainer}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" /> : null}
        numColumns={2}  // Set the number of columns to 2 and keep it constant
      />
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
    marginEnd: 15,
    marginTop: 6,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  title: {
    marginTop: 5,
    fontWeight: 'bold',
    fontSize: 14, // Increased the font size
    color: '#333', // Changed the text color
    marginBottom: 5, // Added some margin to separate title and stad
  },
  stad: {
    fontSize: 12, // Increased the font size
    color: '#666', // Changed the text color
    marginTop: 0,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
