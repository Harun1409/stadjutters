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
    Modal,
    Alert,
    Image,
} from 'react-native';
import { usePathname } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import uuid from "expo-modules-core/src/uuid";

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

const insertReportedMessage = async (reportsUser: string, reportReason: string) => {
    const { data, error } = await supabase
        .from('reportedMessages')
        .insert([
            {
                reports_user: reportsUser,
                report_reason: reportReason,
                created_at: new Date().toISOString(),
            },
        ]);

    if (error) {
        console.error('Error inserting reported message:', error);
    } else {
        console.log('Inserted reported message:', data);
    }
};

export default function ChatPage() {
    const pathname = usePathname();
    const receiverId = pathname.split('/').pop();
    const [session, setSession] = useState<Session | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    useEffect(() => {
        console.log('Messages:', messages); // Bekijk alle berichten in de state
    }, [messages]);
    const [inputMessage, setInputMessage] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [reportReason, setReportReason] = useState('');

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
        const {data, error} = await supabase
            .from('chatmessage')
            .update({is_read: true})
            .eq('receiver_id', userId)
            .eq('sender_id', receiverId)
            .select('*'); // Ensure the updated rows are returned

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
                        const newMessage = payload.new;
                        setMessages((prevMessages) => [...prevMessages, newMessage]);
                        console.log('Realtime update:', payload);

                        if (payload.eventType === 'UPDATE') {
                            const updatedMessage = payload.new;

                            setMessages((prevMessages) =>
                                prevMessages.map((msg) =>
                                    msg.id === updatedMessage.id
                                        ? {...msg, is_read: updatedMessage.is_read}
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

        const { data, error } = await supabase.from('chatmessage').insert([newMessage]).select('*').single();

        console.log('Inserted Message Response:', data); // Debug: Bekijk de geretourneerde data
        if (error) {
            console.error('Error sending message:', error);
            // Verwijder lokaal toegevoegd bericht als het invoegen mislukt
            setMessages((prev) => prev.filter((msg) => msg !== newMessage));
        }

        setInputMessage('');
    };

    const handleReport = () => {
        setModalVisible(true);
    };

    const handleReportSubmit = async () => {
        if (!reportReason.trim() || !session?.user?.id) {
            Alert.alert('Error', 'Please provide a report reason.');
            return;
        }

        await insertReportedMessage(session.user.id, reportReason);
        setModalVisible(false);
        setReportReason('');
        Alert.alert('Success', 'User has been successfully reported.');
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
                    <Image
                        source={require('C:\\Users\\Gebruiker\\WebstormProjects\\stadjutters\\stadjutters\\assets\\images\\report-icon.jpg')}
                        style={styles.reportIcon}
                    />
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
                        <View style={styles.infoContainer}>
                            <Text style={styles.timestamp}>
                                {new Date(item.created_at).toLocaleTimeString()}
                            </Text>
                            {item.sender_id === session?.user?.id && (
                                <Text style={styles.vinkjes}>
                                    {item.is_read ? '✔️✔️' : '✔️'}
                                </Text>
                            )}
                        </View>
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
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(!modalVisible);
                }}
            >
                <View style={styles.modalView}>
                    <Text style={styles.modalText}>Report Reason</Text>
                    <TextInput
                        style={styles.modalTextInput}
                        value={reportReason}
                        onChangeText={setReportReason}
                        placeholder="Wat is de reden van je report?"
                    />
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonClose]}
                            onPress={() => setModalVisible(!modalVisible)}
                        >
                            <Text style={styles.textStyle}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonSubmit]}
                            onPress={handleReportSubmit}
                        >
                            <Text style={styles.textStyle}>Submit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    infoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
    },
    vinkjes: {
        fontSize: 14,
        color: '#555',
        marginLeft: 8,
    },
    reportButton: {
        padding: 10,
        borderRadius: 5,
        alignSelf: 'center',
    },
    reportIcon: {
        width: 24,
        height: 24,
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalTextInput: {
        width: '100%',
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 15,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        borderRadius: 20,
        padding: 10,
        elevation: 2,
    },
    buttonClose: {
        backgroundColor: '#f44336',
    },
    buttonSubmit: {
        backgroundColor: '#2196F3',
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
});