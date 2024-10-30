/**
 * @format
 */

import 'react-native-reanimated';
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { TamaguiProvider, createTamagui } from 'tamagui';
import { config } from '@tamagui/config/v2-native'
import { ToastProvider } from '@tamagui/toast';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const tamaguiConfig = createTamagui(config)

LogBox.ignoreLogs([
  /bad setState/,
  'Warning, duplicate ID for input',
  /Warning, duplicate ID for input/
])

const Root = () => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <TamaguiProvider config={tamaguiConfig}>
      <ToastProvider swipeDirection="up">
        <App />
      </ToastProvider>
    </TamaguiProvider>
  </GestureHandlerRootView>
);

AppRegistry.registerComponent(appName, () => Root);
