import React, { useState, useEffect } from 'react';
import { 
  FlatList, 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl 
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Link } from 'expo-router'; 
import {useSession} from "@/app/SessionContext";

interface Finding {
  id: string;
  title: string;
  stad: string;
  image_url: string | null;
}

const PAGE_SIZE = 15;

export default function HomeScreen() {
  const { session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchFindings = async (userId: string, page: number): Promise<Finding[]> => {
    try {
      const { data: savedFindings, error: savedFindingsError } = await supabase
        .from('savedFindings')
        .select('finding_id')
        .eq('uid', userId); 
  
      if (savedFindingsError) {
        console.error('Error verkrijgen opgeslagen vondsten:', savedFindingsError);
        return [];
      }
  
      const savedFindingIds = savedFindings.map(item => item.finding_id);
  
      if (savedFindingIds.length === 0) {
        return [];  
      }
  
      const { data, error } = await supabase
        .from('findings')
        .select('id, title, stad, image_url')
        .in('id', savedFindingIds)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1); 
  
      if (error) {
        console.error('Error verkrijgen data:', error);
        return [];
      }
  
      return data as Finding[]; 
    } catch (error) {
      console.error('Unexpected error verkrijgen data:', error);
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
        console.error('Error maken custom url:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Unexpected error maken custom url:', error);
      return null;
    }
  };

  const loadFindings = async (nextPage: number, clearFindings: boolean = false) => {
    if (!hasMore && !clearFindings) return;

    if (clearFindings) {
      setFindings([]);
      setPage(0);
      setHasMore(true);
    }

    setLoadingMore(true);
    const data = await fetchFindings(currentUserId, nextPage);

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

      setFindings((prev) => clearFindings ? findingsWithUrls : [...prev, ...findingsWithUrls]);
    }
    setLoadingMore(false);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      await loadFindings(0, true);
      setLoading(false);
    };

    fetchInitialData();
  }, []);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setPage((prevPage) => {
        const nextPage = prevPage + 1;
        loadFindings(nextPage);
        return nextPage;
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFindings(0, true);
    setRefreshing(false);
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
          <View style={styles.tile}>
            <Link href={{
              pathname: '/weergaveVondst',
              params: { id: item.id },
            }}>
              {item.image_url && (
                <Image source={{ uri: item.image_url }} style={styles.image} />
              )}
              <View>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.stad}>{item.stad}</Text>
              </View>
            </Link>
          </View>
        )}
        contentContainerStyle={styles.tilesContainer}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" /> : null}
        numColumns={2}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
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
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  stad: {
    fontSize: 12, 
    color: '#666', 
    marginTop: 0,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
