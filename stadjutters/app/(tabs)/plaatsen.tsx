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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect } from 'react';
import { useSession } from '../SessionContext'; // Assuming this provides session info (user ID)
import { supabase } from '../../lib/supabase'; // Correct import from your supabase.tsx file
import * as FileSystem from 'expo-file-system'; // Allows you to read files from the local file system
import { Buffer } from 'buffer';
import { DropDownSelect } from 'react-native-simple-dropdown-select'; // Assuming you have this component available
import * as Location from 'expo-location';

global.Buffer = Buffer;

// Suppress warnings about nested VirtualizedLists
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews',
]);

export default function HomeScreen() {
  const { session } = useSession(); // Assuming this provides session info (user ID)
  const [titlePlaatsen, setTitlePlaatsen] = useState('');
  const [descriptionPlaatsen, setDescriptionPlaatsen] = useState('');
  const [images, setImages] = useState<string[]>([]); // Array to hold multiple image URIs
  const [uploading, setUploading] = useState(false); // Uploading state
  const [openCategory, setOpenCategory] = useState(false);
  const [valueCategory, setValueCategory] = useState<any>(null); // Selected category
  const [categories, setCategories] = useState<Category[]>([]);
  const [openMaterialType, setOpenMaterialType] = useState(false);
  const [valueMaterialType, setValueMaterialType] = useState<any>(null);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [selectedFindingType, setSelectedFindingType] = useState('Huisvondst');
  const [userCoordinates, setUserCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const maxTitleLength = 50;
  const maxDescriptionLength = 500;

  const onChangeTitle = (text: string) => {
    if (text.length <= maxTitleLength) setTitlePlaatsen(text);
  };

  const onChangeDescription = (text: string) => {
    if (text.length <= maxDescriptionLength) setDescriptionPlaatsen(text);
  };

  // Fetch user's location if "Straatvondst" is selected
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

  // Fetch user's city from profile
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

  // Retrieve categories from Supabase
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

  // Retrieve material types from Supabase
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

  // Pick images from the gallery
  const pickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Toestemming voor toegang tot de filmrol is vereist!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.01, // Reduced quality for smaller image sizes
      selectionLimit: 3,
    });

    if (!result.canceled && result.assets) {
      const selectedImages = result.assets.map((asset) => asset.uri);
      setImages(selectedImages);
    }
  };

  // Take a photo with the camera
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

  // Upload data to Supabase
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
        const fileExt = fileName?.split('.').pop() || 'jpeg';
        const filePath = `public/${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 5)}.${fileExt}`;

        const fileContent = await FileSystem.readAsStringAsync(image, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const buffer = Buffer.from(fileContent, 'base64');

        const { data, error } = await supabase.storage
          .from('UserUploadedImages')
          .upload(filePath, buffer, {
            contentType: `image/${fileExt}`,
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
  
          {/* Description Input */}
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
          <View style={styles.dropDownStyle}>
            <View style={styles.dropDownContainer}>
              <DropDownSelect
                placeholder="Categorie"
                toggle={() => setOpenCategory(!openCategory)}
                selectedData={valueCategory}
                open={openCategory}
                data={categoryOptions}
                onSelect={(data) => {
                  setValueCategory(data);
                  setOpenCategory(false);
                }}
                dropDownContainerStyle={{
                  maxHeight: 130,
                  minWidth: 100,
                  borderWidth: 0.5,
                  borderColor: 'lightgray',
                  borderRadius: 8,
                  padding: 10,
                }}
                search
              />
            </View>
            <View style={styles.dropDownContainer}>
              <DropDownSelect
                placeholder="Materiaaltype"
                toggle={() => setOpenMaterialType(!openMaterialType)}
                selectedData={valueMaterialType}
                open={openMaterialType}
                data={materialTypeOptions}
                onSelect={(data) => {
                  setValueMaterialType(data);
                  setOpenMaterialType(false);
                }}
                dropDownContainerStyle={{
                  maxHeight: 130,
                  minWidth: 100,
                  borderWidth: 0.5,
                  borderColor: 'lightgray',
                  borderRadius: 8,
                  padding: 10,
                }}
                search
              />
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
              <TouchableOpacity style={styles.customButton} onPress={pickImages}>
                <Text style={styles.buttonText}>Foto uit gallerij</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dropDownContainer}>
              <TouchableOpacity style={styles.customButton} onPress={takePhoto}>
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
    borderColor: 'lightgray',
    borderWidth: 0.5,
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
    width: '100%',
    marginVertical: 10, 
    alignItems: 'center',
    justifyContent: 'center'
  },
  dropDownContainer: {
    marginHorizontal: 5, 
    width: '46%'
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
});
