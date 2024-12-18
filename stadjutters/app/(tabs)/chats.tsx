// /apps/(tabs)/chats.tsx
import {StyleSheet, View, Pressable, Text, FlatList} from 'react-native';
import React, { useEffect, useState } from 'react';
import {useSession} from '@/app/SessionContext';
import {useRouter} from 'expo-router';
import { supabase } from '@/lib/supabase';

type ChatItem = {
    id: number;
    message_content: string;
    created_at: string;
    sender_id: string;
    receiver_id: string;
    is_read: boolean;
    other_user_name: string;
};

export default function ChatsScreen() {
    const router = useRouter();
    const { session } = useSession(); // Get the current user session
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Realtime updaten
    useEffect(() => {
        const userId = session?.user?.id;
        if (!userId) return;

        const subscription = supabase
            .channel('realtime-chats')
            .on(
                'postgres_changes',
                {
                    event: '*', // Luister naar INSERT/UPDATE/DELETE
                    schema: 'public',
                    table: 'chatmessage',
                    filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`,
                },
                (payload) => {
                    console.log('Realtime update:', payload);

                    if (payload.eventType === 'INSERT') {
                        const newMessage = payload.new;
                        const chatId =
                            newMessage.sender_id === userId
                                ? newMessage.receiver_id
                                : newMessage.sender_id;

                        setChats((prevChats) => {
                            // Update bestaande chats of voeg nieuwe toe
                            const existingChatIndex = prevChats.findIndex(
                                (chat) => chat.id === chatId
                            );

                            if (existingChatIndex > -1) {
                                const updatedChats = [...prevChats];
                                updatedChats[existingChatIndex] = {
                                    ...updatedChats[existingChatIndex],
                                    message_content: newMessage.message_content,
                                    created_at: newMessage.created_at,
                                    is_read: newMessage.is_read,
                                };
                                return updatedChats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                            } else {
                                // Nieuwe chat toevoegen
                                return [
                                    {
                                        id: chatId,
                                        message_content: newMessage.message_content,
                                        created_at: newMessage.created_at,
                                        sender_id: newMessage.sender_id,
                                        receiver_id: newMessage.receiver_id,
                                        is_read: newMessage.is_read,
                                        other_user_name:
                                            newMessage.sender_id === userId
                                                ? newMessage.receiver_name
                                                : newMessage.sender_name,
                                    },
                                    ...prevChats,
                                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                            }
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [session]);


    // Fetch chat messages from Supabase
    useEffect(() => {
        const fetchChats = async () => {
            if (!session?.user?.id) return;

            try {
                const { data, error } = await supabase
                    .rpc('get_latest_chat_messages', { current_user_id: session.user.id });

                if (error) {
                    console.error('Error fetching chats:', error);
                    return;
                }

                console.log('Raw Supabase Data:', data); // Log alle data van Supabase

                const formattedChats = data.map((chat: any) => ({
                    id: chat.sender_id === session?.user?.id ? chat.receiver_id : chat.sender_id,
                    message_content: chat.message_content,
                    created_at: chat.created_at,
                    sender_id: chat.sender_id,
                    receiver_id: chat.receiver_id,
                    is_read: chat.is_read,
                    other_user_name:
                        chat.other_user_name
                }));

                console.log('Formatted Chats:', formattedChats); // Controleer of namen worden gemapt
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


    const renderChatItem = ({ item }: { item: ChatItem }) => (
        <Pressable
            onPress={() => router.push(`/chats/${item.id}`)}
            style={styles.chatPreview}
        >
            <View style={styles.textContainer}>
                <Text style={styles.name}>{item.other_user_name}</Text>
                <Text style={styles.message} numberOfLines={1} ellipsizeMode="tail">
                    {item.message_content}
                </Text>
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.timestamp}>
                    {new Date(item.created_at).toLocaleTimeString()}
                </Text>
                {/* Cirkel voor notificaties*/}
                {!item.is_read && (
                    <View style={styles.notificationBlip}>
                        <Text style={styles.notificationText}>  {item.unread_count || ''}</Text>
                    </View>
                )}
            </View>
        </Pressable>
    );

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
        padding: 16,
    },
    chatPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
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
        backgroundColor: 'red',
        borderRadius: 12,
        width: 12,
        height: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
