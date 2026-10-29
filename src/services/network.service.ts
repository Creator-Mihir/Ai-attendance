import { apiClient } from '../api/client';
import { NetworkConnectionInfo } from '../types/sync';

type NetworkListener = (info: NetworkConnectionInfo) => void;

export class NetworkService {
  private static isConnected: boolean = true;
  private static connectionType: 'wifi' | 'cellular' | 'ethernet' | 'offline' | 'unknown' = 'wifi';
  private static lastChangedAt: string = new Date().toISOString();
  private static listeners: Set<NetworkListener> = new Set();
  private static onReconnectCallbacks: Set<() => void> = new Set();
  private static isInitialized = false;

  /**
   * Initializes real-time network detection listeners in browser/device environments.
   */
  public static initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      // Initialize with navigator.onLine if available
      if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
        this.isConnected = navigator.onLine;
        this.connectionType = navigator.onLine ? 'wifi' : 'offline';
      }

      window.addEventListener('online', () => {
        this.handleStateChange(true, 'wifi');
      });

      window.addEventListener('offline', () => {
        this.handleStateChange(false, 'offline');
      });
    }

    apiClient.setNetworkOnline(this.isConnected);
  }

  public static isOnline(): boolean {
    return this.isConnected;
  }

  public static getConnectionInfo(): NetworkConnectionInfo {
    return {
      isOnline: this.isConnected,
      isInternetReachable: this.isConnected,
      connectionType: this.isConnected ? this.connectionType : 'offline',
      lastChangedAt: this.lastChangedAt,
    };
  }

  public static setOnline(status: boolean, type: 'wifi' | 'cellular' | 'ethernet' | 'offline' | 'unknown' = status ? 'wifi' : 'offline'): void {
    if (this.isConnected === status) return;
    this.handleStateChange(status, type);
  }

  public static toggleNetwork(): boolean {
    const nextState = !this.isConnected;
    this.setOnline(nextState);
    return nextState;
  }

  /**
   * Register a callback triggered whenever the network transitions from offline to online
   */
  public static onReconnect(callback: () => void): () => void {
    this.onReconnectCallbacks.add(callback);
    return () => {
      this.onReconnectCallbacks.delete(callback);
    };
  }

  public static subscribe(cb: NetworkListener): () => void {
    this.listeners.add(cb);
    // Call immediately with current state
    try {
      cb(this.getConnectionInfo());
    } catch {
      // Ignore initial callback error
    }
    return () => {
      this.listeners.delete(cb);
    };
  }

  private static handleStateChange(
    status: boolean,
    type: 'wifi' | 'cellular' | 'ethernet' | 'offline' | 'unknown'
  ): void {
    const wasOffline = !this.isConnected;
    this.isConnected = status;
    this.connectionType = status ? (type === 'offline' ? 'wifi' : type) : 'offline';
    this.lastChangedAt = new Date().toISOString();

    apiClient.setNetworkOnline(status);

    const info = this.getConnectionInfo();
    this.listeners.forEach((listener) => {
      try {
        listener(info);
      } catch (err) {
        console.error('Network listener error:', err);
      }
    });

    // Auto-trigger reconnection callbacks if transitioned from offline -> online
    if (wasOffline && status) {
      this.onReconnectCallbacks.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error('Network reconnect callback error:', err);
        }
      });
    }
  }
}

// Auto-initialize when file is imported
NetworkService.initialize();

export default NetworkService;
