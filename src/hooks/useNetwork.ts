import { useNetworkStore } from '../store/network.store';

export function useNetwork() {
  const { isOnline, isInternetReachable, connectionType, lastChangedAt, setOnline, toggleNetwork, refresh } =
    useNetworkStore();

  return {
    isOnline,
    isInternetReachable,
    connectionType,
    lastChangedAt,
    toggleNetwork,
    setOnline,
    refresh,
  };
}

export default useNetwork;
