import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import Animated, {Easing, useSharedValue, useAnimatedStyle, withTiming, runOnJS} from 'react-native-reanimated';
import {PanGestureHandler, GestureHandlerRootView, PanGestureHandlerGestureEvent} from 'react-native-gesture-handler';
import {Link} from 'expo-router';
import {useSession} from './SessionContext';
import {supabase} from '@/lib/supabase'; // for communicating with database
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface MenuProps {
    visible: boolean;
    closeMenu: () => void;
}

const Menu: React.FC<MenuProps> = ({visible, closeMenu}) => {
    const {session} = useSession();
    const [username, setUsername] = useState('');
    const translateX = useSharedValue(250);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{translateX: translateX.value}],
        };
    });

    useEffect(() => {
        if (visible) {
            translateX.value = withTiming(0, {duration: 300, easing: Easing.inOut(Easing.ease)});
        } else {
            translateX.value = withTiming(250, {duration: 300, easing: Easing.inOut(Easing.ease)});
        }
    }, [visible, translateX]);

    useEffect(() => {
        const fetchUsername = async () => {
            if (session?.user?.email) {
                const {data, error} = await supabase
                    .from('profiles') // name of database table
                    .select('username')
                    .eq('id', session.user.id)
                    .single();

                if (data) {
                    setUsername(data.username);
                } else if (error) {
                    console.error('Error fetching username:', error.message);
                }
            }
        };

        fetchUsername();
    }, [session]);

    const handleGesture = (event: PanGestureHandlerGestureEvent) => {
        if (event.nativeEvent.translationX < -100) {
            runOnJS(closeMenu)();
        }
    };

    if (!visible) return null;

    // Define top position conditionally based on platform
    const menuTopPosition = Platform.OS === 'ios' ? 90 : 115;

    return (
        <GestureHandlerRootView style={[styles.menuWrapper, {top: menuTopPosition}]}>
            <PanGestureHandler onGestureEvent={handleGesture}>
                <Animated.View style={[styles.menu, animatedStyle]}>
                    <View style={styles.menuUser}>
                        {session && session.user ? (
                            <>
                                <Text style={styles.menuUserName}>{username || session.user.email}</Text>
                                <Text style={styles.menuUserEmail}>{session.user.email}</Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.menuNotLoggedInHeader}>
                                    Welkom bij Stadsjutters Almere!
                                </Text>
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
                            <View style={styles.menuItemDivider}/>
                            <View style={styles.menuItemRow}>
                                <Icon size={25} name="package" color={'#7A3038'} style={styles.menuIcon}/>
                                <Link href="./menuItems/mijnVondsten" onPress={closeMenu} style={styles.menuItem}>Mijn
                                    straat-/huisvondsten</Link>
                            </View>
                            <View style={styles.menuItemDivider}/>
                            <View style={styles.menuItemRow}>
                                <Icon size={25} name="star" color={'#7A3038'} style={styles.menuIcon}/>
                                <Link href="./menuItems/mijnBeoordelingen" onPress={closeMenu} style={styles.menuItem}>Mijn
                                    beoordelingen</Link>
                            </View>
                            <View style={styles.menuItemDivider}/>
                            <View style={styles.menuItemRow}>
                                <Icon size={25} name="bookmark" color={'#7A3038'} style={styles.menuIcon}/>
                                <Link href="./menuItems/opgeslagenVondsten" onPress={closeMenu} style={styles.menuItem}>Opgeslagen
                                    vondsten</Link>
                            </View>
                            <View style={styles.menuItemDivider}/>
                            <View style={styles.menuItemRow}>
                                <Icon size={25} name="cog" color={'#7A3038'} style={styles.menuIcon}/>
                                <Link href="./menuItems/instellingen" onPress={closeMenu}
                                      style={styles.menuItem}>Instellingen</Link>
                            </View>
                            <View style={styles.menuItemDivider}/>
                            <View style={styles.menuItemRow}>
                                <Icon size={25} name="account" color={'#7A3038'} style={styles.menuIcon}/>
                                <Link href="/login" onPress={closeMenu}
                                      style={[styles.menuItem, styles.ExtraSpacing]}>Account</Link>

                            </View>
                            </>
                        ) :
                            (<>
                            <View style={styles.menuItemRow}>
                                <Icon size={25} name="account" color={'#7A3038'} style={styles.menuIcon}/>
                                <Link href="/login" onPress={closeMenu} style={[styles.menuItem, styles.ExtraSpacing]}>Login</Link>
                            </View>
                            </>)
                        }
                    </View>
                </Animated.View>
            </PanGestureHandler>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
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
        fontSize: 20,
    },
    ExtraSpacing: {
        marginTop: 15,
        marginBottom: 15,
    },
    menuItemDivider: {
        width: '100%',
        height: 1,
        backgroundColor: 'light-grey',
        alignSelf: 'stretch',
        borderWidth: 0.5,
        borderColor: 'black',
        marginBottom: 7,
        marginTop: 7,
    },
    menuItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuIcon: {
        marginRight: 10,
    },
    menuUserName: {
        fontSize: 30,
        textAlign: 'right',
        marginBottom: 0,
        marginRight: 20,
    },
    menuNotLoggedInHeader: {
        fontSize: 18,
        textAlign: 'right',
        marginBottom: 0,
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
