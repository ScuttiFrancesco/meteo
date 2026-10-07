import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.fra.meteoalert',
  appName: 'Meteo Alert',
  webDir: 'www',
  plugins: {
    BackgroundRunner: {
      label: 'it.fra.meteoalert.check',
      src: 'runners/runner.js',
      event: 'checkMeteo',
      repeat: true,
      interval: 30,      
      autoStart: true,
    },
  }
};

export default config;
