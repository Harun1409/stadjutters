import React, { useState, useEffect } from 'react';
import MapView, { Region, Marker } from 'react-native-maps';
import { StyleSheet, View, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';

interface Finding {
  id: string;
  title: string;
  location: string;
}

export default function App() {
  const [location, setLocation] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState<Finding[]>([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Toestemming geweigerd', 'Toegang tot locatie is vereist om de kaart te tonen.');
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
        .select('id, title, location')
        .eq('findingTypeId', 'Straatvondst');

      if (error) {
        console.error('Error bij het verkrijgen van markers:', error);
        return;
      }

      const validMarkers = data.filter((finding: Finding) => finding.location);
      setMarkers(validMarkers);
    };

    fetchMarkers();
  }, []);

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
                title={marker.title}
              />
            );
          })}
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
