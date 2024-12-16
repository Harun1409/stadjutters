// /apps/(tabs)/chats.tsx
import {Image, StyleSheet, Platform, View, Pressable, Text, FlatList} from 'react-native';
import {ThemedText} from '@/components/ThemedText';
import {ThemedView} from '@/components/ThemedView';
import {useNavigation} from '@react-navigation/native'; // Import navigation hook
import {useSession} from '@/app/SessionContext'; // Needed to get session information (id,email etc)
import {useRouter} from 'expo-router';

export default function ChatsScreen() {
    const router = useRouter();
    const {session} = useSession();
    const navigation = useNavigation(); // Initialize navigation

    type ChatItem = {
        id: number;
        name: string;
        message: string;
        seen: boolean;
        sent: boolean;
        unreadCount: number;
        timestamp: string;
    };

    const chatPreviews: ChatItem[] = [
        {
            id: 1,
            name: 'Alice',
            message: 'Hey, how are you?',
            seen: true,
            sent: false,
            unreadCount: 2,
            timestamp: '10:45 AM',
        },
        {
            id: 2,
            name: 'Bob',
            message: 'Can we meet tomorrow?',
            seen: false,
            sent: true,
            unreadCount: 0,
            timestamp: 'Yesterday',
        },
        {
            id: 3,
            name: 'Charlie',
            message: 'Thanks for the update!',
            seen: true,
            sent: true,
            unreadCount: 0,
            timestamp: '2 days ago',
        },
        {
            id: 4,
            name: 'Harun',
            message: 'Hey, how are you?',
            seen: true,
            sent: false,
            unreadCount: 0,
            timestamp: 'One week ago',
        },
        {
            id: 5,
            name: 'Sjonnie (Masin)',
            message: 'Hey, how are you?',
            seen: true,
            sent: false,
            unreadCount: 2,
            timestamp: 'Two weeks ago',
        },
        {
            id: 6,
            name: 'Amber',
            message: 'Hey, how are you?',
            seen: true,
            sent: false,
            unreadCount: 0,
            timestamp: 'Two weeks ago',
        },
        {
            id: 7,
            name: 'Jim',
            message: 'Hey, how are you?',
            seen: true,
            sent: false,
            unreadCount: 0,
            timestamp: 'Two weeks ago',
        },
        {
            id: 8,
            name: 'Thijs',
            message: 'Hey, how are you?',
            seen: true,
            sent: false,
            unreadCount: 0,
            timestamp: 'Two weeks ago',
        },
        {
            id: 9,
            name: 'Niels',
            message: 'Hey, how are you?',
            seen: true,
            sent: false,
            unreadCount: 0,
            timestamp: 'Two weeks ago',
        },
        {
            id: 10,
            name: 'Ahmed',
            message: 'Hey, how are you?',
            seen: true,
            sent: false,
            unreadCount: 0,
            timestamp: 'Two weeks ago',
        },
        {
            id: 11,
            name: 'Masin',
            message: 'Hey, how are you?',
            seen: true,
            sent: false,
            unreadCount: 0,
            timestamp: 'Two weeks ago',
        },
        {
            id: 12,
            name: 'Jeroen',
            message: 'Hey, how are you?',
            seen: true,
            sent: false,
            unreadCount: 0,
            timestamp: 'Two weeks ago',
        },
    ];


    const renderChatItem = ({item}: { item: ChatItem }) => (
        <Pressable
            onPress={() => router.push(`/chats/${item.id}`)}
            // key={chat.id}
            style={[
                styles.chatPreview,
                !item.sent && item.unreadCount > 0
                    ? styles.unreadReceivedMessage
                    : styles.sentOrReadMessage,
            ]}
        >
            <View style={styles.textContainer}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.message}>{item.message}</Text>
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.timestamp}>{item.timestamp}</Text>
                {item.sent && <Text style={styles.seen}>{item.seen ? '✔️✔️' : '✔️'}</Text>}
                {!item.sent && item.unreadCount > 0 && (
                    <View style={styles.notificationBlip}>
                        <Text style={styles.notificationText}>{item.unreadCount}</Text>
                    </View>
                )}
            </View>
        </Pressable>
    );

    return (
        <View>
            {session && session.user ? (

                <FlatList
                    data={chatPreviews}
                    renderItem={renderChatItem}
                    keyExtractor={(item) => item.id.toString()}

                />


            ) : (
                <ThemedView style={styles.kikker}>
                    <ThemedText>Log in om je chats te bekijken!</ThemedText>
                </ThemedView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({

    kikker: {
        display: 'flex',
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center'
    },
    chatPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',

        backgroundColor: 'transparent', // Ensure no conflicting background color

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
    seen: {
        fontSize: 14,
        marginTop: 4,
    },
    sentOrReadMessage: {
        backgroundColor: '#F2F2F2',
    },
    unreadReceivedMessage: {
        backgroundColor: '#FCFCFC',
    },
    notificationBlip: {
        backgroundColor: 'red',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    notificationText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
});
