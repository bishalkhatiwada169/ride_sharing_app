import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {ActivityIndicator, View} from 'react-native';
import {useAuth} from '../state/AuthContext';
import {SplashScreen, PhoneScreen} from '../screens/auth/PhoneScreen';
import {OtpScreen} from '../screens/auth/OtpScreen';
import {HomeScreen} from '../screens/home/HomeScreen';
import {HistoryScreen, RideDetailScreen} from '../screens/history/HistoryScreen';
import {SafetyScreen} from '../screens/safety/SafetyScreen';
import {ProfileScreen} from '../screens/profile/ProfileScreen';
import {BookingScreen} from '../screens/ride/BookingScreen';
import {ActiveRideScreen} from '../screens/ride/ActiveRideScreen';
import {RatingScreen} from '../screens/ride/RatingScreen';
import {SupportScreen} from '../screens/support/SupportScreen';
import {colors} from '../theme/tokens';
import type {
  AuthStackParamList,
  MainTabParamList,
  RootStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{headerShown: false}}>
      <AuthStack.Screen name="Phone" component={PhoneScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: {
          borderTopColor: colors.line,
          backgroundColor: colors.surface,
        },
      }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Safety" component={SafetyScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const {ready, session} = useAuth();

  if (!ready) {
    return (
      <View style={{flex: 1}}>
        <SplashScreen />
        <ActivityIndicator
          style={{position: 'absolute', alignSelf: 'center', bottom: 120}}
          color={colors.accent}
        />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator>
        {!session ? (
          <RootStack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{headerShown: false}}
          />
        ) : (
          <>
            <RootStack.Screen
              name="Main"
              component={MainTabs}
              options={{headerShown: false}}
            />
            <RootStack.Screen
              name="Booking"
              component={BookingScreen}
              options={{title: 'Book'}}
            />
            <RootStack.Screen
              name="ActiveRide"
              component={ActiveRideScreen}
              options={{title: 'Trip'}}
            />
            <RootStack.Screen
              name="RideDetail"
              component={RideDetailScreen}
              options={{title: 'Trip detail'}}
            />
            <RootStack.Screen
              name="Rating"
              component={RatingScreen}
              options={{title: 'Rate'}}
            />
            <RootStack.Screen
              name="Support"
              component={SupportScreen}
              options={{title: 'Support'}}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
