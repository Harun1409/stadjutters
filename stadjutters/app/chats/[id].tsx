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
    Image, SectionList,
} from 'react-native';
import {usePathname} from 'expo-router';
import {supabase} from '@/lib/supabase';
import {Session} from '@supabase/supabase-js';
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

// Functie om berichten op te halen tussen de huidige gebruiker en chatpartner
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

    return data;
};

// Functie om een chat te reporten
const reportMessage = async (reportsUser: string, reportReason: string) => {
    const {data, error} = await supabase
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
    const [inputMessage, setInputMessage] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [receiverName, setReceiverName] = useState<string | null>(null);

    // Sessie ophalen
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

    // Naam andere chatgebruiker ophalen
    useEffect(() => {
        const fetchReceiverName = async () => {
            if (receiverId) {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("username")
                    .eq("id", receiverId)
                    .single();

                if (error) {
                    console.error("Error fetching receiver name:", error);
                } else {
                    setReceiverName(data?.username || "Onbekende gebruiker");
                }
            }
        };

        fetchReceiverName();
    }, [receiverId]);

    // Berichten ophalen en markeren als gelezen
    useEffect(() => {
        const loadMessages = async () => {
            if (session?.user?.id && receiverId) {
                const fetchedMessages = await fetchMessages(session.user.id, receiverId);

                // console.log('Fetched messages:', fetchedMessages); // Log alle berichten
                setMessages(fetchedMessages);

                // Alle ontvangen berichten markeren als gelezen
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
        // .select('*');

        if (error) {
            console.error('Error updating is_read:', error);
        }
        // else {
        //     console.log('Updated messages to read:', data);
        // }
    };

    // Berichten updaten in real-time
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
                        // console.log('Realtime update:', payload);
                        //
                        // if (payload.eventType === 'UPDATE') {
                        //     const updatedMessage = payload.new;
                        //
                        //     setMessages((prevMessages) =>
                        //         prevMessages.map((msg) =>
                        //             msg.id === updatedMessage.id
                        //                 ? {...msg, is_read: updatedMessage.is_read}
                        //                 : msg
                        //         )
                        //     );
                        // }

                        if (payload.eventType === 'INSERT') {
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

    // Bericht versturen
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

        // console.log('Inserted Message Response:', data); // Debug: Bekijk de geretourneerde data
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


    // Indienen van een rapport
    const handleReportSubmit = async () => {
        if (!reportReason.trim() || !session?.user?.id) {
            Alert.alert('Error', 'Geef een reden voor je rapport.');
            return;
        }

        await reportMessage(session.user.id, reportReason);
        setModalVisible(false);
        setReportReason('');
        Alert.alert('Succes', 'Gebruiker succesvol gerapporteerd.');
    };

    // Functie om berichten te groeperen op datum
    const groupMessagesByDate = (messages: any[]) => {
        return messages.reduce((groups: Record<string, any[]>, message) => {
            const date = new Date(message.created_at).toLocaleDateString("nl-NL", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(message);
            return groups;
        }, {});
    };

    if (!receiverId) {
        return (
            <View style={styles.container}>
                <Text>Geen Chat-ID opgegeven</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Berichten laden...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                {/* Report chat knop */}
                <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
                    <Icon size={25} name="flag-outline" color="#000000"/>
                    <Text style={styles.reportText}>Chat rapporteren</Text>
                </TouchableOpacity>
            </View>
            <SectionList
                sections={Object.entries(groupMessagesByDate(messages)).map(
                    ([date, messages]) => ({
                        title: date,
                        data: messages,
                    })
                )}
                keyExtractor={(item, index) => item.id || `temp-${index}`}
                renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.dateHeader}>
                        <Text style={styles.dateHeaderText}>{title}</Text>
                    </View>
                )}
                renderItem={({ item }) => (
                    <View
                        style={[
                            styles.messageBubble,
                            item.sender_id === session?.user?.id
                                ? styles.sentMessage
                                : styles.receivedMessage,
                        ]}
                    >
                        <Text style={styles.messageText}>{item.message_content}</Text>
                        <View style={styles.infoContainer}>
                            <Text style={styles.timestamp}>
                                {new Intl.DateTimeFormat("nl-NL", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                }).format(new Date(item.created_at))}
                            </Text>
                            {item.sender_id === session?.user?.id && (
                                <Icon
                                    name={"check-all"}
                                    size={18}
                                    color={item.is_read ? "#007AFF" : "#A9A9A9"}
                                    style={styles.vinkjesIcon}
                                />
                            )}
                        </View>
                    </View>
                )}
                style={styles.chatList}
                contentContainerStyle={{ paddingBottom: 10 }}
            />
            {/*<FlatList*/}
            {/*    data={messages}*/}
            {/*    keyExtractor={(item, index) => (item.id ? item.id.toString() : `temp-${index}`)}*/}
            {/*    renderItem={({item}) => (*/}
            {/*        <View*/}
            {/*            style={[*/}
            {/*                styles.messageBubble,*/}
            {/*                item.sender_id === session?.user?.id ? styles.sentMessage : styles.receivedMessage,*/}
            {/*            ]}*/}
            {/*        >*/}
            {/*            <Text style={styles.messageText}>{item.message_content}</Text>*/}
            {/*            <View style={styles.infoContainer}>*/}
            {/*                <Text style={styles.timestamp}>*/}
            {/*                    {new Date(item.created_at).toLocaleTimeString()}*/}
            {/*                </Text>*/}
            {/*                {item.sender_id === session?.user?.id && (*/}
            {/*                    <Icon*/}
            {/*                        name={"check-all"}*/}
            {/*                        size={18}*/}
            {/*                        color={item.is_read ? "#007AFF" : "#A9A9A9"} // Blauw als gelezen, grijs als niet gelezen*/}
            {/*                        style={styles.vinkjesIcon}*/}
            {/*                    />*/}
            {/*                )}*/}
            {/*            </View>*/}
            {/*        </View>*/}
            {/*    )}*/}
            {/*    style={styles.chatList}*/}
            {/*    contentContainerStyle={{paddingBottom: 10}}*/}
            {/*/>*/}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.textInput}
                    value={inputMessage}
                    onChangeText={setInputMessage}
                    placeholder="Typ een bericht..."
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                    <Text style={styles.sendButtonText}>Versturen</Text>
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
                    <Text style={styles.modalText}>Chat rapporteren</Text>
                    <TextInput
                        style={styles.modalTextInput}
                        value={reportReason}
                        onChangeText={setReportReason}
                        placeholder="Voer de reden in..."
                    />
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonClose]}
                            onPress={() => setModalVisible(!modalVisible)}
                        >
                            <Text style={styles.textStyleCancelButton}>Annuleren</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonSubmit]}
                            onPress={handleReportSubmit}
                        >
                            <Text style={styles.textStyle}>Verzenden</Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 5,
    },
    reportText: {
        fontSize: 16,
        color: '#000',
        marginLeft: 8,
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
        // backgroundColor: '#f44336',
        backgroundColor: 'white',
        borderColor: '#f44336',
        borderWidth: 1,
    },
    buttonSubmit: {
        backgroundColor: '#2196F3',
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    textStyleCancelButton: {
        color: '#f44336',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    menuIcon: {
        marginRight: 2,
    },
    vinkjesIcon: {
        marginLeft: 5,
    },
    dateHeader: {
        backgroundColor: "#F1F1F1",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        alignSelf: "center",
        marginVertical: 10,
    },
    dateHeaderText: {
        fontSize: 14,
        color: "#555",
        fontWeight: "bold",
    },
});