import React, {useEffect, useState} from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import {usePathname} from 'expo-router';
import {supabase} from '@/lib/supabase';
import {Session} from '@supabase/supabase-js';


const fetchMessages = async (userId: string, chatPartnerId: string) => {
    const {data, error} = await supabase
        .from('chatmessage')
        .select('*')
        .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${chatPartnerId}),and(sender_id.eq.${chatPartnerId},receiver_id.eq.${userId})`
        )
        .order('created_at', {ascending: true});

    if (error) {
        console.error('Error fetching messages:', error);
        return [];
    }

    return data; // Retourneer alle berichten zonder extra filtering
};

const sendMessageToBackend = async (
    senderId: string,
    receiverId: string,
    messageContent: string
) => {
    const {data, error} = await supabase
        .from('chatmessage')
        .insert([
            {
                sender_id: senderId,
                receiver_id: receiverId,
                message_content: messageContent,
                is_read: false, // Mark as unread by default
                created_at: new Date().toISOString(),
            },
        ])
        .single();

    if (error) {
        console.error('Error sending message:', error);
        return null;
    }

    return data;
};


export default function ChatPage() {
    const pathname = usePathname();
    const receiverId = pathname.split('/').pop(); // Extract receiver ID from the URL
    const [session, setSession] = useState<Session | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    useEffect(() => {
        console.log('Messages:', messages); // Bekijk alle berichten in de state
    }, [messages]);
    const [inputMessage, setInputMessage] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Fetch the logged-in user's session
    useEffect(() => {
        const fetchSession = async () => {
            const {data} = await supabase.auth.getSession();
            setSession(data.session);
        };

        const {data: listener} = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession);
        });

        fetchSession();

        return () => {
            listener?.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const loadMessages = async () => {
            if (session?.user?.id && receiverId) {
                const fetchedMessages = await fetchMessages(session.user.id, receiverId);

                console.log('Fetched messages:', fetchedMessages); // Log alle berichten
                setMessages(fetchedMessages);

                // Mark all received messages as read
                await markMessagesAsRead(receiverId, session.user.id);

                setLoading(false);
            }
        };

        loadMessages();
    }, [session, receiverId]);

    const markMessagesAsRead = async (receiverId: string, userId: string) => {
        const { data, error } = await supabase
            .from('chatmessage')
            .update({ is_read: true })
            .eq('receiver_id', userId)
            .eq('sender_id', receiverId);

        if (error) {
            console.error('Error updating is_read:', error);
        } else {
            console.log('Updated messages to read:', data);
        }
    };

    useEffect(() => {
        const setupRealTime = async () => {
            if (!session?.user?.id || !receiverId) return;

            const subscription = supabase
                .channel('realtime-chat')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'chatmessage',
                        filter: `or(sender_id.eq.${receiverId},receiver_id.eq.${receiverId})`,
                    },
                    (payload) => {
                        console.log('Realtime update:', payload);

                        if (payload.eventType === 'UPDATE') {
                            const updatedMessage = payload.new;

                            setMessages((prevMessages) =>
                                prevMessages.map((msg) =>
                                    msg.id === updatedMessage.id
                                        ? { ...msg, is_read: updatedMessage.is_read }
                                        : msg
                                )
                            );
                        }

                        if (payload.eventType === 'INSERT') {
                            const newMessage = payload.new;

                            setMessages((prevMessages) => [...prevMessages, newMessage]);
                        }
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        };

        setupRealTime();
    }, [session?.user?.id, receiverId]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !session?.user?.id || !receiverId) return;

        const newMessage = {
            sender_id: session.user.id,
            receiver_id: receiverId,
            message_content: inputMessage,
            is_read: false,
            created_at: new Date().toISOString(),
        };

        // Voeg het bericht direct toe aan de lokale staat
        setMessages((prev) => [...prev, newMessage]);

        const {data, error} = await supabase.from('chatmessage').insert([newMessage]).select('*').single();

        console.log('Inserted Message Response:', data); // Debug: Bekijk de geretourneerde data
        if (error) {
            console.error('Error sending message:', error);
            // Verwijder lokaal toegevoegd bericht als het invoegen mislukt
            setMessages((prev) => prev.filter((msg) => msg !== newMessage));
        }

        setInputMessage('');
    };

    if (!receiverId) {
        return (
            <View style={styles.container}>
                <Text>No chat ID provided</Text>
            </View>
        );
    }


    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <FlatList
                data={messages}
                // keyExtractor={(item) => item.id.toString()}
                keyExtractor={(item, index) => (item.id ? item.id.toString() : `temp-${index}`)}
                renderItem={({item}) => (
                    <View
                        style={[
                            styles.messageBubble,
                            item.sender_id === session?.user?.id ? styles.sentMessage : styles.receivedMessage,
                        ]}
                    >
                        <Text style={styles.messageText}>{item.message_content}</Text>
                        <Text style={styles.timestamp}>
                            {new Date(item.created_at).toLocaleTimeString()}
                        </Text>
                    </View>
                )}
                style={styles.chatList}
                contentContainerStyle={{paddingBottom: 10}}
            />

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.textInput}
                    value={inputMessage}
                    onChangeText={setInputMessage}
                    placeholder="Type a message..."
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    chatList: {
        flex: 1,
        padding: 10,
    },
    messageBubble: {
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
        maxWidth: '80%',
        alignSelf: 'flex-start',
    },
    sentMessage: {
        backgroundColor: '#DCF8C6',
        alignSelf: 'flex-end',
    },
    receivedMessage: {
        backgroundColor: '#F1F1F1',
    },
    messageText: {
        fontSize: 16,
        color: '#000',
    },
    timestamp: {
        fontSize: 12,
        color: '#555',
        textAlign: 'right',
        marginTop: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    textInput: {
        flex: 1,
        height: 40,
        paddingHorizontal: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#f9f9f9',
    },
    sendButton: {
        marginLeft: 10,
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#007AFF',
        borderRadius: 20,
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});