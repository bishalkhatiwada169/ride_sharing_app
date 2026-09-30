import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useAuth} from '../state/AuthContext';
import {useAppMode} from '../state/ModeContext';
import {SplashScreen} from '../screens/auth/SplashScreen';
import {RoleSelectScreen} from '../screens/auth/RoleSelectScreen';
import {WelcomeScreen} from '../screens/auth/WelcomeScreen';
import {PhoneScreen} from '../screens/auth/PhoneScreen';
import {OtpScreen} from '../screens/auth/OtpScreen';
import {HomeScreen} from '../screens/home/HomeScreen';
import {HistoryScreen, RideDetailScreen} from '../screens/history/HistoryScreen';
import {SafetyScreen} from '../screens/safety/SafetyScreen';
import {ProfileScreen} from '../screens/profile/ProfileScreen';
import {DriverHomeScreen} from '../screens/driver/DriverHomeScreen';
import {BookingScreen} from '../screens/ride/BookingScreen';
import {DestinationSearchScreen} from '../screens/ride/DestinationSearchScreen';
import {ActiveRideScreen} from '../screens/ride/ActiveRideScreen';
import {RatingScreen} from '../screens/ride/RatingScreen';
import {SupportScreen} from '../screens/support/SupportScreen';
import {Icon, type IconName} from '../components/ui/Icon';
import {colors, typography} from '../theme/tokens';
import type {
  AuthStackParamList,
  DriverTabParamList,
  MainTabParamList,
  RootStackParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const DriverTab = createBottomTabNavigator<DriverTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, IconName> = {
  Home: 'home',
  History: 'history',
  Profile: 'user',
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{headerShown: false, animation: 'fade_from_bottom'}}>
      <AuthStack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Phone" component={PhoneScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {...typography.label, textTransform: 'uppercase'},
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 8,
        },
        tabBarIcon: ({color}) => (
          <Icon name={TAB_ICONS[route.name]} size={22} color={color} />
        ),
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{title: 'Home'}} />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{title: 'History'}}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{title: 'More'}} />
    </Tab.Navigator>
  );
}

function DriverTabs() {
  return (
    <DriverTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {...typography.label, textTransform: 'none'},
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}>
      <DriverTab.Screen
        name="DriverHome"
        component={DriverHomeScreen}
        options={{
          title: 'Drive',
          tabBarIcon: ({color}) => <Icon name="car" size={22} color={color} />,
        }}
      />
      <DriverTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({color}) => <Icon name="user" size={22} color={color} />,
        }}
      />
    </DriverTab.Navigator>
  );
}

export function RootNavigator() {
  const {ready, session} = useAuth();
  const {ready: modeReady, mode} = useAppMode();

  if (!ready || !modeReady) {
    return (
      <View style={styles.boot}>
        <SplashScreen />
        <ActivityIndicator
          style={styles.bootSpinner}
          color={colors.primary}
        />
      </View>
    );
  }

  const driverMode = !!session && mode === 'driver';

  return (
    <NavigationContainer key={driverMode ? 'driver' : session ? 'passenger' : 'auth'}>
      <RootStack.Navigator
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: {...typography.cardTitle, color: colors.text},
          headerShadowVisible: false,
          headerStyle: {backgroundColor: colors.background},
          contentStyle: {backgroundColor: colors.background},
          animation: 'slide_from_right',
        }}>
        {!session ? (
          <RootStack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{headerShown: false}}
          />
        ) : driverMode ? (
          <RootStack.Screen
            name="DriverMain"
            component={DriverTabs}
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
              options={{headerShown: false}}
            />
            <RootStack.Screen
              name="DestinationSearch"
              component={DestinationSearchScreen}
              options={{headerShown: false, animation: 'fade_from_bottom'}}
            />
            <RootStack.Screen
              name="ActiveRide"
              component={ActiveRideScreen}
              options={{headerShown: false}}
            />
            <RootStack.Screen
              name="RideDetail"
              component={RideDetailScreen}
              options={{title: 'Trip detail'}}
            />
            <RootStack.Screen
              name="Rating"
              component={RatingScreen}
              options={{title: 'Rate your trip'}}
            />
            <RootStack.Screen
              name="Support"
              component={SupportScreen}
              options={{title: 'Support'}}
            />
            <RootStack.Screen
              name="Safety"
              component={SafetyScreen}
              options={{title: 'Safety'}}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: {flex: 1, backgroundColor: colors.background},
  bootSpinner: {position: 'absolute', alignSelf: 'center', bottom: 120},
});
