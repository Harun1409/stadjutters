import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Platform, TouchableOpacity} from 'react-native';
import Animated, {Easing, useSharedValue, useAnimatedStyle, withTiming, runOnJS} from 'react-native-reanimated';
import {PanGestureHandler, GestureHandlerRootView, PanGestureHandlerGestureEvent} from 'react-native-gesture-handler';
import {Link, router} from 'expo-router';
import {useSession} from './SessionContext';
import {supabase} from '@/lib/supabase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface MenuProps {
    visible: boolean;
    closeMenu: () => void;
}

const Menu: React.FC<MenuProps> = ({visible, closeMenu}) => {
    const {session} = useSession();
    const [username, setUsername] = useState('');
    const translateX = useSharedValue(250);
    const iconColor = '#7A3038';

    // Animatie voor het menu
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{translateX: translateX.value}],
    }));

    // Animatie activeren bij zichtbaarheid
    useEffect(() => {
        translateX.value = withTiming(visible ? 0 : 250, {
            duration: 300,
            easing: Easing.inOut(Easing.ease),
        });
    }, [visible]);

    // Gebruikersnaam ophalen
    useEffect(() => {
        const fetchUsername = async () => {
            if (!session?.user?.id) return;

            const {data, error} = await supabase
                .from('profiles')
                .select('username')
                .eq('id', session.user.id)
                .single();

            if (data) {
                setUsername(data.username);
            } else if (error) {
                console.error('Error fetching username:', error.message);
            }
        };

        fetchUsername();
    }, [session]);

    // Sluit het menu als de gebruiker naar links swipet
    const handleGesture = (event: PanGestureHandlerGestureEvent) => {
        if (event.nativeEvent.translationX < -100) {
            runOnJS(closeMenu)();
        }
    };

    if (!visible) return null;

    const menuTopPosition = Platform.OS === 'ios' ? 90 : 92;

    // Generieke component voor menu-items
    const MenuItem = ({ icon, label, route }: { icon: string; label: string; route: string }) => (
        <TouchableOpacity style={styles.clickableArea} onPress={() => router.push(route as any)}>
            <Icon size={25} name={icon} color={iconColor} style={styles.menuIcon} />
            <Text style={styles.menuItem}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <GestureHandlerRootView style={[styles.menuWrapper, { top: menuTopPosition }]}>
            <PanGestureHandler onGestureEvent={handleGesture}>
                <Animated.View style={[styles.menu, animatedStyle]}>
                    <View style={styles.menuUser}>
                        {session ? (
                            <>
                                <Text style={styles.menuUserName}>{username || session.user.email}</Text>
                                <Text style={styles.menuUserEmail}>{session.user.email}</Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.menuNotLoggedInHeader}>Welkom bij Stadsjutters Almere!</Text>
                                <Text style={styles.menuUserEmail}>
                                    Log in om optimaal te profiteren van alle functionaliteiten van ons platform en om
                                    actief deel te nemen aan het hergebruiken van materialen in Almere.
                                </Text>
                            </>
                        )}
                    </View>
                    <View style={styles.menuItems}>
                        {session ? (
                            <>
                                <MenuItem icon="package" label="Mijn straat-/huisvondsten" route="/menuItems/mijnVondsten" />

                                <View style={styles.menuDivider} />

                                <MenuItem icon="star" label="Mijn beoordelingen" route="/menuItems/mijnBeoordelingen" />

                                <View style={styles.menuDivider} />

                                <MenuItem icon="bookmark" label="Opgeslagen vondsten" route="/menuItems/opgeslagenVondsten" />

                                <View style={styles.menuDivider} />

                                <MenuItem icon="cog" label="Instellingen" route="/menuItems/instellingen" />

                                <View style={styles.menuDivider} />

                                <MenuItem icon="account" label="Account" route="/login" />
                            </>
                        ) : (
                            <MenuItem icon="account" label="Log in" route="/login" />
                        )}
                    </View>
                </Animated.View>
            </PanGestureHandler>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    clickableArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 5,
        width: '100%',
    },
    menuDivider: {
        height: 1,
        backgroundColor: 'lightgray',
        width: '100%',
        marginVertical: 8,
    },
    menuWrapper: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 320,
        zIndex: 2,
    },
    menu: {
        backgroundColor: 'whitesmoke',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        minHeight: '100%',
        borderLeftColor: 'lightgray',
        borderTopColor: 'lightgray',
        borderLeftWidth: 1,
        borderTopWidth: 1,
    },
    menuUser: {
        marginTop: 60,
        marginRight: 10,
        width: '90%',
    },
    menuItems: {
        marginRight: 10,
        width: '90%',
    },
    menuItem: {
        color: 'black',
        fontSize: 18,
        marginLeft: 10,
    },
    menuIcon: {
        marginRight: 2,
    },
    menuUserName: {
        fontSize: 30,
        textAlign: 'right',
        // marginBottom: 5,
        marginRight: 20,
    },
    menuNotLoggedInHeader: {
        fontSize: 18,
        textAlign: 'right',
        marginBottom: 5,
        marginRight: 20,
    },
    menuUserEmail: {
        fontSize: 12,
        textAlign: 'right',
        marginBottom: 30,
        marginRight: 20,
    },
});

export default Menu;