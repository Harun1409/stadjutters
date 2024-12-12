import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSearchParams} from "expo-router/build/hooks";

type ChatParams = {
    id: string;
};


export default function ChatPage() {

    // Use `unknown` first to bypass TypeScript's strict checks
    const searchParams = useSearchParams();
    const { id } = searchParams as unknown as Record<keyof ChatParams, string>;


    // Handle missing `id`
    if (!id) {
        return (
            <View style={styles.container}>
                <Text>No chat ID provided</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Chat with User {id}</Text>
            {/* Add your chat interface here */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
    },
});