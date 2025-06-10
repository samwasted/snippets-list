import { useState, useEffect, useRef, useCallback } from 'react';
import type { WebSocketMessage} from './types';

interface UseSpaceWebSocketOptions {
  spaceId?: string;
  userId?: string;
  token?: string;
  enabled?: boolean;
}

interface UseSpaceWebSocketReturn {
  isConnected: boolean;
  isJoined: boolean;
  lastMessage: WebSocketMessage | null;
  connectionState: string;
  lastError: string | null;
  sendSnippetMove: (payload: { snippetId: string; x: number; y: number }) => void;
  sendSnippetCreate: (payload: any) => void;
  sendSnippetDelete: (payload: { snippetId: string }) => void;
  sendSnippetUpdate: (payload: any) => void;
  reconnect: () => void;
  joinSpace: (token: string) => void;
}

export function useSpaceWebSocket(options: UseSpaceWebSocketOptions = {}): UseSpaceWebSocketReturn {
  const { spaceId, userId, token, enabled = true } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManuallyClosedRef = useRef(false);
  const mountedRef = useRef(false);
  const currentTokenRef = useRef<string | undefined>(token);
  const connectionIdRef = useRef<string | null>(null);
  
  const maxReconnectAttempts = 5;
  const baseReconnectDelayMs = 1000;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    currentTokenRef.current = token;
  }, [token]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const joinSpace = useCallback((authToken?: string) => {
    const tokenToUse = authToken || currentTokenRef.current;
    
    if (!tokenToUse || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      const errorMsg = `Cannot join space: ${!tokenToUse ? 'missing token' : 'WebSocket not connected'}`;
      console.warn(errorMsg);
      setLastError(errorMsg);
      return;
    }

    try {
      const joinMessage = {
        type: 'join',
        payload: {
          spaceId: spaceId,
          userId: userId,
          token: tokenToUse
        }
      };
      
      console.log('Sending join request:', joinMessage);
      wsRef.current.send(JSON.stringify(joinMessage));
      setConnectionState('joining');
    } catch (error) {
      const errorMsg = `Failed to send join message: ${error}`;
      console.error(errorMsg);
      setLastError(errorMsg);
    }
  }, [spaceId, userId]);

  const connect = useCallback(() => {
    if (!enabled || !spaceId || !mountedRef.current) {
      console.log('Connection skipped:', { enabled, spaceId, mounted: mountedRef.current });
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('Already connecting, skipping...');
      return;
    }

    try {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Reconnecting');
        wsRef.current = null;
      }

      clearReconnectTimeout();
      setIsJoined(false);
      setConnectionState('connecting');
      setLastError(null);

      const wsUrl = `ws://localhost:3001/ws/space/${spaceId}`;
      console.log('Connecting to:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      isManuallyClosedRef.current = false;

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('WebSocket connection timeout');
          setLastError('Connection timeout');
          setConnectionState('timeout');
          ws.close();
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        
        if (!mountedRef.current) {
          ws.close();
          return;
        }

        console.log('WebSocket connected to space:', spaceId);
        setIsConnected(true);
        setConnectionState('connected');
        setLastError(null);
        reconnectAttemptsRef.current = 0;

        // Send connection-established message to trigger server setup
        ws.send(JSON.stringify({
          type: 'connection-established',
          payload: {
            timestamp: new Date().toISOString()
          }
        }));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          setLastMessage(message);

          switch (message.type) {
            case 'ping':
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                try {
                  wsRef.current.send(JSON.stringify({
                    type: 'pong',
                    payload: {
                      timestamp: new Date().toISOString(),
                      originalTimestamp: message.payload?.timestamp
                    }
                  }));
                } catch (pongError) {
                  console.error('Failed to send pong response:', pongError);
                }
              }
              break;
              
            case 'connection-established':
              console.log('Connection established, server ready');
              connectionIdRef.current = message.payload?.connectionId || null;
              
              if (currentTokenRef.current) {
                setTimeout(() => {
                  joinSpace();
                }, 100);
              }
              break;
              
            case 'space-joined':
              setIsJoined(true);
              setConnectionState('joined');
              console.log('Successfully joined space:', spaceId);
              break;
              
            case 'join-rejected':
              setIsJoined(false);
              setConnectionState('join-rejected');
              const rejectMsg = `Join rejected: ${message.payload?.reason || 'Unknown reason'}`;
              setLastError(rejectMsg);
              console.error(rejectMsg, message.payload);
              break;
              
            case 'error':
              const errorMsg = `Server error: ${message.payload?.message || 'Unknown error'}`;
              setLastError(errorMsg);
              console.error(errorMsg, message.payload);
              break;
          }
        } catch (error) {
          const parseError = `Failed to parse WebSocket message: ${error}`;
          console.error(parseError, event.data);
          setLastError(parseError);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        const errorMsg = `WebSocket error: ${error}`;
        console.error(errorMsg);
        setLastError(errorMsg);
        setConnectionState('error');
        
        if (mountedRef.current) {
          setIsConnected(false);
          setIsJoined(false);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        const closeMsg = `WebSocket closed: code=${event.code}, reason="${event.reason}", wasClean=${event.wasClean}`;
        console.log(closeMsg);
        
        if (event.code === 1006) {
          setLastError('Connection lost unexpectedly (1006) - possible server error');
        } else if (event.code === 1011) {
          setLastError('Server error during connection');
        } else if (event.reason) {
          setLastError(`Connection closed: ${event.reason}`);
        }
        
        setConnectionState(`closed-${event.code}`);
        
        if (mountedRef.current) {
          setIsConnected(false);
          setIsJoined(false);
        }
        
        wsRef.current = null;

        const shouldReconnect = 
          mountedRef.current &&
          enabled && 
          !isManuallyClosedRef.current &&
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          event.code !== 1000 && 
          event.code !== 1001 &&
          event.code !== 1008;

        if (shouldReconnect) {
          const delay = baseReconnectDelayMs * Math.pow(2, Math.min(reconnectAttemptsRef.current, 4));
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          setConnectionState(`reconnecting-${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              reconnectAttemptsRef.current++;
              connect();
            }
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          const maxReconnectMsg = 'Max reconnection attempts reached';
          console.error(maxReconnectMsg);
          setLastError(maxReconnectMsg);
          setConnectionState('max-reconnect-reached');
        }
      };

    } catch (error) {
      const connectionError = `Failed to create WebSocket connection: ${error}`;
      console.error(connectionError);
      setLastError(connectionError);
      setConnectionState('connection-failed');
      
      if (mountedRef.current) {
        setIsConnected(false);
        setIsJoined(false);
      }
    }
  }, [enabled, spaceId, clearReconnectTimeout, joinSpace]);

  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    clearReconnectTimeout();
    setConnectionState('disconnecting');
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    if (mountedRef.current) {
      setIsConnected(false);
      setIsJoined(false);
      setConnectionState('disconnected');
    }
  }, [clearReconnectTimeout]);
  // FIXED: Check both connection state AND joined state
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && isJoined) {
      try {
        const messageStr = JSON.stringify(message);
        console.log('Sending message:', messageStr);
        wsRef.current.send(messageStr);
        return true;
      } catch (error) {
        const sendError = `Failed to send WebSocket message: ${error}`;
        console.error(sendError);
        setLastError(sendError);
        return false;
      }
    } else {
      const warningMsg = `WebSocket not ready - connected: ${isConnected}, joined: ${isJoined}, readyState: ${wsRef.current?.readyState}`;
      console.warn(warningMsg, message);
      setLastError(warningMsg);
      return false;
    }
  }, [isJoined, isConnected]);

  // Message sending methods
  const sendSnippetMove = useCallback((payload: { snippetId: string; x: number; y: number }) => {
    console.log('Attempting to send snippet move:', payload);
    const success = sendMessage({ type: 'snippet-move', payload });
    if (!success) {
      console.error('Failed to send snippet move message');
    }
    return success;
  }, [sendMessage]);

  const sendSnippetCreate = useCallback((payload: any) => {
    console.log('Attempting to send snippet create:', payload);
    const success = sendMessage({ type: 'snippet-create', payload });
    if (!success) {
      console.error('Failed to send snippet create message');
    }
    return success;
  }, [sendMessage]);

  const sendSnippetDelete = useCallback((payload: { snippetId: string }) => {
    console.log('Attempting to send snippet delete:', payload);
    const success = sendMessage({ type: 'snippet-delete', payload });
    if (!success) {
      console.error('Failed to send snippet delete message');
    }
    return success;
  }, [sendMessage]);

  const sendSnippetUpdate = useCallback((payload: any) => {
    console.log('Attempting to send snippet update:', payload);
    const success = sendMessage({ type: 'snippet-update', payload });
    if (!success) {
      console.error('Failed to send snippet update message');
    }
    return success;
  }, [sendMessage]);

  const reconnect = useCallback(() => {
    console.log('Manual reconnection requested');
    disconnect();
    reconnectAttemptsRef.current = 0;
    setLastError(null);
    
    setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, 100);
  }, [connect, disconnect]);

  useEffect(() => {
    if (enabled && spaceId) {
      connect();
    } else {
      disconnect();
    }
  }, [enabled, spaceId, connect, disconnect]);

  useEffect(() => {
    if (token && isConnected && !isJoined) {
      joinSpace(token);
    }
  }, [token, isConnected, isJoined, joinSpace]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearReconnectTimeout();
      
      if (wsRef.current) {
        isManuallyClosedRef.current = true;
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, [clearReconnectTimeout]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 
          enabled && 
          spaceId && 
          !isConnected && 
          mountedRef.current &&
          !isManuallyClosedRef.current) {
        console.log('Page became visible, attempting to reconnect WebSocket');
        reconnectAttemptsRef.current = 0;
        reconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, spaceId, isConnected, reconnect]);

  useEffect(() => {
    const handleOnline = () => {
      if (enabled && 
          spaceId && 
          !isConnected && 
          mountedRef.current &&
          !isManuallyClosedRef.current) {
        console.log('Connection restored, attempting to reconnect WebSocket');
        reconnectAttemptsRef.current = 0;
        reconnect();
      }
    };

    const handleOffline = () => {
      console.log('Connection lost, WebSocket will be disconnected');
      setLastError('Internet connection lost');
      setConnectionState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, spaceId, isConnected, reconnect]);

  return {
    isConnected,
    isJoined,
    lastMessage,
    connectionState,
    lastError,
    sendSnippetMove,
    sendSnippetCreate,
    sendSnippetDelete,
    sendSnippetUpdate,
    reconnect,
    joinSpace
  };
}