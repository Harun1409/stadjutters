import React, { useState, useEffect } from 'react';
import MapView, { Region, Marker, Callout } from 'react-native-maps';
import { StyleSheet, View, Alert, ActivityIndicator, Text, Image, ScrollView, Modal, TouchableOpacity, Animated, TouchableWithoutFeedback, Linking } from 'react-native';
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
  const [slideAnim] = useState(new Animated.Value(0));

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

  const fetchImageUrls = async (imageUrls: string) => {
    const urls = imageUrls.split(',').map(url => url.trim());
    const signedUrls = await Promise.all(
      urls.map(async (url) => {
        const signedUrl = await fetchSignedUrl(url);
        return signedUrl;
      })
    );
    return signedUrls.filter((url) => url !== null) as string[];
  };

  const handleMarkerPress = async (marker: Finding) => {
    const urls = await fetchImageUrls(marker.image_url);
    setImageUrls(urls);
    setSelectedMarker(marker);
    setModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleCloseModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  };

  const handleDirections = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(latitude)},${encodeURIComponent(longitude)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          console.error('De URL kan niet worden geopend:', url);
          Alert.alert('Fout', 'Kan de routebeschrijving niet openen. Controleer uw instellingen.');
          return;
        }
        return Linking.openURL(url);
      })
      .catch((err) => console.error('Fout bij het openen van de routebeschrijving:', err));
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
                onPress={() => handleMarkerPress(marker)}
              />
            );
          })}
        </MapView>
      )}
      {selectedMarker && (
        <Modal
          transparent={true}
          visible={modalVisible}
          onRequestClose={handleCloseModal}
        >
          <TouchableWithoutFeedback onPress={handleCloseModal}>
            <View style={styles.modalBackground}>
              <TouchableWithoutFeedback>
                <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }] }]}>
                  <Text style={styles.modalTitle}>{selectedMarker.title}</Text>
                  <View style={styles.divider}/>
                  <Text style={styles.modalDescription}>{selectedMarker.description}</Text>
                  <View style={styles.divider}/>

                  <ScrollView horizontal>
                    {imageUrls.map((url, index) => (
                      <TouchableWithoutFeedback key={index}>
                        <Image
                          source={{ uri: url }}
                          style={styles.modalImage}
                        />
                      </TouchableWithoutFeedback>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      const [latitude, longitude] = selectedMarker.location
                        .replace(/[()]/g, '')
                        .split(',')
                        .map(Number);
                      handleDirections(latitude, longitude);
                    }}
                  >
                    <Text style={styles.closeButtonText}>ROUTEBESCHRIJVING</Text>
                  </TouchableOpacity>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
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
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalDescription: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
    //textAlign: 'center',
  },
  modalImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginRight: 10,
    borderColor: 'gray',
    borderWidth: 1,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#7A3038',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    width: '100%',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'gray',
    width: '100%',
    marginVertical: 10,
  },
});
