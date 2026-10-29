import { create } from 'zustand';
import { NetworkService } from '../services/network.service';
import { NetworkConnectionInfo } from '../types/sync';

interface NetworkState {
  isOnline: boolean;
  isInternetReachable: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'offline' | 'unknown';
  lastChangedAt: string;
  setOnline: (online: boolean) => void;
  toggleNetwork: () => void;
  refresh: () => void;
}

const initialInfo = NetworkService.getConnectionInfo();

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOnline: initialInfo.isOnline,
  isInternetReachable: initialInfo.isInternetReachable,
  connectionType: initialInfo.connectionType,
  lastChangedAt: initialInfo.lastChangedAt,

  setOnline: (online) => {
    if (get().isOnline === online) return;
    NetworkService.setOnline(online);
    const info = NetworkService.getConnectionInfo();
    set({
      isOnline: info.isOnline,
      isInternetReachable: info.isInternetReachable,
      connectionType: info.connectionType,
      lastChangedAt: info.lastChangedAt,
    });
  },

  toggleNetwork: () => {
    const next = !get().isOnline;
    NetworkService.setOnline(next);
    const info = NetworkService.getConnectionInfo();
    set({
      isOnline: info.isOnline,
      isInternetReachable: info.isInternetReachable,
      connectionType: info.connectionType,
      lastChangedAt: info.lastChangedAt,
    });
  },

  refresh: () => {
    const info = NetworkService.getConnectionInfo();
    set({
      isOnline: info.isOnline,
      isInternetReachable: info.isInternetReachable,
      connectionType: info.connectionType,
      lastChangedAt: info.lastChangedAt,
    });
  },
}));

// Subscribe to NetworkService state changes so the Zustand store updates automatically
NetworkService.subscribe((info: NetworkConnectionInfo) => {
  useNetworkStore.setState({
    isOnline: info.isOnline,
    isInternetReachable: info.isInternetReachable,
    connectionType: info.connectionType,
    lastChangedAt: info.lastChangedAt,
  });
});

export default useNetworkStore;
