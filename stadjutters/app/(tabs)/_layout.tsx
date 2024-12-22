import React, {useEffect, useState} from 'react';
import { Platform, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import Menu from '../menu';
import { supabase } from '@/lib/supabase';
import { Text } from 'react-native';

export default function TabLayout() {
    const [menuVisible, setMenuVisible] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const openMenu = () => setMenuVisible(true);
    const closeMenu = () => setMenuVisible(false);

    const commonScreenOptions: BottomTabNavigationOptions = {
        headerStyle: {
            backgroundColor: 'whitesmoke',
            borderBottomWidth: 1,
            borderBottomColor: 'lightgray',
        },
        tabBarActiveTintColor: '#636F3C',
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
            default: {},
        }),
    };

    // Fetch unread messages count
    useEffect(() => {
        const fetchUnreadCount = async () => {
            const { data, error } = await supabase
                .from('chatmessage')
                .select('id', { count: 'exact' })
                .eq('is_read', false)
                .eq('receiver_id', 'current_user_id'); // Replace with your user's ID dynamically

            if (!error) {
                setUnreadCount(data.length || 0);
            }
        };

        fetchUnreadCount();

        // Optionally subscribe to real-time changes
        const subscription = supabase
            .channel('realtime-chats')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chatmessage' }, () => {
                fetchUnreadCount();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Custom tab icon for Chats with notification blip
    const ChatsTabIcon = ({ color, focused }: { color: string; focused: boolean }) => (
        <View>
            <Icon name="message" size={28} color={color} />
            {unreadCount > 0 && !focused && (
                <View style={styles.notificationBlip}>
                    <Text style={styles.notificationText}>{unreadCount}</Text>
                </View>
            )}
        </View>
    );

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
                    ...commonScreenOptions,
                    headerTitleAlign: 'center',
                    headerRight: () => (
                        <Icon
                            name="account"
                            size={28}
                            color="#636F3C"
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
                        customIcon: ChatsTabIcon, // Add custom icon for Chats
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
                            // tabBarIcon: ({ color }) => (
                            //     <Icon name={tab.icon} size={28} color={color} />
                            // ),
                            tabBarIcon: tab.customIcon
                                ? (props) => tab.customIcon(props)
                                : ({ color }) => <Icon name={tab.icon} size={28} color={color} />,
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
    notificationBlip: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#7a1818',
        borderRadius: 12,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});