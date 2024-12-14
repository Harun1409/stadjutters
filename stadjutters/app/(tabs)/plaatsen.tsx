import { Image, StyleSheet, Button, Text, View, TextInput, TouchableWithoutFeedback, Keyboard, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; 
import React, { useState } from 'react';
import { useSession } from '../SessionContext'; // Custom hook to get session
import { supabase } from '../../lib/supabase'; // Correct import from your supabase.tsx file
import * as FileSystem from 'expo-file-system'; // allows you to read files from the local file system and then create a blob-like object for upload.
import { Buffer } from 'buffer';
import { title } from 'process';
import { text } from 'stream/consumers';
global.Buffer = Buffer;

export default function HomeScreen() {
  const { session } = useSession(); // Assuming this provides session info (user ID)
  const [titlePlaatsen, onChangeTitle] = React.useState('');
  const [descriptionPlaatsen, onChangeDescription] = React.useState('');
  const [image, setImage] = useState<string | null>(null); // Holds the image URI
  const [uploading, setUploading] = useState(false); // Uploading state
  
  // Function to pick image from gallery
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permission to access camera roll is required!');
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

  // Function to take a new photo
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permission to access the camera is required!');
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

  // Function to upload the image to Supabase
  const uploadToDatabase = async () => {
    if (!image) {
        alert('No image selected');
        return;
    }

    setUploading(true);

    const fileName = image.split('/').pop();
    const fileExt = fileName?.split('.').pop() || 'jpeg';
    const filePath = `public/${Date.now()}.${fileExt}`;
    console.log("Uploading image:", { uri: image, fileName, filePath });

    try {
        // Read file directly as binary
        const fileContent = await FileSystem.readAsStringAsync(image, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const buffer = Buffer.from(fileContent, 'base64');

        console.log("Buffer created for upload:", buffer.byteLength);

        // Upload file to Supabase
        const { data, error } = await supabase.storage
            .from('UserUploadedImages')
            .upload(filePath, buffer, {
                contentType: `image/${fileExt}`,
                cacheControl: '3600',
                upsert: false,
            });

        if (error) throw error;

        console.log('Upload successful:', data);

        // Get public URL of the uploaded file
        const publicUrl = supabase.storage
            .from('UserUploadedImages')
            .getPublicUrl(filePath).data.publicUrl;

        console.log('Image public URL:', publicUrl);

          // Insert image metadata into the database
          console.log("User ID:", session?.user?.id);
        const { error: dbError } = await supabase
            .from('findings')
            .insert([
                {
                    image_url: publicUrl,
                    uid: session?.user.id,
                    title: titlePlaatsen,
                    description: descriptionPlaatsen,
                },
            ]);

        if (dbError) throw dbError;

        alert('Image uploaded and stored successfully!');
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image');
    } finally {
        setUploading(false);
    }
};



  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.kikker}>
        <TextInput 
        style={styles.input} 
        onChangeText={onChangeTitle} 
        value={titlePlaatsen} 
        placeholder="Titel"/>
        <TextInput
          editable
          multiline
          numberOfLines={4}
          maxLength={150}
          style={styles.inputDescription}
          onChangeText={onChangeDescription}
          value={descriptionPlaatsen}
          placeholder="Beschrijving"
        />
        <TextInput 
        editable 
        maxLength={150} 
        style={styles.input} 
        placeholder="Locatie" />

        <Button title="Kies een afbeelding uit de Galerij" onPress={pickImage} />
        <Button title="Maak een foto" onPress={takePhoto} />

        {image && (
          <View style={styles.imageContainer}>
            <Text>Selected Image:</Text>
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
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    margin: 12,
    borderWidth: 1,
    width: '85%',
    padding: 10,
  },
  inputDescription: {
    margin: 12,
    borderWidth: 1,
    width: '85%',
    height: 80,
    padding: 10,
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
});
