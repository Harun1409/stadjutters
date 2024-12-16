import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { usePathname } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

const fetchMessages = async (userId: string, chatPartnerId: string) => {
    const { data, error } = await supabase
        .from('chatmessage')
        .select('*')
        .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${chatPartnerId}),and(sender_id.eq.${chatPartnerId},receiver_id.eq.${userId})`
        )
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching messages:', error);
        return [];
    }

    return data;
};

const sendMessageToBackend = async (
    senderId: string,
    receiverId: string,
    messageContent: string
) => {
    const { data, error } = await supabase
        .from('chatmessage')
        .insert([
            {
                sender_id: senderId,
                receiver_id: receiverId,
                message_content: messageContent,
                is_read: false,
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
    const receiverId = pathname.split('/').pop();
    const [session, setSession] = useState<Session | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputMessage, setInputMessage] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            const { data } = await supabase.auth.getSession();
            setSession(data.session);
        };

        const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
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
                setMessages(fetchedMessages);
                setLoading(false);
            }
        };

        loadMessages();
    }, [session, receiverId]);

    useEffect(() => {
        const setupRealTime = async () => {
            if (!session?.user?.id || !receiverId) return;

            const subscription = supabase
                .channel('realtime-chat')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'chatmessage',
                        filter: `sender_id=eq.${receiverId},receiver_id=eq.${receiverId}`,
                    },
                    (payload) => {
                        const newMessage = payload.new;
                        setMessages((prevMessages) => [...prevMessages, newMessage]);
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

        setMessages((prev) => [...prev, newMessage]);

        const { data, error } = await supabase.from('chatmessage').insert([newMessage]).select('*').single();

        if (error) {
            console.error('Error sending message:', error);
            setMessages((prev) => prev.filter((msg) => msg !== newMessage));
        }

        setInputMessage('');
    };

    const handleReport = () => {
        Alert.alert(
            'Rapporteren',
            'Weet u zeker dat u deze gebruiker wilt rapporteren?',
            [
                {
                    text: 'Ja',
                    onPress: () => console.log('User reported'),

                },
                {
                    text: 'Annuleren',
                    onPress: () => console.log('Report cancelled'),
                    style: 'cancel',
                },
            ],
            { cancelable: false }
        );
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
            <View style={styles.header}>
                <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
                    <Text style={styles.reportButtonText}>Report</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={messages}
                keyExtractor={(item, index) => (item.id ? item.id.toString() : `temp-${index}`)}
                renderItem={({ item }) => (
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
                contentContainerStyle={{ paddingBottom: 10 }}
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    headerText: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
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
    reportButton: {
        backgroundColor: 'red',
        padding: 10,
        borderRadius: 5,
        alignSelf: 'center',

    },
    reportButtonText: {
        color: 'white',
        fontSize: 12,
    },
});