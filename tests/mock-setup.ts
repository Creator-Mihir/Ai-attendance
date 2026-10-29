import Module from 'module';

(globalThis as any).__DEV__ = true;
(globalThis as any).ErrorUtils = {
  getGlobalHandler: () => () => {},
  setGlobalHandler: () => {},
};

const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (id: string, ...args: any[]) {
  if (id === 'react-native') {
    return {
      Platform: { OS: 'android', select: (obj: any) => obj.android ?? obj.default },
      NativeModules: {},
      Dimensions: { get: () => ({ width: 360, height: 800 }) },
      StyleSheet: { create: (s: any) => s, absoluteFill: {} },
      AppRegistry: { registerComponent: () => {}, registerRunnable: () => {} },
    };
  }
  if (id === 'expo-modules-core') {
    return {
      Platform: { OS: 'android', select: (obj: any) => obj.android ?? obj.default },
      requireNativeModule: () => ({
        EncryptionKey: class {},
        SealedData: class {},
        getRandomValues: (array: Uint8Array) => {
          for (let i = 0; i < array.length; i++) array[i] = Math.floor(Math.random() * 256);
          return array;
        },
      }),
      requireOptionalNativeModule: () => null,
      UnavailabilityError: class UnavailabilityError extends Error {},
    };
  }
  return originalRequire.apply(this, [id, ...args]);
};
