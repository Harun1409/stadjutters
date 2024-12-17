import { Image, StyleSheet, Button, Text, View, TextInput, TouchableWithoutFeedback, Keyboard, FlatList, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; 
import React, { useState, useEffect } from 'react';
import { useSession } from '../SessionContext'; // Assuming this provides session info (user ID)
import { supabase } from '../../lib/supabase'; // Correct import from your supabase.tsx file
import * as FileSystem from 'expo-file-system'; // Allows you to read files from the local file system
import { Buffer } from 'buffer';
import { DropDownSelect } from 'react-native-simple-dropdown-select'; // Assuming you have this component available
global.Buffer = Buffer;


export default function HomeScreen() {
  const { session } = useSession(); // Assuming this provides session info (user ID)
  const [titlePlaatsen, onChangeTitle] = React.useState('');
  const [descriptionPlaatsen, onChangeDescription] = React.useState('');
  const [image, setImage] = useState<string | null>(null); // Holds the image URI
  const [uploading, setUploading] = useState(false); // Uploading state
  const [openCategory, setOpenCategory] = useState(false);
  const [valueCategory, setValueCategory] = useState<any>(null); // For storing the selected category
  const [categories, setCategories] = useState<Category[]>([]); // Typen van de categorieën array als Category[]
  const [openMaterialType, setOpenMaterialType] = useState(false);
  const [valueMaterialType, setValueMaterialType] = useState<any>(null);
  const [materialTypes, setmaterialTypes] = useState<MaterialType[]>([]); // Typen van de materialTypes array als MaterialType[]

//--------------------
const [selectedLanguage, setSelectedLanguage] = useState();
//--------------------

  interface Category {
    id: number;
    description: string;
  }

  // Functie om categorieën op te halen van Supabase
  const retrieveCategories = async () => {
    const { data, error } = await supabase
      .from('category')
      .select('id, description');  // Verkrijg de id en description kolommen

    if (error) {
      console.error('Fout bij het ophalen van categorieën:', error);
      return;
    }

    console.log('categorieën:', data);  // Logs de opgehaalde categorieën
    setCategories(data || []);  // Zet de categorieën in de staat
  };

  useEffect(() => {
    retrieveCategories(); // Haal categorieën op bij het laden van de component
  }, []);

  // Zet de categorieën om naar het formaat dat de dropdown verwacht
  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.description,  // Zet description om naar 'name'
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
      .select('id, description');  // Verkrijg de id en description kolommen

    if (error) {
      console.error('Fout bij het ophalen van materialTypes:', error);
      return;
    }

    console.log('MaterialTypes:', data);  // Logs de opgehaalde categorieën
    setmaterialTypes(data || []);  // Zet de categorieën in de staat
  };

  useEffect(() => {
    retrieveMaterialType(); // Haal categorieën op bij het laden van de component
  }, []);

  // Zet de categorieën om naar het formaat dat de dropdown verwacht
  const materialTypeOptions = materialTypes.map((materiaaltype) => ({
    id: materiaaltype.id,
    name: materiaaltype.description,  // Zet description om naar 'name'
  }));
  //-----------------------------------------------

  // Functie om een afbeelding uit de galerij te kiezen
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Toestemming voor toegang tot de filmrol is vereist!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setImage(result.assets[0].uri);
    }
  };

  // Functie om een nieuwe foto te maken
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Toestemming voor toegang tot de filmrol is vereist!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setImage(result.assets[0].uri);
    }
  };

  // Functie om de afbeelding naar Supabase te uploaden
  const uploadToDatabase = async () => {
    if (!image) {
      alert('Geen afbeelding geselecteerd');
      return;
    }

    setUploading(true);

    const fileName = image.split('/').pop();
    const fileExt = fileName?.split('.').pop() || 'jpeg';
    const filePath = `public/${Date.now()}.${fileExt}`;
    console.log("Afbeelding uploaden:", { uri: image, fileName, filePath });

    try {
      // Lees het bestand als base64
      const fileContent = await FileSystem.readAsStringAsync(image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const buffer = Buffer.from(fileContent, 'base64');

      console.log("Buffer gemaakt voor uploaden:", buffer.byteLength);

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

      console.log('Image public URL:', publicUrl);

      // Voeg metadata van de afbeelding toe aan de database
      console.log("User ID:", session?.user?.id);
      const { error: dbError } = await supabase
        .from('findings')
        .insert([
          {
            image_url: publicUrl,
            uid: session?.user.id,
            title: titlePlaatsen,
            description: descriptionPlaatsen,
            categoryId: valueCategory?.id,
            materialTypeId: valueMaterialType?.id
          },
        ]);

      if (dbError) throw dbError;

      alert('Afbeelding geüpload en succesvol opgeslagen!');
    } catch (error) {
      console.error('Fout bij het uploaden van afbeelding:', error);
      alert('Fout bij het uploaden van afbeelding:');
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} >
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
        <TextInput 
          editable 
          maxLength={150} 
          style={styles.input} 
          placeholder="Locatie" 
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
                maxHeight: 200,
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
                maxHeight: 200,
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
        <Button title="Kies een afbeelding uit de Galerij" onPress={pickImage} />
        <Button title="Maak een foto" onPress={takePhoto} />

        {image && (
          <View style={styles.imageContainer}>
            <Text>Geselecteerde afbeelding:</Text>
            <Image source={{ uri: image }} style={styles.image} />
          </View>
        )}

        <Button title="Plaatsen" onPress={uploadToDatabase} disabled={uploading} />
        {uploading && <Text>Uploading...</Text>}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  kikker: {
    display: 'flex',
    // flex: 1,
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
    marginTop: 20,
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  dropDownStyle: {
    flexDirection: 'row', // Zorgt ervoor dat de elementen naast elkaar komen
    justifyContent: 'space-between', // Ruimte tussen de dropdowns
    alignItems: 'center', // Optioneel: om de items verticaal te centreren
    width: '88%',
    marginVertical: 10, // Voeg wat verticale ruimte toe
  },
  dropDownContainer: {
    flex: 1, // Zorgt ervoor dat beide dropdowns evenveel ruimte innemen
    marginHorizontal: 5, // Voeg wat ruimte tussen de dropdowns toe
  },
});
