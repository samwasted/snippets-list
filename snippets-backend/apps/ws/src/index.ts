import { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { User } from './User';
import { parse } from 'url';

const wss = new WebSocketServer({ 
    port: 3001,
    // Add these options for better connection handling
    perMessageDeflate: false,
    maxPayload: 16 * 1024 * 1024, // 16MB max payload
    clientTracking: true
});

// Keep track of active connections for debugging
const activeConnections = new Map();

wss.on('connection', function connection(ws, req: IncomingMessage) {
    const connectionId = Math.random().toString(36).substr(2, 9);
    console.log(`[${connectionId}] New WebSocket connection attempt`);
    
    try {
        const url = parse(req.url || '', true);
        const pathname = url.pathname || '';
        
        console.log(`[${connectionId}] WebSocket connection attempt to: ${pathname}`);
        
        // Check if the path matches /ws/space/:spaceId pattern
        const spaceRouteMatch = pathname.match(/^\/ws\/space\/([a-zA-Z0-9-_]+)$/);
        
        if (!spaceRouteMatch) {
            // Invalid path - close connection with appropriate code
            console.log(`[${connectionId}] Rejected connection to invalid path: ${pathname}`);
            ws.close(1008, 'Invalid path - Expected format: /ws/space/:spaceId');
            return;
        }
        
        const spaceId = spaceRouteMatch[1];
        console.log(`[${connectionId}] User connected to space: ${spaceId}`);
        
        // Add connection to tracking
        activeConnections.set(connectionId, { spaceId, user: null, ws });
        
        // Create user instance with the spaceId context
        let user;
        try {
            user = new User(ws, spaceId);
            activeConnections.get(connectionId).user = user;
            console.log(`[${connectionId}] User instance created successfully`);
        } catch (userError) {
            console.error(`[${connectionId}] Error creating User instance:`, userError);
            ws.close(1011, 'Server error during user initialization');
            activeConnections.delete(connectionId);
            return;
        }
        
        // Add ping/pong heartbeat to detect broken connections
        const heartbeatInterval = setInterval(() => {
            if (ws.readyState === ws.OPEN) {
                // Send both WebSocket ping and a JSON ping message
                ws.ping();
                
                // Also send a JSON ping message that the client can respond to
                try {
                    ws.send(JSON.stringify({
                        type: 'ping',
                        payload: {
                            timestamp: new Date().toISOString(),
                            connectionId: connectionId
                        }
                    }));
                } catch (pingError) {
                    console.error(`[${connectionId}] Error sending ping message:`, pingError);
                    clearInterval(heartbeatInterval);
                }
            } else {
                clearInterval(heartbeatInterval);
            }
        }, 30000); // Ping every 20 seconds
        
        ws.on('pong', () => {
            console.log(`[${connectionId}] Received pong from client`);
        });
        
        // Track last pong time for connection health monitoring
        let lastPongTime = Date.now();
        ws.on('pong', () => {
            lastPongTime = Date.now();
        });
        
        // Check for stale connections (no pong received in 15 seconds)
        const staleConnectionCheck = setInterval(() => {
            const timeSinceLastPong = Date.now() - lastPongTime;
            if (timeSinceLastPong > 60000) { // 15 seconds
                console.log(`[${connectionId}] Connection appears stale (no pong for ${timeSinceLastPong}ms), closing`);
                clearInterval(staleConnectionCheck);
                ws.close(1001, 'Connection timeout');
            }
        }, 5000); // Check every 5 seconds
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log(`[${connectionId}] Received message:`, message);
                
                // Handle ping responses from client
                if (message.type === 'pong') {
                    console.log(`[${connectionId}] Received JSON pong from client`);
                    lastPongTime = Date.now();
                    return;
                }
                
                // Let User class handle other messages
                // Make sure your User class has proper error handling in message processing
            } catch (messageError) {
                console.error(`[${connectionId}] Error processing message:`, messageError);
                // Don't close connection for message errors, just log them
            }
        });
        
        ws.on('error', (error) => {
            console.error(`[${connectionId}] WebSocket error for space ${spaceId}:`, error);
            clearInterval(heartbeatInterval);
        });
        
        ws.on('close', (code, reason) => {
            console.log(`[${connectionId}] User disconnected from space: ${spaceId}, code: ${code}, reason: ${reason?.toString()}`);
            clearInterval(heartbeatInterval);
            clearInterval(staleConnectionCheck);
            
            try {
                user?.destroy();
            } catch (destroyError) {
                console.error(`[${connectionId}] Error during user cleanup:`, destroyError);
            }
            
            activeConnections.delete(connectionId);
        });
        
        // Send a welcome message to confirm connection is working
        if (ws.readyState === ws.OPEN) {
            try {
                ws.send(JSON.stringify({
                    type: 'connection-established',
                    payload: {
                        spaceId: spaceId,
                        connectionId: connectionId,
                        timestamp: new Date().toISOString()
                    }
                }));
            } catch (sendError) {
                console.error(`[${connectionId}] Error sending welcome message:`, sendError);
            }
        }
        
    } catch (error) {
        console.error(`[${connectionId}] Unexpected error in connection handler:`, error);
        try {
            if (ws.readyState === ws.OPEN) {
                ws.close(1011, 'Internal server error');
            }
        } catch (closeError) {
            console.error(`[${connectionId}] Error closing connection:`, closeError);
        }
        activeConnections.delete(connectionId);
    }
});

console.log('WebSocket server running on ws://localhost:3001');
console.log('Available routes:');
console.log('  - ws://localhost:3001/ws/space/:spaceId');

// Optional: Add a health check endpoint info
wss.on('listening', () => {
    console.log('WebSocket server is ready to accept connections');
    console.log(`Active connections: ${activeConnections.size}`);
});

// Handle server-level errors
wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
});

// Add graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\nShutting down WebSocket server...');
    console.log(`Closing ${activeConnections.size} active connections`);
    
    // Close all active connections gracefully
    activeConnections.forEach((conn, id) => {
        try {
            conn.user?.destroy();
            if (conn.ws.readyState === conn.ws.OPEN) {
                conn.ws.close(1001, 'Server shutting down');
            }
        } catch (error) {
            console.error(`Error closing connection ${id}:`, error);
        }
    });
    
    wss.close(() => {
        console.log('WebSocket server closed');
        process.exit(0);
    });
});

// Log connection stats periodically
setInterval(() => {
    console.log(`Active WebSocket connections: ${activeConnections.size}`);
}, 60000); // Log every minute