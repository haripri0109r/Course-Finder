import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Platform, Button, View, AppState } from 'react-native';
import { Audio } from 'expo-av';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const soundRef = useRef(null);
  const isLoadedRef = useRef(false);
  const lastPlayRef = useRef(0); 
  const appStateRef = useRef(AppState.currentState);
  const isPlayingRef = useRef(false); 

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      appStateRef.current = next;

      if (next === "active") {
        try {
          let shouldReload = false;

          if (!soundRef.current) {
            shouldReload = true;
          } else {
            const status = await soundRef.current.getStatusAsync();
            if (!status.isLoaded) {
              shouldReload = true;
            }
          }

          if (shouldReload) {
            const { sound } = await Audio.Sound.createAsync(
              require("../../assets/sounds/notification.wav"),
              { shouldPlay: false, volume: 1.0, isLooping: false }
            );

            soundRef.current = sound;
            await sound.setVolumeAsync(1.0);
          }
        } catch (e) {
          console.log("⚠️ reload sound error");
        }
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isLoadedRef.current) return;

    let isMounted = true;

    const setupAudioAndLoadSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
        });

        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/notification.wav"), 
          { shouldPlay: false, volume: 1.0, isLooping: false }
        );
        
        await sound.setVolumeAsync(1.0);

        if (isMounted) {
          soundRef.current = sound;
          isLoadedRef.current = true;
        }
      } catch (e) {
        console.log("❌ Sound load error:", e);
      }
    };

    setupAudioAndLoadSound();

    return () => {
      isMounted = false;
      if (soundRef.current) {
        try {
          soundRef.current.unloadAsync();
        } catch (e) {
          console.log("⚠️ unload error ignored");
        }
      }
    };
  }, []);

  const handleNewNotification = async (notificationData) => {
    if (Platform.OS === "web") return;

    if (appStateRef.current !== "active") return;

    const now = Date.now();
    if (now - lastPlayRef.current < 1000) return;
    lastPlayRef.current = now;

    if (__DEV__) {
      console.log("🔊 Notification sound triggered");
    }

    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    try {
      if (!soundRef.current) return;

      const status = await soundRef.current.getStatusAsync();

      if (!status.isLoaded || status.isBuffering) return;

      await soundRef.current.setPositionAsync(0);
      await soundRef.current.playAsync();

    } catch (e) {
      console.log("❌ Sound play error:", e);
    } finally {
      isPlayingRef.current = false;
    }
  };

  const TestSoundButton = () => (
    <Button
      title="Test Sound"
      onPress={async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.setPositionAsync(0);
            await soundRef.current.playAsync();
          } else {
            console.log("⚠️ Sound not ready");
          }
        } catch (e) {
          console.log("❌ Test sound error:", e);
        }
      }}
    />
  );

  return (
    <NotificationContext.Provider value={{ handleNewNotification, TestSoundButton }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
