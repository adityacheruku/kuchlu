
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kuchlu.app',
  appName: 'Kuchlu',
  webDir: 'out', // Point to the Next.js static export directory
  server: {
    // This is for live-reloading on a physical device.
    // You may need to replace '192.168.1.100' with your computer's local IP address.
    url: 'http://192.168.1.100:9002',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 4000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    Permissions: {
      permissions: ["microphone"],
    },
  },
  android: {
    permissions: [
      {
        name: "android.permission.RECORD_AUDIO",
        alias: "MICROPHONE"
      }
    ]
  }
};

export default config;
