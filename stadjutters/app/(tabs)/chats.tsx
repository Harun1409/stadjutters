// /apps/(tabs)/chats.tsx
import {StyleSheet, View, Pressable, Text, FlatList} from 'react-native';
import React, { useEffect, useState } from 'react';
import {useSession} from '@/app/SessionContext';
import {useRouter} from 'expo-router';
import { supabase } from '@/lib/supabase';

type ChatItem = {
    id: number; // Receiver ID used as the chat identifier
    message_content: string; // Last message in the chat
    created_at: string; // Timestamp of the last message
    sender_id: string; // Sender ID
    receiver_id: string; // Receiver ID
    is_read: boolean; // Read status of the last message
    other_user_name: string; // Name of the other user in the chat
};

export default function ChatsScreen() {
    const router = useRouter();
    const { session } = useSession(); // Get the current user session
    const [chats, setChats] = useState<ChatItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Fetch chat messages from Supabase
    useEffect(() => {
        const fetchChats = async () => {
            if (!session?.user?.id) return;

            try {
                const userId = session.user.id;

                console.log(userId);

                // Fetch the latest message for each conversation involving the user
                const { data, error } = await supabase
                    .rpc('get_latest_chat_messages', { current_user_id: userId });

                if (error) {
                    console.error('Error fetching chats:', error);
                    return;
                } else {
                    console.log('Fetched chats:', data);
                }

                console.log('Session:', session); // Verify session exists
                console.log('Current User ID:', session?.user?.id); // Verify user ID is passed
                console.log('Fetched chats:', data); // Check if data is being returned
                if (error) console.error('Error:', error);

                // Map results into a more usable format
                const formattedChats = data.map((chat: any) => ({
                    id: chat.sender_id === session?.user?.id ? chat.receiver_id : chat.sender_id, // Chat ID based on the other user
                    message_content: chat.message_content,
                    created_at: chat.created_at,
                    sender_id: chat.sender_id,
                    receiver_id: chat.receiver_id,
                    is_read: chat.is_read,
                    // other_user_name: chat.other_user_name, // Assume this is returned in the RPC
                    other_user_name: chat.sender_id === session?.user?.id ? chat.receiver_name : chat.sender_name, // Dynamically choose name
                }));

                setChats(formattedChats);
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
                <Text style={styles.message}>{item.message_content}</Text>
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.timestamp}>
                    {new Date(item.created_at).toLocaleTimeString()}
                </Text>
                {!item.is_read && (
                    <View style={styles.notificationBlip}>
                        <Text style={styles.notificationText}>●</Text>
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
