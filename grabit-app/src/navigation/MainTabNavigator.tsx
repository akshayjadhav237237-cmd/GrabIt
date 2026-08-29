import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { HomeScreen } from '../screens/main/HomeScreen';
import { SearchScreen } from '../screens/main/SearchScreen';
import { BookingsScreen } from '../screens/main/BookingsScreen';
import { ChatScreen } from '../screens/main/ChatScreen';
import { AddProductScreen } from '../screens/main/AddProductScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import {
  HomeIcon,
  SearchIcon,
  CalendarIcon,
  PlusIcon,
  ChatIcon,
  UserIcon,
} from '../components/icons';
import theme from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, focused }) => {
          const iconSize = 22;
          switch (route.name) {
            case 'Home':
              return <HomeIcon size={iconSize} color={color} strokeWidth={focused ? 2.5 : 2} />;
            case 'Search':
              return <SearchIcon size={iconSize} color={color} strokeWidth={focused ? 2.5 : 2} />;
            case 'Bookings':
              return <CalendarIcon size={iconSize} color={color} strokeWidth={focused ? 2.5 : 2} />;
            case 'AddProduct':
              return (
                <View style={styles.addIconContainer}>
                  <PlusIcon size={20} color={theme.colors.surface} strokeWidth={2.5} />
                </View>
              );
            case 'Chat':
              return <ChatIcon size={iconSize} color={color} strokeWidth={focused ? 2.5 : 2} />;
            case 'Profile':
              return <UserIcon size={iconSize} color={color} strokeWidth={focused ? 2.5 : 2} />;
            default:
              return <HomeIcon size={iconSize} color={color} />;
          }
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: theme.borderWidth.thin,
          paddingBottom: theme.spacing.xs,
          paddingTop: theme.spacing.xs / 2,
          height: 60,
          ...theme.shadows.sm,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.semibold,
          marginTop: -2,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          borderBottomWidth: theme.borderWidth.thin,
          borderBottomColor: theme.colors.border,
        },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: {
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.primary,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Grabit',
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Explore Gear',
          tabBarLabel: 'Search',
        }}
      />
      <Tab.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{
          title: 'List an Item',
          tabBarLabel: 'List Gear',
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          title: 'My Bookings',
          tabBarLabel: 'Bookings',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  addIconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
    ...theme.shadows.sm,
  },
});

export default MainTabNavigator;

