import React, { useState, useEffect } from 'react';
import MapView, { Region, Marker, Callout } from 'react-native-maps';
import { StyleSheet, View, Alert, ActivityIndicator, Text, Image, ScrollView, Modal, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';

interface Finding {
  id: string;
  title: string;
  description: string;
  location: string;
  image_url: string;
}

export default function App() {
  const [location, setLocation] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState<Finding[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<Finding | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('TOESTEMMING GEWEIGERD', 'TOEGANG TOT LOCATIE IS VEREIST OM DE KAART TE TONEN.');
        setLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const fetchMarkers = async () => {
      const { data, error } = await supabase
        .from('findings')
        .select('id, title, description, location, image_url')
        .eq('findingTypeId', 'Straatvondst');

      if (error) {
        console.error('FOUT BIJ HET OPHALEN VAN MARKERS:', error);
        return;
      }

      const validMarkers = data.filter((finding: Finding) => finding.location);
      setMarkers(validMarkers);
    };

    fetchMarkers();
  }, []);

  // FUNCTIE VOOR HET OPHALEN VAN DE SIGNED URL
  const fetchSignedUrl = async (path: string) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('UserUploadedImages/public')
        .createSignedUrl(path, 60);

      if (error) {
        console.error('FOUT BIJ HET AANMAKEN VAN EEN ONDERTEKENDE URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('ONVERWACHTE FOUT BIJ HET AANMAKEN VAN EEN ONDERTEKENDE URL:', error);
      return null;
    }
  };

  // HAAL DE SIGNED URL'S VOOR DE AFBEELDINGEN OP
  const fetchImageUrls = async (imageUrls: string) => {
    const urls = imageUrls.split(',').map(url => url.trim());
    const signedUrls = await Promise.all(
      urls.map(async (url) => {
        const signedUrl = await fetchSignedUrl(url); // HAAL DE SIGNED URL OP
        return signedUrl; // ALS ER EEN GELDIGE URL IS, VOEG DIE TOE
      })
    );
    // FILTER LEGE WAARDEN (NULL) UIT DE ARRAY
    return signedUrls.filter((url) => url !== null) as string[]; // TYPECASTING OM DE ARRAY ALS STRING[] TE BEHANDELEN
  };

  const handleMarkerPress = async (marker: Finding) => {
    const urls = await fetchImageUrls(marker.image_url);
    setImageUrls(urls);
    setSelectedMarker(marker);
    setModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {location && (
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={location}
          showsUserLocation
        >
          {markers.map((marker) => {
            const [latitude, longitude] = marker.location
              .replace(/[()]/g, '')
              .split(',')
              .map(Number);
            return (
              <Marker
                key={marker.id}
                coordinate={{ latitude, longitude }}
                title={marker.title}
                onPress={() => handleMarkerPress(marker)}
              />
            );
          })}
        </MapView>
      )}
      {selectedMarker && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedMarker.title}</Text>
              <Text style={styles.modalDescription}>{selectedMarker.description}</Text>
              <ScrollView horizontal>
                {imageUrls.map((url, index) => (
                  <Image
                    key={index}
                    source={{ uri: url }}
                    style={styles.modalImage}
                  />
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>SLUITEN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 16,
    marginBottom: 10,
  },
  modalImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginRight: 10,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#7A3038',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
});
