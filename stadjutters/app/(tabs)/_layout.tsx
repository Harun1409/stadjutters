import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Platform, View, StyleSheet, TouchableOpacity } from 'react-native';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Menu from '../menu';


export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => {
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

  return (
    <View style={styles.container}>
      {menuVisible && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayTouchable} onPress={closeMenu} />
          <Menu visible={menuVisible} closeMenu={closeMenu} session={null} />
        </View>
      )}
      {!menuVisible && <Menu visible={menuVisible} closeMenu={closeMenu} session={null} />}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#7A3038',
          headerShown: true,
          headerTitleAlign: 'center',
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              position: 'absolute',
            },
            default: {},
          }),
          headerRight: () => (
            <Icon 
            size={28} name="account" 
            onPress={openMenu} 
            style={{ color: '#7A3038', marginRight: 10 }}/>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            headerTitle: 'Home',
            headerStyle: { 
              backgroundColor: 'whitesmoke', // Background color of the header 
              borderBottomWidth: 1, // Add top border width 
              borderBottomColor: 'lightgray', // Specify the border color
            },
            tabBarIcon: ({ color }) => <Icon size={28} name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="vondsten"
          options={{
            title: 'Vondsten',
            headerTitle: 'Vondsten',
            headerStyle: { 
              backgroundColor: 'whitesmoke', // Background color of the header 
              borderBottomWidth: 1, // Add top border width 
              borderBottomColor: 'lightgray', // Specify the border color
            },
            tabBarIcon: ({ color }) => <Icon size={28} name="map-marker" color={color} />,
          }}
        />
        <Tabs.Screen
          name="plaatsen"
          options={{
            title: 'Plaatsen',
            headerTitle: 'Plaatsen',
            headerStyle: { 
              backgroundColor: 'whitesmoke', // Background color of the header 
              borderBottomWidth: 1, // Add top border width 
              borderBottomColor: 'lightgray', // Specify the border color
            },
            tabBarIcon: ({ color }) => <Icon size={28} name="plus" color={color} />,
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: 'Chats',
            headerTitle: 'Chats',
            headerStyle: { 
              backgroundColor: 'whitesmoke', // Background color of the header 
              borderBottomWidth: 1, // Add top border width 
              borderBottomColor: 'lightgray', // Specify the border color
            },
            tabBarIcon: ({ color }) => <Icon size={28} name="message" color={color} />,
          }}
        />
        <Tabs.Screen
          name="meldingen"
          options={{
            title: 'Meldingen',
            headerTitle: 'Meldingen',
            headerStyle: { 
              backgroundColor: 'whitesmoke', // Background color of the header 
              borderBottomWidth: 1, // Add top border width 
              borderBottomColor: 'lightgray', // Specify the border color
            },
            tabBarIcon: ({ color }) => <Icon size={28} name="bell" color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
});
