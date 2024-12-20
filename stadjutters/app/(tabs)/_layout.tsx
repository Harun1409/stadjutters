import React, { useState } from 'react';
import { Platform, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import Menu from '../menu';

export default function TabLayout() {
    const [menuVisible, setMenuVisible] = useState(false);

    const openMenu = () => setMenuVisible(true);

    const closeMenu = () => setMenuVisible(false);

    const tabScreenOptions = {
        headerStyle: {
            backgroundColor: 'whitesmoke',
            borderBottomWidth: 1,
            borderBottomColor: 'lightgray',
        },
        tabBarActiveTintColor: '#7A3038',
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
            ios: { position: 'absolute' },
            default: {},
        }),
    };

    return (
        <View style={styles.container}>
            {/* Overlay voor het menu */}
            {menuVisible && (
                <View style={styles.overlay}>
                    <TouchableOpacity style={styles.overlayTouchable} onPress={closeMenu} />
                    <Menu visible={menuVisible} closeMenu={closeMenu} />
                </View>
            )}
            {/* Tabs Configuratie */}
            <Tabs
                screenOptions={{
                    ...tabScreenOptions,
                    headerTitleAlign: 'center',
                    headerRight: () => (
                        <Icon
                            name="account"
                            size={28}
                            color="#7A3038"
                            style={styles.headerIcon}
                            onPress={openMenu}
                        />
                    ),
                }}
            >
                {[
                    {
                        name: 'index',
                        title: 'Home',
                        icon: 'home',
                    },
                    {
                        name: 'vondsten',
                        title: 'Vondsten',
                        icon: 'map-marker',
                    },
                    {
                        name: 'plaatsen',
                        title: 'Plaatsen',
                        icon: 'plus',
                    },
                    {
                        name: 'chats',
                        title: 'Chats',
                        icon: 'message',
                    },
                    {
                        name: 'meldingen',
                        title: 'Meldingen',
                        icon: 'bell',
                    },
                ].map((tab) => (
                    <Tabs.Screen
                        key={tab.name}
                        name={tab.name}
                        options={{
                            title: tab.title,
                            headerTitle: tab.title,
                            tabBarIcon: ({ color }) => (
                                <Icon name={tab.icon} size={28} color={color} />
                            ),
                        }}
                    />
                ))}
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
    headerIcon: {
        marginRight: 10,
    },
});