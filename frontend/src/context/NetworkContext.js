import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { showToast } from '../components/Toast';

const NetworkContext = createContext({
  isConnected: true,
  isInternetReachable: true,
  isOffline: false,
  withNetworkCheck: (fn) => fn,
});

export function NetworkProvider({ children }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const isOffline = !isConnected || isInternetReachable === false;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });
    return unsubscribe;
  }, []);

  // Show toast when going offline/online
  useEffect(() => {
    if (isOffline) {
      showToast({ message: 'You are offline. Some features may be unavailable.', type: 'warning' });
    }
  }, [isOffline]);

  /**
   * Wraps an async action — blocks execution if offline and shows a toast.
   * Returns the result of `fn` if online, or `undefined` if offline.
   */
  const withNetworkCheck = useCallback(
    (fn) => {
      if (isOffline) {
        showToast({ message: 'No internet connection. Please try again when online.', type: 'error' });
        return undefined;
      }
      return fn();
    },
    [isOffline]
  );

  return (
    <NetworkContext.Provider
      value={{ isConnected, isInternetReachable, isOffline, withNetworkCheck }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

export default NetworkContext;
