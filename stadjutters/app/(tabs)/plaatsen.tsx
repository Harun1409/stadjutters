import {
  SafeAreaView,
  Image,
  StyleSheet,
  Button,
  Text,
  View,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  FlatList,
  ScrollView,
  LogBox,
  TouchableOpacity,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect } from 'react';
import { useSession } from '../SessionContext'; // AANNEMEN DAT DIT SESSIE-INFORMATIE (GEBRUIKERS-ID) BIEDT
import { supabase } from '../../lib/supabase'; // JUISTE IMPORT VANUIT JE SUPABASE.TSX-BESTAND
import * as FileSystem from 'expo-file-system'; // STAAT JE TOE OM BESTANDEN VAN HET LOKALE BESTANDSSYSTEEM TE LEZEN
import { Buffer } from 'buffer';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons'; // IMPORT IONICONS VOOR ICONEN
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'; // VOOR HET CONVERTEREN VAN NON-JEPG AFBEELDINGEN NAAR JPEG

global.Buffer = Buffer;

// WAARSCHUWINGEN OVER GENESTE VIRTUALIZEDLISTS ONDERDRUKKEN
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews',
]);

export default function HomeScreen() {
  const { session } = useSession(); // AANNEMEN DAT DIT SESSIE-INFORMATIE (GEBRUIKERS-ID) BIEDT
  const [titlePlaatsen, setTitlePlaatsen] = useState('');
  const [descriptionPlaatsen, setDescriptionPlaatsen] = useState('');
  const [images, setImages] = useState<string[]>([]); // ARRAY OM MEERDERE AFBEELDING-URI'S TE BEWAREN
  const [uploading, setUploading] = useState(false); // UPLOADSTATUS
  const [openCategory, setOpenCategory] = useState(false);
  const [valueCategory, setValueCategory] = useState<any>(null); // GESELECTEERDE CATEGORIE
  const [categories, setCategories] = useState<Category[]>([]);
  const [openMaterialType, setOpenMaterialType] = useState(false);
  const [valueMaterialType, setValueMaterialType] = useState<any>(null);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [selectedFindingType, setSelectedFindingType] = useState('Huisvondst');
  const [userCoordinates, setUserCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isMaterialModalVisible, setMaterialModalVisible] = useState(false);

  const maxTitleLength = 50;
  const maxDescriptionLength = 500;

  const onChangeTitle = (text: string) => {
    if (text.length <= maxTitleLength) setTitlePlaatsen(text);
  };

  const onChangeDescription = (text: string) => {
    if (text.length <= maxDescriptionLength) setDescriptionPlaatsen(text);
  };

  // GEBRUIKERSLOCATIE OPHALEN ALS "STRAATVONDST" IS GESELECTEERD
  const fetchUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Locatietoestemming is vereist voor Straatvondst.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setUserCoordinates({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error fetching location:', error);
      alert('Kon locatie niet ophalen.');
    }
  };

  const handleStraatvondstSelection = () => {
    setSelectedFindingType('Straatvondst');
    fetchUserLocation();
  };

  const location = userCoordinates
    ? `(${userCoordinates.latitude}, ${userCoordinates.longitude})`
    : null;

  // STAD VAN GEBRUIKERSPROFIEL OPHALEN
  const getStadFromProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('stad')
        .eq('id', session?.user.id)
        .single();

      if (error) {
        console.error('Error fetching city:', error);
        return null;
      }

      return data.stad;
    } catch (error) {
      console.error('Unexpected error fetching city:', error);
      return null;
    }
  };

  interface Category {
    id: number;
    description: string;
  }

  // CATEGORIEËN OPHALEN VAN SUPABASE
  const retrieveCategories = async () => {
    const { data, error } = await supabase
      .from('category')
      .select('id, description');

    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }
    setCategories(data || []);
  };

  useEffect(() => {
    retrieveCategories();
  }, []);

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.description,
  }));

  interface MaterialType {
    id: number;
    description: string;
  }

  // MATERIAALSOORTEN OPHALEN VAN SUPABASE
  const retrieveMaterialType = async () => {
    const { data, error } = await supabase
      .from('materialType')
      .select('id, description');

    if (error) {
      console.error('Error fetching material types:', error);
      return;
    }
    setMaterialTypes(data || []);
  };

  useEffect(() => {
    retrieveMaterialType();
  }, []);

  const materialTypeOptions = materialTypes.map((type) => ({
    id: type.id,
    name: type.description,
  }));

  // AFBEELDINGEN KIEZEN UIT DE GALERIJ
  const pickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Toestemming voor toegang tot de filmrol is vereist!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.01, // GEREDUCEERDE KWALITEIT VOOR KLEINERE AFBEELDINGSGROOTTES
      selectionLimit: 3,
    });

    if (!result.canceled && result.assets) {
      const selectedImages = result.assets.map((asset) => asset.uri);
      setImages(selectedImages);
    }
  };

  // EEN FOTO MAKEN MET DE CAMERA
  const takePhoto = async () => {
    if (images.length >= 3) {
      alert('Je kunt maximaal 3 afbeeldingen selecteren.');
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Toestemming voor toegang tot de camera is vereist!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.01,
    });

    if (!result.canceled && result.assets) {
      const capturedImage = result.assets.map((asset) => asset.uri);
      setImages((prevImages) => [...prevImages, ...capturedImage]);
    }
  };

  const removeImage = (uri: string) => {
    setImages(images.filter((image) => image !== uri));
  };

  // GEGEVENS UPLOADEN NAAR SUPABASE
  const uploadToDatabase = async () => {
    if (!titlePlaatsen) {
      alert('Geef een titel op om door te kunnen gaan');
      return;
    }
    if (!descriptionPlaatsen) {
      alert('Geef een beschrijving op om door te kunnen gaan');
      return;
    }
    if (!valueCategory?.id) {
      alert('Geef een categorie op om door te kunnen gaan');
      return;
    }
    if (!valueMaterialType?.id) {
      alert('Geef een materiaaltype op om door te kunnen gaan');
      return;
    }
    if (selectedFindingType === 'Straatvondst' && !location) {
      alert('Locatie toestemming is vereist voor straatvondsten');
      return;
    }
    if (images.length === 0) {
      alert('Geen afbeeldingen geselecteerd');
      return;
    }



    setUploading(true);
    try {
      const urls: string[] = [];
      for (const image of images) {
        const fileName = image.split('/').pop();
        const fileExt = 'jpeg';  // Convert all images to JPEG
        const filePath = `public/${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 5)}.${fileExt}`;
    
        // Convert image to JPEG
        const manipulatedImage = await manipulateAsync(
          image,
          [{ resize: { width: 1024 } }],  // Optional: resize the image
          { compress: 1, format: SaveFormat.JPEG }
        );
    
        const fileContent = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
    
        const buffer = Buffer.from(fileContent, 'base64');
    
        const { data, error } = await supabase.storage
          .from('UserUploadedImages')
          .upload(filePath, buffer, {
            contentType: `image/${fileExt}`,  // Content type is now always JPEG
            cacheControl: '3600',
            upsert: false,
          });
    
        if (error) throw error;
    
        const publicUrl = supabase.storage
          .from('UserUploadedImages')
          .getPublicUrl(filePath).data.publicUrl;
        urls.push(publicUrl.split('/').pop() || '');
      }
    
      const stad = await getStadFromProfile();
    
      if (!stad) {
        alert('Geef een woonplaats op in je account om door te kunnen gaan');
        return;
      }
    
      const { error: dbError } = await supabase
        .from('findings')
        .insert([
          {
            image_url: urls.join(','),
            uid: session?.user.id,
            title: titlePlaatsen,
            description: descriptionPlaatsen,
            categoryId: valueCategory?.id,
            materialTypeId: valueMaterialType?.id,
            stad: stad,
            findingTypeId: selectedFindingType,
            location: location,
          },
        ]);
    
      if (dbError) throw dbError;
    
      alert('Vondst succesvol geplaatst!');
      setImages([]);
      onChangeTitle('');
      onChangeDescription('');
      setSelectedFindingType('Huisvondst');
      setValueCategory(null);
      setValueMaterialType(null);
    } catch (error) {
      alert('Fout bij het uploaden van vondst.');
    } finally {
      setUploading(false);
    }
    
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.tilesContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            onChangeText={onChangeTitle}
            value={titlePlaatsen}
            placeholder="Titel"
          />
          <Text style={styles.counter}>
            {titlePlaatsen.length}/{maxTitleLength}
          </Text>
        </View>

        {/* BESCHRIJVING INVOEREN */}
        <View style={styles.inputContainer}>
          <TextInput
            editable
            multiline
            style={[styles.input, styles.inputDescription]}
            onChangeText={onChangeDescription}
            value={descriptionPlaatsen}
            placeholder="Beschrijving"
          />
          <Text style={styles.counter}>
            {descriptionPlaatsen.length}/{maxDescriptionLength}
          </Text>
        </View>

        {/* CATEGORIE DROPDOWN */}
        <View style={styles.filterContainer}>
          <View style={styles.filterLabelContainer}>
            <TouchableOpacity
              onPress={() => setCategoryModalVisible(true)}
              style={[styles.filterLabel, {marginRight: 5}]}
            >
              <Text style={styles.filterLabelText}>{valueCategory?.description || 'Selecteer categorie'}</Text>
            </TouchableOpacity>
            {valueCategory ? (
              <TouchableOpacity onPress={() => setValueCategory(null)} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="gray" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* MATERIAALSOORT DROPDOWN */}
          <View style={styles.filterLabelContainer}>
            <TouchableOpacity
              onPress={() => setMaterialModalVisible(true)}
              style={[styles.filterLabel, {marginLeft: 5}]}
            >
              <Text style={styles.filterLabelText}>{valueMaterialType?.description || 'Selecteer materiaaltype'}</Text>
            </TouchableOpacity>
            {valueMaterialType ? (
              <TouchableOpacity onPress={() => setValueMaterialType(null)} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="gray" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.segmentedControlWrapper}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              selectedFindingType === 'Huisvondst' && styles.activeSegmentButton,
            ]}
            onPress={() => setSelectedFindingType('Huisvondst')}
          >
            <Text
              style={[
                styles.segmentButtonText,
                selectedFindingType === 'Huisvondst' && styles.activeSegmentButtonText,
              ]}
            >
              Huisvondst
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              selectedFindingType === 'Straatvondst' && styles.activeSegmentButton,
            ]}
            onPress={handleStraatvondstSelection}
          >
            <Text
              style={[
                styles.segmentButtonText,
                selectedFindingType === 'Straatvondst' && styles.activeSegmentButtonText,
              ]}
            >
              Straatvondst
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dropDownStyle}>
          <View style={styles.dropDownContainer}>
            <TouchableOpacity style={[styles.customButton, {marginRight: 5}]} onPress={pickImages}>
              <Text style={styles.buttonText}>Foto uit gallerij</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dropDownContainer}>
            <TouchableOpacity style={[styles.customButton, {marginLeft: 5}]} onPress={takePhoto}>
              <Text style={styles.buttonText}>Maak foto</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.imageContainer}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity
                onPress={() => removeImage(uri)}
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>X</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={[styles.customButtonPlaatsen, uploading && styles.customButtonDisabled]}
          onPress={uploadToDatabase}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>
            {uploading ? 'Uploaden...' : 'Plaatsen'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* CATEGORIE MODAL */}
      <Modal visible={isCategoryModalVisible} transparent={true}>
        <TouchableWithoutFeedback onPress={() => setCategoryModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecteer categorie</Text>
                <FlatList
                  data={categories}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setValueCategory(item);
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

      {/* MATERIAALSOORT MODAL */}
      <Modal visible={isMaterialModalVisible} transparent={true}>
        <TouchableWithoutFeedback onPress={() => setMaterialModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecteer materiaaltype</Text>
                <FlatList
                  data={materialTypes}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setValueMaterialType(item);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray', 
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingRight: 40, 
    borderRadius: 5, 
  },
  inputDescription: {
    height: 100,
    textAlignVertical: 'top', 
  },
  imageContainer: {
    marginTop: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    width: '97%', 
  },
  imageWrapper: {
    flexBasis: '31%', 
    margin: '1%', 
    aspectRatio: 1, 
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  dropDownStyle: {
    flexDirection: 'row',
    width: '95%',
    marginVertical: 10, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropDownContainer: {
    flex: 1,
    maxWidth: '50%', 
  },
  dropDownButton: {
    height: 40,
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#f0f0f0',
    flex: 1, 
  },
  dropDownButtonText: {
    color: '#333',
  },
  segmentedControlWrapper: {
    width: '95%',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#7A3038',
    borderRadius: 5,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeSegmentButton: {
    backgroundColor: '#7A3038',
  },
  segmentButtonText: {
    color: '#7A3038',
    fontWeight: '600',
  },
  activeSegmentButtonText: {
    color: 'white',
  },
  segmentedControlContent: {
    marginTop: 20,
    padding: 10,
  },
  segmentedControlContentText: {
    fontSize: 16,
    fontWeight: '500',
  },
  customButton: {
    backgroundColor: '#7A3038',
    paddingVertical: 12,
    paddingHorizontal: 20, 
    borderRadius: 5, 
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center', 
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 5,
    width: '95%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white', 
    paddingVertical: 10,
  },
  customButtonPlaatsen: {
    backgroundColor: '#7A3038',
    paddingVertical: 12,
    paddingHorizontal: 20, 
    borderRadius: 5, 
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center', 
    width: '100%',
  },
  buttonText: {
    color: 'white', 
    fontSize: 15, 
    fontWeight: 'bold', 
  },
  removeButton: {
    position: 'absolute',
    top: -5, 
    right: -5, 
    backgroundColor: 'red',
    borderRadius: 15,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  customButtonDisabled: {
    backgroundColor: 'gray',
  },
  counter: {
    position: 'absolute', 
    right: 15,
    top: 15, 
    fontSize: 12,
    color: 'gray',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 0,
    margin: 0,
    borderWidth: 0,
    width: '100%',
    padding: 10,
    borderColor: 'lightgray'
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '95%',
    marginVertical: 10,
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
    paddingHorizontal: 10,
    backgroundColor: '#f0f0f0',
  },
  filterLabelText: {
    textAlign: 'center',
  },
  clearButton: {
    marginHorizontal: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end', 
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%', 
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
    maxHeight: '35%', 
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
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
});
