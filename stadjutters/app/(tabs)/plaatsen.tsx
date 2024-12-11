import { Image, StyleSheet, Button, Text, View, TextInput, TouchableWithoutFeedback, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; 
import React, { useState } from 'react';
import { useSession } from '../SessionContext'; // Custom hook to get session
import { supabase } from '../../lib/supabase'; // Correct import from your supabase.tsx file
import * as FileSystem from 'expo-file-system'; // allows you to read files from the local file system and then create a blob-like object for upload.

export default function HomeScreen() {
  const { session } = useSession(); // Assuming this provides session info (user ID)
  
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
    const fileExt = fileName?.split('.').pop() || 'jpeg'; // Default to 'jpeg'
    const filePath = `public/${Date.now()}.${fileExt}`;

    try {
        console.log('Reading file:', image);
        const fileContent = await FileSystem.readAsStringAsync(image, {
            encoding: FileSystem.EncodingType.Base64,
        });

        if (!fileContent) {
            console.error('Failed to read file content');
            alert('Error reading the file');
            setUploading(false);
            return;
        }

        // Convert base64 to Blob
        const blob = new Blob([Uint8Array.from(atob(fileContent), c => c.charCodeAt(0))], {
            type: `image/${fileExt}`,
        });

        console.log('Uploading image to:', filePath);

        // Upload the blob to Supabase
        const { data, error } = await supabase.storage
            .from('UserUploadedImages') // Replace with your bucket name
            .upload(filePath, blob);

        if (error) {
            console.error('Error uploading image:', error);
            alert('Error uploading image');
            setUploading(false);
            return;
        }

        console.log('Upload successful:', data);

        // Get the public URL of the uploaded image
        const publicUrl = supabase.storage
            .from('UserUploadedImages')
            .getPublicUrl(filePath).data.publicUrl;

        console.log('Image public URL:', publicUrl);

        // Insert the image URL into the database
        const { error: dbError } = await supabase
            .from('Plaatsingen') // Replace with your table name
            .insert([
                {
                    image_url: publicUrl,
                    uid: session?.user.id,
                    title: 'Image Title',
                    description: 'Image Description',
                },
            ]);

        if (dbError) {
            console.error('Error storing image URL in database:', dbError);
            alert('Error storing image URL');
        } else {
            alert('Image uploaded and stored successfully!');
        }
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
        <Text>Plaatsen</Text>

        <TextInput style={styles.input} placeholder="Titel" />
        <TextInput
          editable
          multiline
          numberOfLines={4}
          maxLength={150}
          style={styles.inputDescription}
          placeholder="Beschrijving"
        />
        <TextInput editable maxLength={150} style={styles.input} placeholder="Locatie" />

        <Button title="Pick an Image from Gallery" onPress={pickImage} />
        <Button title="Take a Photo" onPress={takePhoto} />

        {image && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.image} />
            <Text>Selected Image:</Text>
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
