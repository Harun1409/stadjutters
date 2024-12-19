import {
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

// Suppress the warning about VirtualizedLists (flatlists/drowpdownboxes have their own scrollview and can therefore not be wrapped in another scrollview.
// if still done an error occurs but actually does no harm. below line suppresses the warning)
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews',
]);

export default function HomeScreen() {
  const { session } = useSession();  // Assuming this provides session info (user ID)
  const [titlePlaatsen, onChangeTitle] = React.useState('');
  const [descriptionPlaatsen, onChangeDescription] = React.useState('');
  const [images, setImages] = useState<string[]>([]); // Array to hold multiple image URIs
  const [uploading, setUploading] = useState(false); // Uploading state
  const [openCategory, setOpenCategory] = useState(false);
  const [valueCategory, setValueCategory] = useState<any>(null); // For storing the selected category
  const [categories, setCategories] = useState<Category[]>([]);  // Typen van de categorieën array als Category[]
  const [openMaterialType, setOpenMaterialType] = useState(false);
  const [valueMaterialType, setValueMaterialType] = useState<any>(null);
  const [materialTypes, setmaterialTypes] = useState<MaterialType[]>([]); // Typen van de materialTypes array als MaterialType[]
  const [selectedFindingType, setselectedFindingType] = useState('Huisvondst'); // State voor de geselecteerde segmentoptie (First of Second)


  // LOCATION ------------------------------------------------
  const [userCoordinates, setUserCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

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
      //console.log('User coordinates:', location.coords);
    } catch (error) {
      console.error('Fout bij het ophalen van locatie:', error);
      alert('Kon locatie niet ophalen.');
    }
  };
  
  const handleStraatvondstSelection = () => {
    setselectedFindingType('Straatvondst');
    fetchUserLocation();
  };

  // Prepare location coordinates if applicable
  const location = userCoordinates
  ? `(${userCoordinates.latitude}, ${userCoordinates.longitude})`
  : null;
  // END LOCATION --------------------------------------------

  // Stad ophalen van profiles in schema public
  const getStadFromProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('stad')
        .eq('id', session?.user.id) // Haalt stad op voor de ingelogde gebruiker
        .single(); // Verwacht slechts één rij

      if (error) {
        console.error('Fout bij het ophalen van stad:', error);
        return null;
      }

      return data.stad; // Geeft de stad terug
    } catch (error) {
      console.error('Onverwachte fout bij het ophalen van stad:', error);
      return null;
    }
  };

  interface Category {
    id: number;
    description: string;
  }
  // Functie om categorieën op te halen van Supabase
  const retrieveCategories = async () => {
    const { data, error } = await supabase
      .from('category')
      .select('id, description'); // Verkrijg de id en description kolommen

    if (error) {
      console.error('Fout bij het ophalen van categorieën:', error);
      return;
    }
    //console.log('categorieën:', data);  // Logs de opgehaalde categorieën
    setCategories(data || []);
  };

  useEffect(() => {
    retrieveCategories(); // Haal categorieën op bij het laden van de component
  }, []);

    // Zet de categorieën om naar het formaat dat de dropdown verwacht

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.description, // Zet description om naar 'name'
  }));

  //-----------------------------------------------
// Definieer een type voor de materialTypes
  interface MaterialType {
    id: number;
    description: string;
  }

  // Functie om categorieën op te halen van Supabase
  const retrieveMaterialType = async () => {
    const { data, error } = await supabase
      .from('materialType')
      .select('id, description'); // Verkrijg de id en description kolommen

    if (error) {
      console.error('Fout bij het ophalen van materialTypes:', error);
      return;
    }

    //console.log('MaterialTypes:', data);  // Logs de opgehaalde categorieën
    setmaterialTypes(data || []); // Zet de categorieën in de staat
  };

  useEffect(() => {
    retrieveMaterialType(); // Haal categorieën op bij het laden van de component
  }, []);

    // Zet de categorieën om naar het formaat dat de dropdown verwacht
  const materialTypeOptions = materialTypes.map((materiaaltype) => ({
    id: materiaaltype.id,
    name: materiaaltype.description, // Zet description om naar 'name'
  }));
    //-----------------------------------------------

  // Functie om een afbeeldingen uit de galerij te kiezen
  const pickImages = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Toestemming voor toegang tot de filmrol is vereist!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
      selectionLimit: 3,
    });

    if (!result.canceled && result.assets) {
      const selectedImages = result.assets.map((asset) => asset.uri);
      setImages(selectedImages);
    }
  };

    // Functie om een foto te maken met de camera
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
        quality: 1,
      });
    
      if (!result.canceled && result.assets) {
        const capturedImage = result.assets.map((asset) => asset.uri);
        setImages((prevImages) => [...prevImages, ...capturedImage]);
      }
    };
    

  const removeImage = (uri: string) => {
    setImages(images.filter((image) => image !== uri));
  };

    // Functie om de afbeelding naar Supabase te uploaden
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
    if (!location) {
      alert('Locatie toestemming is vereist voor straatvondsten,');
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
        const filePath = `public/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;

        const fileContent = await FileSystem.readAsStringAsync(image, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const buffer = Buffer.from(fileContent, 'base64');

        // Upload het bestand naar Supabase
        const { data, error } = await supabase.storage
          .from('UserUploadedImages')
          .upload(filePath, buffer, {
            contentType: `image/${fileExt}`,
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        console.log('Upload successvol:', data);

        // Verkrijg de publieke URL van het geüploade bestand
        const publicUrl = supabase.storage
          .from('UserUploadedImages')
          .getPublicUrl(filePath).data.publicUrl;

        urls.push(publicUrl);
      }

      // Haal de stad op uit de gebruikersprofiel met de functie getStadFromProfile
      const stad = await getStadFromProfile();  // Haal de stad van de gebruiker

      if (!stad) {
        alert('Geef een woonplaats op in je account om door te kunnen gaan');
        return;
      }

      //console.log("User ID:", session?.user?.id);
  
       

      // Voeg metadata van de afbeelding toe aan de database
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
            location: location, // Save location
          },
        ]);

      if (dbError) throw dbError;

      alert('Afbeeldingen geüpload en succesvol opgeslagen!');
      setImages([]);
    } catch (error) {
      //console.error('Fout bij het uploaden van afbeeldingen:', error);
      alert('Fout bij het uploaden van afbeeldingen:');
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <ScrollView style={{backgroundColor: 'white'}}>
        <View style={styles.kikker}>
          <TextInput
            style={styles.input}
            onChangeText={onChangeTitle}
            value={titlePlaatsen}
            placeholder="Titel"
          />
          <TextInput
            editable
            multiline
            style={styles.inputDescription}
            onChangeText={onChangeDescription}
            value={descriptionPlaatsen}
            placeholder="Beschrijving"
          />
          <View style={styles.dropDownStyle}>
          <View style={styles.dropDownContainer}>
            <DropDownSelect
              placeholder="Categorie"
              toggle={() => setOpenCategory(!openCategory)} // Correct toggle logic
              selectedData={valueCategory}
              open={openCategory} // Use the correct state
              data={categoryOptions} // Pass fetched category data
              onSelect={(data) => {
                setValueCategory(data); // Set selected category
                setOpenCategory(false); // Close the dropdown
              }}
              dropDownContainerStyle={{
                maxHeight: 140,
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
              data={materialTypeOptions} // Pass de opgehaalde categorieën
              onSelect={(data) => {
                setValueMaterialType(data); // Zet de geselecteerde categorie in de staat
                setOpenMaterialType(false); // Sluit de dropdown
              }}
              dropDownContainerStyle={{
                maxHeight: 140,
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
              onPress={() => setselectedFindingType('Huisvondst')}
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
                <TouchableOpacity onPress={() => removeImage(uri)} style={styles.removeButton}>
                  <Text style={styles.removeButtonText}>X</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.customButtonPlaatsen, uploading && styles.customButtonDisabled]}
            onPress={uploadToDatabase}
            disabled={uploading}
          >
            <Text style={styles.buttonText}>{uploading ? 'Uploading...' : 'Plaatsen'}</Text>
          </TouchableOpacity>
          
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  // Your existing styles, plus:
  kikker: {
    display: 'flex',
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    margin: 12,
    borderWidth: 0.5,
    width: '85%',
    padding: 10,
    borderColor: 'lightgray'
  },
  inputDescription: {
    margin: 12,
    borderWidth: 0.5,
    width: '85%',
    height: 80,
    padding: 10,
    borderColor: 'lightgray'
  },
  imageContainer: {
    marginTop: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  image: {
    width: '100%', 
    height: '100%',
    borderRadius: 5, 
  },
  dropDownStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    width: '88%',
    marginVertical: 10, 
  },
  dropDownContainer: {
    flex: 1, 
    marginHorizontal: 5, 
  },
  segmentedControlWrapper: {
    width: '85%',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#3498db',
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeSegmentButton: {
    backgroundColor: '#3498db',
  },
  segmentButtonText: {
    color: '#3498db',
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
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20, 
    borderRadius: 5, 
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center', 
  },
  customButtonPlaatsen: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 20, 
    borderRadius: 5, 
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center', 
    width: '85%',
  },
  buttonText: {
    color: 'white', 
    fontSize: 15, 
    fontWeight: 'bold', 
  },
  imageWrapper: {
    position: 'relative',
    margin: 5, 
    width: 100, 
    height: 100, 
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
});
