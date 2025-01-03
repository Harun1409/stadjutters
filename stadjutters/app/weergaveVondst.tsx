import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, FlatList, Dimensions, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; //https://static.enapter.com/rn/icons/material-community.html


interface FindingDetails {
  title: string;
  stad: string;
  description: string;
  image_urls: string[]; // Array of image URLs
  categoryId: string;
  categoryDescription: string; // Category description
  materialTypeId: string;
  materialTypeDescription: string; // Material type description
  findingTypeId: string;
}

export default function WeergaveVondst() {
  const { id } = useLocalSearchParams();
  const [finding, setFinding] = useState<FindingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchFindingDetails = async () => {
      try {
        // Fetch finding details
        const { data, error } = await supabase
          .from('findings')
          .select('title, stad, description, image_url, categoryId, materialTypeId, findingTypeId') // Include all fields
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching finding details:', error);
          return;
        }

        // Split image_url into an array of URLs
        const imageUrls = data?.image_url ? data.image_url.split(',').map((url: string) => url.trim()) : [];

        // Generate signed URLs for all images
        const signedUrls = await Promise.all(
          imageUrls.map(async (url: string) => {
            if (!url) return null;
            const signedUrl = await fetchSignedUrl(url);
            return signedUrl;
          })
        );

        // Fetch category description
        const { data: categoryData, error: categoryError } = await supabase
          .from('category')
          .select('description')
          .eq('id', data?.categoryId)
          .single();

        if (categoryError) {
          console.error('Error fetching category description:', categoryError);
        }

        // Fetch material type description
        const { data: materialTypeData, error: materialTypeError } = await supabase
          .from('materialType')
          .select('description')
          .eq('id', data?.materialTypeId)
          .single();

        if (materialTypeError) {
          console.error('Error fetching material type description:', materialTypeError);
        }

        // Set state with fetched data
        setFinding({
          ...data,
          image_urls: signedUrls.filter(Boolean), // Filter out any null signed URLs
          categoryDescription: categoryData?.description || 'No category description available',
          materialTypeDescription: materialTypeData?.description || 'No material type description available',
        });
      } catch (error) {
        console.error('Unexpected error fetching finding details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFindingDetails();
  }, [id]);

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

  const handleImagePress = (url: string) => {
    setSelectedImageUrl(url);
    setModalVisible(true);
  };

  const renderImageItem = ({ item }: { item: string }) => (
    <TouchableOpacity onPress={() => handleImagePress(item)}>
      <Image source={{ uri: item }} style={styles.image} />
    </TouchableOpacity>
  );

  if (loading) {
    return <ActivityIndicator size="large" style={styles.loadingIndicator} />;
  }

  if (!finding) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No details found for this item.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
        <ScrollView>
      <Text style={styles.title}>{finding.title}</Text>
      <View style={styles.divider}/>
      {/* Swipeable Images Carousel */}
      {finding.image_urls.length > 0 ? (
        <FlatList
          data={finding.image_urls}
          renderItem={renderImageItem}
          keyExtractor={(item, index) => `${item}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.carousel}
        />
      ) : (
        <Text style={styles.noImage}>No images available</Text>
      )}
    <View style={styles.divider}/>
      {/* Display Details */}
      <Text style={styles.descriptionTitle}>Productbeschrijving</Text>
      <Text style={styles.description}>{finding.description}</Text>
      <View style={styles.divider}/>
      <View style = {{flexDirection: 'row'}}>
        <Icon name="map-marker" size={28} color="darkgray"/>
        <Text style={styles.stad}>{finding.stad}</Text>
      </View>
      <View style={styles.divider}/>
      <Text style={styles.descriptionTitle}>Kenmerken</Text>
      <Text style={styles.detail}>Categorie: {finding.categoryDescription}</Text>
      <Text style={styles.detail}>Materiaal: {finding.materialTypeDescription}</Text>
      <Text style={styles.detail}>Vondst: {finding.findingTypeId}</Text>

      {/* Modal for Full-Size Image */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <Image source={{ uri: selectedImageUrl || '' }} style={styles.fullSizeImage} />
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.closeButtonText}>Sluit</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
  },
  divider: { 
    height: 1, 
    backgroundColor: 'gray', 
    marginVertical: 10,
  },
  carousel: {
    maxHeight: 250, // Set the height to match the image
    marginBottom: 10,
    marginTop: 10,
  },
  image: {
    width: Dimensions.get('window').width * 0.6,
    height: 250, // Keep consistent with carousel height
    borderRadius: 8,
    marginHorizontal: 10,
    resizeMode: 'cover',
  },
  noImage: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  stad: {
    fontSize: 16,
    color: '#444',
    marginTop: 5,
    marginStart: 5
  },
  description: {
    fontSize: 16,
    color: '#444',
  },
  descriptionTitle: {
    fontSize: 17,
    color: '#444',
    fontWeight: 'bold',
  },
  detail: {
    fontSize: 16,
    color: '#444',
    marginTop: 5,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#f00',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullSizeImage: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.7,
    resizeMode: 'contain',
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#333',
  },
});
