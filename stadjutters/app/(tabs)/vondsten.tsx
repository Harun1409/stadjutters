import React, { useState, useEffect } from 'react';
import MapView, { Region, Marker, Callout } from 'react-native-maps';
import { StyleSheet, View, Alert, ActivityIndicator, Text, Image, ScrollView, Modal, TouchableOpacity, Animated, TouchableWithoutFeedback, Linking, TextInput, FlatList } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

interface Finding {
  id: string;
  title: string;
  description: string;
  location: string;
  image_url: string;
  categoryId: string;
  materialTypeId: string;
}

interface Category {
  id: string;
  description: string;
}

interface MaterialType {
  id: string;
  description: string;
}

export default function App() {
  const [location, setLocation] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState<Finding[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<Finding | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [categoryDescription, setCategoryDescription] = useState<string>('');
  const [materialTypeDescription, setMaterialTypeDescription] = useState<string>('');
  const [slideAnim] = useState(new Animated.Value(0));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isMaterialModalVisible, setMaterialModalVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);


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
      let query = supabase
        .from('findings')
        .select('id, title, description, location, image_url, categoryId, materialTypeId')
        .eq('findingTypeId', 'Straatvondst');

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      if (selectedCategory) {
        query = query.eq('categoryId', selectedCategory);
      }

      if (selectedMaterial) {
        query = query.eq('materialTypeId', selectedMaterial);
      }

      const { data, error } = await query;

      if (error) {
        console.error('FOUT BIJ HET OPHALEN VAN MARKERS:', error);
        return;
      }

      const validMarkers = data.filter((finding: Finding) => finding.location);
      setMarkers(validMarkers);
    };

    fetchMarkers();
  }, [searchQuery, selectedCategory, selectedMaterial]);

  useEffect(() => {
    const retrieveCategories = async () => {
      const { data, error } = await supabase
        .from('category')
        .select('id, description');

      if (error) {
        console.error('FOUT BIJ HET OPHALEN VAN CATEGORIEËN:', error);
        return;
      }
      setCategories(data || []);
    };

    const retrieveMaterialTypes = async () => {
      const { data, error } = await supabase
        .from('materialType')
        .select('id, description');

      if (error) {
        console.error('FOUT BIJ HET OPHALEN VAN MATERIAALSOORTEN:', error);
        return;
      }
      setMaterialTypes(data || []);
    };

    retrieveCategories();
    retrieveMaterialTypes();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const refreshDataOnFocus = async () => {
        setLoading(true);
        await refreshMarkers();
        setLoading(false);
      };

      refreshDataOnFocus();
    }, [])
  );

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

  const fetchCategoryAndMaterialType = async (categoryId: string, materialTypeId: string) => {
    try {
      const { data: categoryData, error: categoryError } = await supabase
        .from('category')
        .select('description')
        .eq('id', categoryId)
        .single();

      const { data: materialTypeData, error: materialTypeError } = await supabase
        .from('materialType')
        .select('description')
        .eq('id', materialTypeId)
        .single();

      if (categoryError || materialTypeError) {
        console.error('Fout bij ophalen van category of materialType:', categoryError || materialTypeError);
        return;
      }

      setCategoryDescription(categoryData?.description || '');
      setMaterialTypeDescription(materialTypeData?.description || '');
    } catch (error) {
      console.error('Fout bij ophalen van category en materialType:', error);
    }
  };

  const handleMarkerPress = async (marker: Finding) => {
    const urls = await fetchImageUrls(marker.image_url);
    setImageUrls(urls);
    setSelectedMarker(marker);
    await fetchCategoryAndMaterialType(marker.categoryId, marker.materialTypeId);
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

  const refreshMarkers = async () => {
    setLoading(true);
    const fetchMarkers = async () => {
      let query = supabase
        .from('findings')
        .select('id, title, description, location, image_url, categoryId, materialTypeId')
        .eq('findingTypeId', 'Straatvondst');

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      if (selectedCategory) {
        query = query.eq('categoryId', selectedCategory);
      }

      if (selectedMaterial) {
        query = query.eq('materialTypeId', selectedMaterial);
      }

      const { data, error } = await query;

      if (error) {
        console.error('FOUT BIJ HET OPHALEN VAN MARKERS:', error);
        return;
      }

      const validMarkers = data.filter((finding: Finding) => finding.location);
      setMarkers(validMarkers);
    };

    await fetchMarkers();
    setLoading(false);
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
          style={styles.map}
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
      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={refreshMarkers}>
        <Ionicons name="refresh" size={24} color="white" />
      </TouchableOpacity>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="Zoek op titel..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.searchIcon}>
          <Ionicons name="search" size={24} color="gray" />
        </TouchableOpacity>
      </View>
      {/* Filter Labels */}
      <View style={styles.filterContainer}>
        <View style={styles.filterLabelContainer}>
          <TouchableOpacity onPress={() => setCategoryModalVisible(true)} style={[styles.filterLabel, {marginRight: 5}]}>
            <Text>{categories.find(cat => cat.id === selectedCategory)?.description || 'Selecteer categorie'}</Text>
          </TouchableOpacity>
          {selectedCategory ? (
            <TouchableOpacity onPress={() => setSelectedCategory('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="gray" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.filterLabelContainer}>
          <TouchableOpacity onPress={() => setMaterialModalVisible(true)} style={[styles.filterLabel, {marginLeft: 5}]}>
            <Text>{materialTypes.find(mat => mat.id === selectedMaterial)?.description || 'Selecteer materiaal'}</Text>
          </TouchableOpacity>
          {selectedMaterial ? (
            <TouchableOpacity onPress={() => setSelectedMaterial('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="gray" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      {/* Category Modal */}
      <Modal visible={isCategoryModalVisible} transparent={true}>
        <TouchableWithoutFeedback onPress={() => setCategoryModalVisible(false)}>
          <View style={styles.modalContainerDropdown}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContentDropdown}>
                <Text style={styles.modalTitle}>Selecteer categorie</Text>
                <FlatList
                  data={categories}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedCategory(item.id);
                        setCategoryModalVisible(false);
                      }}
                      style={styles.modalItem}
                    >
                      <Text style={{fontSize: 20}}>{item.description}</Text>
                    </TouchableOpacity>
                  )}
                  style={styles.modalList}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Material Modal */}
      <Modal visible={isMaterialModalVisible} transparent={true}>
        <TouchableWithoutFeedback onPress={() => setMaterialModalVisible(false)}>
          <View style={styles.modalContainerDropdown}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContentDropdown}>
                <Text style={styles.modalTitle}>Selecteer materiaal</Text>
                <FlatList
                  data={materialTypes}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedMaterial(item.id);
                        setMaterialModalVisible(false);
                      }}
                      style={styles.modalItem}
                    >
                      <Text style={{fontSize: 20}}>{item.description}</Text>
                    </TouchableOpacity>
                  )}
                  style={styles.modalList}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
                  <Text style={styles.modalDescription}>Categorie: {categoryDescription}</Text>
                  <Text style={styles.modalDescription}>Materiaal: {materialTypeDescription}</Text>
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
  searchContainer: {
    position: 'absolute',
    top: 10,
    left: '2.5%',
    right: '2.5%',
    flexDirection: 'row',
    zIndex: 1, 
  },
  searchBar: {
    flex: 1,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  searchIcon: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    position: 'absolute',
    right: 10,
  },
  filterContainer: {
    position: 'absolute',
    top: 60,
    left: '2.5%',
    right: '2.5%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  filterLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterLabel: {
    flex: 1,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  clearButton: {
    marginHorizontal: 5,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainerDropdown: {
    flex: 1,
    justifyContent: 'flex-end', 
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContentDropdown: {
    width: '100%',
    height: '34%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end', 
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
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
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 0,
    borderBottomColor: '#ccc',
    width: '100%',
    alignItems: 'center',
  },
  modalList: {
    width: '100%',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalDescription: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
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
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#7A3038',
    padding: 10,
    borderRadius: 50,
    zIndex: 1,
  },
});
