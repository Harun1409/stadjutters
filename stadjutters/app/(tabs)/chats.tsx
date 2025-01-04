// /apps/(tabs)/chats.tsx
import {StyleSheet, View, Pressable, Text, FlatList} from 'react-native';
import React, { useEffect, useState } from 'react';
import {useNavigation} from '@react-navigation/native'; // Import navigation hook
import {useSession} from '@/app/SessionContext';
import {useRouter} from 'expo-router';
import { supabase } from '@/lib/supabase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useFocusEffect } from '@react-navigation/native';

type ChatItem = {
    id: number;
    message_content: string;
    created_at: string;
    sender_id: string;
    receiver_id: string;
    is_read: boolean;
    other_user_name: string;
    unread_count: number;
};

export default function ChatsScreen() {
    const router = useRouter();
    const { session } = useSession(); // Get the current user session
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Lijst updaten in real-time
    useFocusEffect(
        React.useCallback(() => {
            const fetchChats = async () => {
                if (!session?.user?.id) return;

                try {
                    const { data, error } = await supabase.rpc(
                        'get_latest_chat_messages_with_unread_count',
                        { current_user_id: session.user.id }
                    );

                    if (error) {
                        console.error('Error fetching chats:', error);
                        return;
                    }

                    const formattedChats = data.map((chat: any) => ({
                        id: chat.sender_id === session?.user?.id ? chat.receiver_id : chat.sender_id,
                        message_content: chat.message_content,
                        created_at: chat.created_at,
                        sender_id: chat.sender_id,
                        receiver_id: chat.receiver_id,
                        unread_count: chat.unread_count || 0,
                        other_user_name: chat.other_user_name || 'Onbekende gebruiker',
                    }));

                    setChats(
                        formattedChats.sort(
                            (a: { created_at: string | number | Date; }, b: { created_at: string | number | Date; }) =>
                                new Date(b.created_at).getTime() -
                                new Date(a.created_at).getTime()
                        )
                    );
                } catch (error) {
                    console.error('Error during fetch:', error);
                }
            };

            fetchChats();
        }, [session])
    );


    // Fetch chat messages from Supabase
    useEffect(() => {
        const fetchChats = async () => {
            if (!session?.user?.id) return;

            try {
                const { data, error } = await supabase
                    // .rpc('get_latest_chat_messages', { current_user_id: session.user.id });
                    .rpc('get_latest_chat_messages_with_unread_count', { current_user_id: session.user.id });

                if (error) {
                    console.error('Error fetching chats:', error);
                    return;
                }

                // console.log('Raw Supabase Data:', data); // Log alle data van Supabase

                const formattedChats = data.map((chat: any) => ({
                    id: chat.sender_id === session?.user?.id ? chat.receiver_id : chat.sender_id,
                    message_content: chat.message_content,
                    created_at: chat.created_at,
                    sender_id: chat.sender_id,
                    receiver_id: chat.receiver_id,
                    is_read: chat.is_read,
                    unread_count: chat.unread_count || 0,
                    other_user_name:
                        chat.other_user_name || "Onbekende gebruiker",
                }));

                // console.log('Formatted Chats:', formattedChats); // Controleer of namen worden gemapt
                setChats(
                    formattedChats.sort(
                        (a: { created_at: string | number | Date; }, b: { created_at: string | number | Date; }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                );
            } catch (err) {
                console.error('Unexpected error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchChats();
    }, [session]);

    // Format timestamp
    const formatTimestamp = (timestamp: string) => {
        const messageDate = new Date(timestamp);
        const now = new Date();
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);

        if (
            messageDate.getDate() === now.getDate() &&
            messageDate.getMonth() === now.getMonth() &&
            messageDate.getFullYear() === now.getFullYear()
        ) {
            return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        if (
            messageDate.getDate() === yesterday.getDate() &&
            messageDate.getMonth() === yesterday.getMonth() &&
            messageDate.getFullYear() === yesterday.getFullYear()
        ) {
            return 'Gisteren';
        }

        // Gebruik volledig datumformaat
        return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(messageDate);
    };


    // Realtime updaten
    useEffect(() => {
        const userId = session?.user?.id;
        if (!userId) return;

        const subscription = supabase
            .channel('realtime-chats')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT', // Luister alleen naar nieuwe berichten
                    schema: 'public',
                    table: 'chatmessage',
                    filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`,
                },
                (payload) => {
                    handleRealtimeMessage(payload.new);
                    const newMessage = payload.new;
                    const chatId =
                        newMessage.sender_id === userId
                            ? newMessage.receiver_id
                            : newMessage.sender_id;

                    // Update chats met het nieuwe bericht
                    setChats((prevChats) => {
                        const chatIndex = prevChats.findIndex((chat) => chat.id === chatId);

                        if (chatIndex > -1) {
                            // Update bestaande chat
                            const updatedChats = [...prevChats];
                            updatedChats[chatIndex] = {
                                ...updatedChats[chatIndex],
                                message_content: newMessage.message_content,
                                created_at: newMessage.created_at,
                                is_read: newMessage.sender_id === userId, // Alleen markeren als gelezen voor verzonden berichten
                                unread_count:
                                    newMessage.receiver_id === userId
                                        ? updatedChats[chatIndex].unread_count + 1
                                        : updatedChats[chatIndex].unread_count,
                            };
                            return updatedChats.sort(
                                (a, b) =>
                                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                            );
                        } else {
                            // Nieuwe chat toevoegen
                            return [
                                {
                                    id: chatId,
                                    message_content: newMessage.message_content,
                                    created_at: newMessage.created_at,
                                    sender_id: newMessage.sender_id,
                                    receiver_id: newMessage.receiver_id,
                                    is_read: newMessage.sender_id === userId,
                                    unread_count: newMessage.receiver_id === userId ? 1 : 0,
                                    other_user_name:
                                        newMessage.sender_id === userId
                                            ? newMessage.receiver_name
                                            : newMessage.sender_name || "Onbekende gebruiker",
                                },
                                ...prevChats,
                            ].sort(
                                (a, b) =>
                                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                            );
                        }
                    });
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [session]);

    // Realtime message updates
    const handleRealtimeMessage = (newMessage: any) => {
        const userId = session?.user?.id;
        if (!userId) return;

        const chatId =
            newMessage.sender_id === userId
                ? newMessage.receiver_id
                : newMessage.sender_id;

        // @ts-ignore
        setChats((prevChats) => {
            const chatIndex = prevChats.findIndex((chat) => chat.id === chatId);

            if (chatIndex > -1) {
                // Update bestaande chat
                const updatedChats = [...prevChats];
                updatedChats[chatIndex] = {
                    ...updatedChats[chatIndex],
                    message_content: newMessage.message_content,
                    created_at: newMessage.created_at,
                    unread_count:
                        newMessage.receiver_id === userId
                            ? updatedChats[chatIndex].unread_count + 1
                            : updatedChats[chatIndex].unread_count,
                };
                return updatedChats.sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                );
            } else {
                // Nieuwe chat toevoegen
                return [
                    {
                        id: chatId,
                        message_content: newMessage.message_content,
                        created_at: newMessage.created_at,
                        sender_id: newMessage.sender_id,
                        receiver_id: newMessage.receiver_id,
                        unread_count: newMessage.receiver_id === userId ? 1 : 0,
                        other_user_name: newMessage.receiver_name || 'Onbekende gebruiker',
                    },
                    ...prevChats,
                ].sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                );
            }
        });
    };

    const renderChatItem = ({ item }: { item: ChatItem }) => {
        const userId = session?.user?.id;
        const isUnread = item.unread_count > 0;

        return (
            <View style={[styles.chatWrapper, { backgroundColor: isUnread ? '#fff' : '#f5f5f5' }]}>
            <Pressable
                onPress={() => router.push(`/chats/${item.id}` as any)}
                style={[
                    styles.chatPreview,
                    // { backgroundColor: isUnread ? '#fff' : '#f5f5f5' },
                ]}
            >
                <View style={styles.textContainer}>
                    <Text style={styles.name}>{item.other_user_name}</Text>
                    <Text style={styles.message} numberOfLines={1} ellipsizeMode="tail">
                        {item.message_content}
                    </Text>
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.timestamp}>{formatTimestamp(item.created_at)}</Text>
                    {isUnread ? (
                        <View style={styles.notificationBlip}>
                            <Text style={styles.notificationText}>{item.unread_count}</Text>
                        </View>
                    ) : (
                        // Toon alleen vinkjes als het bericht is verzonden door de ingelogde gebruiker
                        item.sender_id === userId && (
                            <Icon
                                name="check-all"
                                size={18}
                                color={item.is_read ? '#007AFF' : '#A9A9A9'}
                                style={styles.vinkjesIcon}
                            />
                        )
                    )}

                </View>
            </Pressable>
                </View>
        );
    };

    if (!session) {
        return (
            <View style={styles.container}>
                <Text>Log in om uw chatberichten te zien!</Text>
            </View>
        );
    }


    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading chats...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={chats}
                renderItem={renderChatItem}
                keyExtractor={(item) => item.id.toString()}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        // paddingVertical: 16,
    },
    chatWrapper: {
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    chatPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    textContainer: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    message: {
        fontSize: 14,
        color: '#555',
    },
    infoContainer: {
        alignItems: 'flex-end',
        marginLeft: 12,
    },
    timestamp: {
        fontSize: 12,
        color: '#999',
    },
    notificationBlip: {
        backgroundColor: '#7a1818',
        borderRadius: 12,
        width: 15,
        height: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    vinkjesIcon: {
        marginTop: 5,
    },
});