import { useState, useEffect, useRef, useCallback } from 'react';
import { apiRequest } from './api';

// Interfaces for message payloads
interface SnippetMovePayload {
  snippetId: string;
  x: number;
  y: number;
}

interface SnippetCreatePayload {
  title: string;
  description?: string;
  code?: string;
  tags?: string[];
  color?: string;
  files?: string[];
  x: number;
  y: number;
}

interface SnippetUpdatePayload {
  snippetId: string;
  title?: string;
  description?: string;
  code?: string;
  tags?: string[];
  color?: string;
  files?: string[];
  x?: number;
  y?: number;
}

interface SnippetDeletePayload {
  snippetId: string;
}

interface JoinSpacePayload {
  spaceId: string;
  token: string;
}

interface WebSocketMessage {
  type: 'join' | 'space-joined' | 'join-rejected' | 'snippet-move' | 'snippet-moved' | 
        'snippet-create' | 'snippet-created' | 'snippet-update' | 'snippet-updated' | 
        'snippet-delete' | 'snippet-deleted' | 'user-joined' | 'user-left' | 
        'error' | 'ping' | 'pong' | 'connection-established' | 'space-view' | 'snippet-view' |
        'snippet-move-confirmed' | 'snippet-move-rejected' | 'snippet-create-rejected' |
        'snippet-update-rejected' | 'snippet-delete-rejected';
  payload?: any;
  timestamp?: string;
  userId?: string;
  messageId?: string;
}

type CollaboratorRole = 'VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER';

interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  userRole?: CollaboratorRole;
  isOwner?: boolean;
}

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
  userPermissions: PermissionCheck | null;
  userRole: CollaboratorRole | null;
  sendSnippetMove: (payload: SnippetMovePayload) => Promise<boolean>;
  sendSnippetCreate: (payload: SnippetCreatePayload) => Promise<boolean>;
  sendSnippetDelete: (payload: SnippetDeletePayload) => Promise<boolean>;
  sendSnippetUpdate: (payload: SnippetUpdatePayload) => Promise<boolean>;
  trackSpaceView: () => void;
  trackSnippetView: (snippetId: string) => void;
  reconnect: () => void;
  joinSpace: (token: string) => void;
}

export const useSpaceWebSocket = (options: UseSpaceWebSocketOptions = {}): UseSpaceWebSocketReturn => {
    const { spaceId, userId, token, enabled = true } = options;
    
    const [isConnected, setIsConnected] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const [connectionState, setConnectionState] = useState('disconnected');
    const [lastError, setLastError] = useState<string | null>(null);
    const [userPermissions, setUserPermissions] = useState<PermissionCheck | null>(null);
    const [userRole, setUserRole] = useState<CollaboratorRole | null>(null);
    
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const isManuallyClosedRef = useRef(false);
    const mountedRef = useRef(false);
    const currentTokenRef = useRef<string | undefined>(token);
    
    // Race condition prevention refs
    const isConnectingRef = useRef(false);
    const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastConnectionAttemptRef = useRef<number>(0);
    const joinRequestSentRef = useRef(false);
    
    // Message deduplication
    const processedMessageIdsRef = useRef<Set<string>>(new Set());
    const messageSequenceRef = useRef<number>(0);
    
    const maxReconnectAttempts = 5;
    const baseReconnectDelayMs = 1000;
    const minConnectionInterval = 1000;
    const messageDeduplicationWindowMs = 10000; // 10 seconds

    // Enhanced message processing with better deduplication
    const processMessage = useCallback((message: WebSocketMessage) => {
        // Create a more robust message ID if not provided
        const messageId = message.messageId || 
            `${message.type}_${message.timestamp || Date.now()}_${message.userId || 'unknown'}_${messageSequenceRef.current++}`;
        
        // Check for duplicates with enhanced logic
        if (processedMessageIdsRef.current.has(messageId)) {
            console.log('Duplicate message detected, skipping:', messageId);
            return;
        }
        
        // Add to processed messages
        processedMessageIdsRef.current.add(messageId);
        
        // Enhanced message with sequence
        const enhancedMessage = {
            ...message,
            messageId,
            processedAt: Date.now(),
            sequence: messageSequenceRef.current
        };
        
        console.log('Processing WebSocket message:', enhancedMessage);
        
        // FIXED: Explicitly log userId for debugging
        console.log('Message from current user:', 
            enhancedMessage.userId === userId, 
            enhancedMessage.userId, 
            userId
        );
        
        setLastMessage(enhancedMessage);
        
        // Cleanup old message IDs periodically
        if (Math.random() < 0.1) {
            const cutoff = Date.now() - messageDeduplicationWindowMs;
            const oldIds = Array.from(processedMessageIdsRef.current).filter(id => {
                const parts = id.split('_');
                const timestamp = parseInt(parts[1] || '0');
                return timestamp < cutoff;
            });
            oldIds.forEach(id => processedMessageIdsRef.current.delete(id));
        }
    }, [userId]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        currentTokenRef.current = token;
    }, [token]);

    const clearTimeouts = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
        }
    }, []);
    interface CurrentUser {
        id: string;
        name: string;
        username: string;
        role: string;
    }
    const [currentUser, setCurrentUser] = useState<CurrentUser | undefined>(undefined);
    useEffect(() => {
        const fetchUserMetadata = async () => {
          try {
            
            const response = await apiRequest('/user/metadata');
            if (response && response.metadata) {
              setCurrentUser({
                id: response.metadata.id,
                name: response.metadata.name,
                username: response.metadata.username,
                role: response.metadata.role
              });
            }
          } catch (error) {
            console.error("Failed to fetch user metadata:", error);
          }
        };
        fetchUserMetadata();
      }, []);

    const validateSnippetOperation = useCallback((operation: string): PermissionCheck => {
        if (!userRole) {
            return { allowed: false, reason: 'User role not loaded' };
        }
        
        let canPerform = userRole === 'OWNER' || userRole === 'EDITOR' || userRole === 'ADMIN';
        console.log("current users role is "+currentUser?.role)
        if(currentUser?.role.toLocaleLowerCase("admin")){
            canPerform = true;
        }
        return {
            allowed: canPerform,
            reason: canPerform ? undefined : `Insufficient permissions to ${operation} snippets. Role: ${userRole}`,
            userRole,
            isOwner: userRole === 'OWNER'
        };
    }, [userRole]);

    const joinSpace = useCallback((authToken?: string) => {
        const tokenToUse = authToken || currentTokenRef.current;
        
        if (!tokenToUse || !spaceId) {
            const errorMsg = 'Cannot join space: missing required parameters (token, spaceId)';
            console.warn(errorMsg);
            setLastError(errorMsg);
            return;
        }

        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            const errorMsg = 'Cannot join space: WebSocket not connected';
            console.warn(errorMsg);
            setLastError(errorMsg);
            return;
        }

        if (joinRequestSentRef.current) {
            console.log('Join request already sent, skipping...');
            return;
        }

        try {
            const joinMessage: WebSocketMessage = {
                type: 'join',
                payload: {
                    spaceId,
                    token: tokenToUse
                } as JoinSpacePayload,
                timestamp: new Date().toISOString(),
                userId: userId,
                messageId: `join_${Date.now()}_${Math.random()}_${userId}`
            };
            
            console.log('Sending join request:', joinMessage);
            wsRef.current.send(JSON.stringify(joinMessage));
            setConnectionState('joining');
            joinRequestSentRef.current = true;
        } catch (error) {
            const errorMsg = `Failed to send join message: ${error}`;
            console.error(errorMsg);
            setLastError(errorMsg);
            joinRequestSentRef.current = false;
        }
    }, [spaceId, userId]);

    const trackSpaceView = useCallback(() => {
        if (!isJoined || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            const viewMessage: WebSocketMessage = {
                type: 'space-view',
                payload: {
                    spaceId,
                    userId,
                    timestamp: new Date().toISOString()
                },
                userId,
                messageId: `space_view_${Date.now()}_${Math.random()}_${userId}`
            };
            
            wsRef.current.send(JSON.stringify(viewMessage));
        } catch (error) {
            console.error('Failed to track space view:', error);
        }
    }, [isJoined, spaceId, userId]);

    const trackSnippetView = useCallback((snippetId: string) => {
        if (!isJoined || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            const viewMessage: WebSocketMessage = {
                type: 'snippet-view',
                payload: {
                    snippetId,
                    userId,
                    spaceId,
                    timestamp: new Date().toISOString()
                },
                userId,
                messageId: `snippet_view_${Date.now()}_${Math.random()}_${userId}`
            };
            
            wsRef.current.send(JSON.stringify(viewMessage));
        } catch (error) {
            console.error('Failed to track snippet view:', error);
        }
    }, [isJoined, spaceId, userId]);

    // Enhanced message sending with better error handling and retries
    const sendMessage = useCallback(async (message: WebSocketMessage, retries: number = 3): Promise<boolean> => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isJoined) {
            const warningMsg = `WebSocket not ready (connected: ${isConnected}, joined: ${isJoined}, readyState: ${wsRef.current?.readyState})`;
            console.warn(warningMsg, message);
            setLastError(warningMsg);
            return false;
        }

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const messageWithMeta = {
                    ...message,
                    timestamp: new Date().toISOString(),
                    userId,
                    messageId: `${message.type}_${Date.now()}_${Math.random()}_${userId}_${attempt}`,
                    attempt: attempt + 1
                };
                
                const messageStr = JSON.stringify(messageWithMeta);
                console.log(`Sending message (attempt ${attempt + 1}/${retries}):`, messageWithMeta);
                wsRef.current.send(messageStr);
                return true;
            } catch (error) {
                const sendError = `Failed to send WebSocket message (attempt ${attempt + 1}): ${error}`;
                console.error(sendError);
                
                if (attempt === retries - 1) {
                    setLastError(sendError);
                    return false;
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
            }
        }
        
        return false;
    }, [isJoined, isConnected, userId]);

    const sendSnippetMove = useCallback(async (payload: SnippetMovePayload): Promise<boolean> => {
        const validation = validateSnippetOperation('move');
        
        if (!validation.allowed) {
            setLastError(validation.reason || 'Permission denied');
            return false;
        }

        console.log('Broadcasting snippet move:', payload);
        return sendMessage({
            type: 'snippet-move',
            payload: {
                snippetId: payload.snippetId,
                x: Math.round(payload.x),
                y: Math.round(payload.y)
            }
        });
    }, [sendMessage, validateSnippetOperation]);

    const sendSnippetCreate = useCallback(async (payload: SnippetCreatePayload): Promise<boolean> => {
        const validation = validateSnippetOperation('create');
        
        if (!validation.allowed) {
            setLastError(validation.reason || 'Permission denied');
            return false;
        }

        if (!payload.title) {
            setLastError('Missing required field: title is required');
            return false;
        }

        console.log('Broadcasting snippet creation:', payload);
        return sendMessage({
            type: 'snippet-create',
            payload: {
                title: payload.title,
                description: payload.description,
                code: payload.code,
                tags: payload.tags,
                color: payload.color,
                files: payload.files,
                x: Math.round(payload.x),
                y: Math.round(payload.y)
            }
        });
    }, [sendMessage, validateSnippetOperation]);

    const sendSnippetDelete = useCallback(async (payload: SnippetDeletePayload): Promise<boolean> => {
        const validation = validateSnippetOperation('delete');
        
        if (!validation.allowed) {
            setLastError(validation.reason || 'Permission denied');
            return false;
        }

        console.log('Broadcasting snippet deletion:', payload);
        return sendMessage({
            type: 'snippet-delete',
            payload: {
                snippetId: payload.snippetId
            }
        });
    }, [sendMessage, validateSnippetOperation]);

    const sendSnippetUpdate = useCallback(async (payload: SnippetUpdatePayload): Promise<boolean> => {
        const validation = validateSnippetOperation('update');
        
        if (!validation.allowed) {
            setLastError(validation.reason || 'Permission denied');
            return false;
        }

        console.log('Broadcasting snippet update:', payload);
        
        // Process numeric coordinates
        const processedPayload = {
            ...payload,
            ...(payload.x !== undefined && { x: Math.round(payload.x) }),
            ...(payload.y !== undefined && { y: Math.round(payload.y) })
        };
        
        return sendMessage({
            type: 'snippet-update',
            payload: processedPayload
        });
    }, [sendMessage, validateSnippetOperation]);

    const connect = useCallback(() => {
        if (isConnectingRef.current) {
            console.log('Already connecting, skipping...');
            return;
        }

        const now = Date.now();
        if (now - lastConnectionAttemptRef.current < minConnectionInterval) {
            console.log('Connection attempt too soon, skipping...');
            return;
        }

        if (!enabled || !spaceId || !mountedRef.current) {
            console.log('Connection skipped:', { enabled, spaceId, mounted: mountedRef.current });
            return;
        }

        if (wsRef.current?.readyState === WebSocket.CONNECTING || 
                wsRef.current?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected/connecting, skipping...');
            return;
        }

        try {
            isConnectingRef.current = true;
            lastConnectionAttemptRef.current = now;

            if (wsRef.current) {
                wsRef.current.close(1000, 'Reconnecting');
                wsRef.current = null;
            }

            clearTimeouts();
            setIsJoined(false);
            setConnectionState('connecting');
            setLastError(null);
            setUserPermissions(null);
            setUserRole(null);
            joinRequestSentRef.current = false;

            const wsUrl = `ws://localhost:3001/ws/space/${spaceId}`;
            console.log('Connecting to:', wsUrl);
            
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            isManuallyClosedRef.current = false;

            connectionTimeoutRef.current = setTimeout(() => {
                if (ws.readyState === WebSocket.CONNECTING) {
                    console.log('WebSocket connection timeout');
                    setLastError('Connection timeout');
                    setConnectionState('timeout');
                    ws.close();
                    isConnectingRef.current = false;
                }
            }, 10000);

            ws.onopen = () => {
                clearTimeouts();
                
                if (!mountedRef.current) {
                    ws.close();
                    isConnectingRef.current = false;
                    return;
                }

                console.log('WebSocket connected to space:', spaceId);
                setIsConnected(true);
                setConnectionState('connected');
                setLastError(null);
                reconnectAttemptsRef.current = 0;
                isConnectingRef.current = false;
                joinRequestSentRef.current = false;
            };

            ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    console.log('WebSocket message received:', message);
                    
                    // Handle immediate responses that don't need queuing
                    switch (message.type) {
                        case 'ping':
                            if (wsRef.current?.readyState === WebSocket.OPEN) {
                                try {
                                    wsRef.current.send(JSON.stringify({
                                        type: 'pong',
                                        payload: {
                                            timestamp: new Date().toISOString(),
                                            originalTimestamp: message.payload?.timestamp
                                        },
                                        userId: userId,
                                        messageId: `pong_${Date.now()}_${Math.random()}_${userId}`
                                    }));
                                } catch (pongError) {
                                    console.error('Failed to send pong response:', pongError);
                                }
                            }
                            return;
                            
                        case 'connection-established':
                            console.log('Connection established, server ready');
                            if (currentTokenRef.current && !joinRequestSentRef.current) {
                                setTimeout(() => {
                                    if (mountedRef.current && !joinRequestSentRef.current) {
                                        joinSpace();
                                    }
                                }, 100);
                            }
                            return;
                            
                        case 'space-joined':
                            setIsJoined(true);
                            setConnectionState('joined');
                            joinRequestSentRef.current = false;
                            
                            const role = message.payload?.userRole as CollaboratorRole;
                            if (role) {
                                setUserRole(role);
                                setUserPermissions({
                                    allowed: true,
                                    userRole: role,
                                    isOwner: role === 'OWNER'
                                });
                            }
                            
                            console.log('Successfully joined space:', spaceId, 'with role:', role);
                            setTimeout(() => trackSpaceView(), 500);
                            return;
                            
                        case 'join-rejected':
                            setIsJoined(false);
                            setConnectionState('join-rejected');
                            setUserPermissions({ allowed: false, reason: 'Access denied' });
                            setUserRole(null);
                            joinRequestSentRef.current = false;
                            
                            const rejectMsg = `Join rejected: ${message.payload?.message || 'Unknown reason'}`;
                            setLastError(rejectMsg);
                            console.error(rejectMsg, message.payload);
                            return;

                        case 'error':
                            const errorMsg = `Server error: ${message.payload?.message || 'Unknown error'}`;
                            setLastError(errorMsg);
                            console.error(errorMsg, message.payload);
                            return;
                    }
                    
                    // Process all other messages including snippet operations
                    processMessage(message);
                    
                } catch (error) {
                    const parseError = `Failed to parse WebSocket message: ${error}`;
                    console.error(parseError, event.data);
                    setLastError(parseError);
                }
            };

            ws.onerror = (error) => {
                clearTimeouts();
                const errorMsg = `WebSocket error: ${error}`;
                console.error(errorMsg);
                setLastError(errorMsg);
                setConnectionState('error');
                isConnectingRef.current = false;
                joinRequestSentRef.current = false;
                
                if (mountedRef.current) {
                    setIsConnected(false);
                    setIsJoined(false);
                    setUserPermissions(null);
                    setUserRole(null);
                }
            };

            ws.onclose = (event) => {
                clearTimeouts();
                isConnectingRef.current = false;
                joinRequestSentRef.current = false;
                
                if (mountedRef.current) {
                    setIsConnected(false);
                    setIsJoined(false);
                    setUserPermissions(null);
                    setUserRole(null);
                }
                
                wsRef.current = null;
                setConnectionState(`closed-${event.code}`);

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
                        if (mountedRef.current && !isConnectingRef.current) {
                            reconnectAttemptsRef.current++;
                            connect();
                        }
                    }, delay);
                }
            };

        } catch (error) {
            const connectionError = `Failed to create WebSocket connection: ${error}`;
            console.error(connectionError);
            setLastError(connectionError);
            setConnectionState('connection-failed');
            isConnectingRef.current = false;
            joinRequestSentRef.current = false;
            
            if (mountedRef.current) {
                setIsConnected(false);
                setIsJoined(false);
                setUserPermissions(null);
                setUserRole(null);
            }
        }
    }, [enabled, spaceId, clearTimeouts, joinSpace, trackSpaceView, processMessage, userId]);

    const disconnect = useCallback(() => {
        isManuallyClosedRef.current = true;
        isConnectingRef.current = false;
        joinRequestSentRef.current = false;
        clearTimeouts();
        setConnectionState('disconnecting');
        
        if (wsRef.current) {
            wsRef.current.close(1000, 'Manual disconnect');
            wsRef.current = null;
        }
        
        if (mountedRef.current) {
            setIsConnected(false);
            setIsJoined(false);
            setUserPermissions(null);
            setUserRole(null);
            setConnectionState('disconnected');
        }
    }, [clearTimeouts]);

    const reconnect = useCallback(() => {
        console.log('Manual reconnection requested');
        disconnect();
        reconnectAttemptsRef.current = 0;
        setLastError(null);
        
        setTimeout(() => {
            if (mountedRef.current && !isConnectingRef.current) {
                connect();
            }
        }, 100);
    }, [connect, disconnect]);

    // Connection management effects
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (enabled && spaceId && mountedRef.current && !isConnectingRef.current) {
                connect();
            } else if (!enabled || !spaceId) {
                disconnect();
            }
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [enabled, spaceId, connect, disconnect]);

    useEffect(() => {
        if (!token) return;

        const timeoutId = setTimeout(() => {
            if (token && isConnected && !isJoined && !joinRequestSentRef.current) {
                joinSpace(token);
            }
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [token, isConnected, isJoined, joinSpace]);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
            clearTimeouts();
            
            if (wsRef.current) {
                isManuallyClosedRef.current = true;
                wsRef.current.close(1000, 'Component unmounting');
                wsRef.current = null;
            }
        };
    }, [clearTimeouts]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && 
                enabled && 
                spaceId && 
                !isConnected && 
                mountedRef.current &&
                !isManuallyClosedRef.current &&
                !isConnectingRef.current) {
                
                setTimeout(() => {
                    if (document.visibilityState === 'visible' && 
                        !isConnected && 
                        !isConnectingRef.current && 
                        mountedRef.current) {
                        console.log('Page became visible, attempting to reconnect WebSocket');
                        reconnectAttemptsRef.current = 0;
                        reconnect();
                    }
                }, 500);
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
                !isManuallyClosedRef.current &&
                !isConnectingRef.current) {
                
                setTimeout(() => {
                    if (!isConnected && !isConnectingRef.current && mountedRef.current) {
                        console.log('Connection restored, attempting to reconnect WebSocket');
                        reconnectAttemptsRef.current = 0;
                        reconnect();
                    }
                }, 1000);
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
        userPermissions,
        userRole,
        sendSnippetMove,
        sendSnippetCreate,
        sendSnippetDelete,
        sendSnippetUpdate,
        trackSpaceView,
        trackSnippetView,
        reconnect,
        joinSpace
    };
};

