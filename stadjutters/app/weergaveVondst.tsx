import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, FlatList, Dimensions, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import { supabase } from '@/lib/supabase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; //https://static.enapter.com/rn/icons/material-community.html
import { useSession } from './SessionContext';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

interface FindingDetails {
  title: string;
  stad: string;
  description: string;
  image_urls: string[]; // ARRAY VAN URLS
  categoryId: string;
  categoryDescription: string; // CATEGORIE BESCHRIJVING
  materialTypeId: string;
  materialTypeDescription: string; // MATERIAAL TYPE BESCHRIJVING
  findingTypeId: string;
  uid: string;
}

export default function WeergaveVondst() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [finding, setFinding] = useState<FindingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false); // OPSLAAN KNOP
  const { session } = useSession(); // SESSION INFO VERKRIJGEN
  const navigation = useNavigation(); // INITIALISATIE NAVIGATIE

  // Titel is de titel van de vondst ipv 'weergaveVondst'
  useFocusEffect(
      React.useCallback(() => {
        if (finding?.title) {
          navigation.setOptions({ title: finding.title }); // Instellen van de paginatitel
        }
      }, [finding?.title])
  );

  useEffect(() => {
    console.log('uid:', session?.user?.id); // USER ID IDENTIFICEREN
    const fetchFindingDetails = async () => {
      try {
        // FETCH VONDSTEN DETAILS
        const { data, error } = await supabase
          .from('findings')
          .select('title, stad, description, image_url, categoryId, materialTypeId, findingTypeId, uid')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error bij verkrijgen vondsten:', error);
          return;
        }

        // IMAGE URL SPLITTEN IN MEERDERE
        const imageUrls = data?.image_url ? data.image_url.split(',').map((url: string) => url.trim()) : [];



        // CUSTOM URL GENEREREN
        const signedUrls = await Promise.all(
          imageUrls.map(async (url: string) => {
            if (!url) return null;
            const signedUrl = await fetchSignedUrl(url);
            return signedUrl;
          })
        );

        // CATEGORIE BESCHRIJVING OPHALEN
        const { data: categoryData, error: categoryError } = await supabase
          .from('category')
          .select('description')
          .eq('id', data?.categoryId)
          .single();

        if (categoryError) {
          console.error('Error verkrijgen categorie description:', categoryError);
        }

        // MATERIAAL TYPE VERKRIJGEN
        const { data: materialTypeData, error: materialTypeError } = await supabase
          .from('materialType')
          .select('description')
          .eq('id', data?.materialTypeId)
          .single();

        if (materialTypeError) {
          console.error('Error verkrijgen materiaal description:', materialTypeError);
        }

        // OPGEHAALDE DATA GEBRUIKEN
        setFinding({
          ...data,
          image_urls: signedUrls.filter(Boolean),
          categoryDescription: categoryData?.description || 'geen categorie description beschikbaar',
          materialTypeDescription: materialTypeData?.description || 'geen materiaal description beschikbaar',
        });

        // CHECK OF VONDST AL OPGESLAGEN IS
        const { data: savedData, error: savedError } = await supabase
          .from('savedFindings')
          .select('id')
          .eq('uid', session?.user?.id)
          .eq('finding_id', id)
          .single();

        if (savedError && savedError.code !== 'PGRST116') {
          console.error('Error checken opgeslagen vondsten:', savedError);
        } else if (savedData) {
          setIsSaved(true);
        }
      } catch (error) {
        console.error('Unexpected error verkrijgen vondsten details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFindingDetails();
  }, [id, session?.user?.id]); // USER ID ALS DEPENDECY

  const fetchSignedUrl = async (path: string) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('UserUploadedImages/public')
        .createSignedUrl(path, 60);

      if (error) {
        console.error('Error bij maken van custom URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Unexpected error bij maken van custom URL:', error);
      return null;
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Bevestiging",
      "Weet je zeker dat je dit item wilt verwijderen?",
      [
        {
          text: "Annuleren",
          style: "cancel"
        },
        {
          text: "Verwijderen",
          onPress: async () => {
            try {
              if (finding?.image_urls) {
                const deletePromises = finding.image_urls.map(async (url) => {
                  const path = url.split('?')[0].split('/').slice(-2).join('/');
                  console.log('Deleting image from storage:', path);
                  const { error } = await supabase
                    .storage
                    .from('UserUploadedImages')
                    .remove([path]);
                    console.log('HK: deleted from storage: ', [path]);
                  if (error) {
                    console.error('Error deleting image from storage:', error);
                  }
                });
                await Promise.all(deletePromises);
              }

              // VONDST VERWIJDEREN VAN DATABASE
              const { error } = await supabase
                .from('findings')
                .delete()
                .eq('id', id);

              if (error) {
                console.error('error bij verwijderen vondst:', error);
                return;
              }

              console.log('Finding deleted successfully | ' + id);
              navigation.goBack();
            } catch (error) {
              console.error('Unexpected error deleting finding:', error);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleSave = async () => {
    setIsSaved(!isSaved);
    if (!isSaved) {
      try {
        const { error } = await supabase
          .from('savedFindings')
          .insert([{ uid: session?.user?.id, finding_id: id }]);

        if (error) {
          console.error('Error opslaan vondst:', error);
        } else {
          console.log('vondst opgeslagen');
        }
      } catch (error) {
        console.error('Unexpected error opslaan vondst:', error);
      }
    } else {
      try {
        const { error } = await supabase
          .from('savedFindings')
          .delete()
          .eq('uid', session?.user?.id)
          .eq('finding_id', id);

        if (error) {
          console.error('Error verwijderen opgeslagen vondst:', error);
        } else {
          console.log('vondst van opgeslagen verwijderd');
        }
      } catch (error) {
        console.error('Unexpected error verwijderen opgeslagen vondst:', error);
      }
    }
  };

  const handleChat = () => {
    // @ts-ignore
    router.push(`/chats/${finding.uid}`); // Navigeren naar de chatpagina
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
      {/* SWIPEABLE IMAGES */}
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
      {/* DISPLAY DETAILS */}
      <Text style={styles.descriptionTitle}>Productbeschrijving</Text>
      <Text style={styles.description}>{finding.description}</Text>
      <View style={styles.divider}/>
      <View style = {{flexDirection: 'row'}}>
        <Icon name="map-marker" size={28} color="darkgray"/>
        <Text style={styles.stad}>{finding.stad}</Text>
      </View>
      <View style={styles.divider}/>
      <View style={styles.kenmerkenContainer}>
        <View style={styles.kenmerkenDetails}>
          <Text style={styles.descriptionTitle}>Kenmerken</Text>
          <Text style={styles.detail}>Categorie: {finding.categoryDescription}</Text>
          <Text style={styles.detail}>Materiaal: {finding.materialTypeDescription}</Text>
          <Text style={styles.detail}>Vondst: {finding.findingTypeId}</Text>
        </View>
        <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
          <Icon name="chat" size={20} color="#fff" />
          <Text style={styles.chatButtonText}>Chatten</Text>
        </TouchableOpacity>
        {/*DELETE*/}
        {finding.uid === session?.user?.id ? (
          <View style={styles.deleteButtonContainer}>
            <TouchableOpacity style={styles.customButtonVerwijderen} onPress={handleDelete}>
              <Icon name="delete" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity style={styles.customButtonSave} onPress={handleSave}>
              <Icon name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* FULLSIZE IMAGE MODAL */}
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
    maxHeight: 250,
    marginBottom: 10,
    marginTop: 10,
  },
  image: {
    width: Dimensions.get('window').width * 0.6,
    height: 250,
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
  customButtonVerwijderen: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customButtonSave: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonContainer: {
    marginLeft: 10,
  },
  saveButtonContainer: {
    marginLeft: 10,
  },
  kenmerkenContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kenmerkenDetails: {
    flex: 1,
  },
  deleteIcon: {
    marginRight: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatButton: {
    backgroundColor: '#007bff', // Blauwe achtergrond
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  chatButtonText: {
    color: '#fff', // Witte tekst
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8, // Ruimte tussen icoon en tekst
  },
});
