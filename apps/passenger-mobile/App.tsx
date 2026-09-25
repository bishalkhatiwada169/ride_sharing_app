import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './src/state/AuthContext';
import {RootNavigator} from './src/navigation/RootNavigator';
import {colors} from './src/theme/tokens';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.fog} />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
