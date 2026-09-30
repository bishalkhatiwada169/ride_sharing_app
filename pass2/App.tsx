import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './src/state/AuthContext';
import {ModeProvider} from './src/state/ModeContext';
import {RootNavigator} from './src/navigation/RootNavigator';
import {colors} from './src/theme/tokens';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ModeProvider>
          <StatusBar
            barStyle="light-content"
            backgroundColor={colors.background}
          />
          <RootNavigator />
        </ModeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
