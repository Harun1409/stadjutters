import React, { useState, useEffect } from 'react';
import MapView, { Region, Marker } from 'react-native-maps';
import { StyleSheet, View, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';


const markers = [
{latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
  name: 'San Francisco',
},
{latitude: 37.8077,
  longitude: -122.475,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
  name: 'San Francisco',
},
]



export default function App() {
  // Gebruik expliciet het type Region of null
  const [location, setLocation] = useState<Region | null>(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Vraag toestemming voor toegang tot locatie
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Toestemming geweigerd', 'Toegang tot locatie is vereist om de kaart te tonen.');
        setLoading(false);
        return;
      }

      // Haal de huidige locatie op
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.05, // Zoom-niveau
        longitudeDelta: 0.05,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    // Laat een laadindicator zien terwijl de locatie wordt opgehaald
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
          initialRegion={location} // Gebruik de opgehaalde locatie als initialRegion
          showsUserLocation
        >
          {markers.map((marker, index) => (
            <Marker key={index} coordinate={marker} />
          ))}
        </MapView>
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
});
