import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bizstart.hwadam",
  appName: "칸막이Go",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    Camera: {
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DEFAULT",
      backgroundColor: "#fafaf7",
    },
    Browser: {
      presentationStyle: "fullscreen",
    },
  },
};

export default config;
