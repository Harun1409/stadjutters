import { createStackNavigator } from '@react-navigation/stack';
import ChatsScreen from '@/app/(tabs)/chats';
import LoginScreen from '@/app/login';

const Stack = createStackNavigator();

export default function AppNavigator() {
    return (
        <Stack.Navigator>
            <Stack.Screen name="Chats" component={ChatsScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
    );
}