let WebSocketServer = null;
let WebSocket = null;

try {
  const wsModule = await import("ws");
  WebSocketServer = wsModule.WebSocketServer || wsModule.default?.WebSocketServer;
  WebSocket = wsModule.WebSocket || wsModule.default?.WebSocket;
} catch {
  // ws not installed
}

import { getRedisClient } from "./cache.js";
import Auth from "./auth.js";

/**
 * High-performance WebSocketManager providing real-time channels, room management,
 * heartbeat ping/pong, Auth token verification, and Redis Pub/Sub multi-process cluster scaling.
 */
class WebSocketManager {
  /**
   * Initializes the WebSocket manager attached to an HTTP server.
   * @param {import('http').Server} server - Express HTTP server instance.
   * @param {Object} [options={}] - Configuration options.
   * @param {string} [options.path="/ws"] - WebSocket endpoint route.
   * @param {boolean} [options.auth=false] - Require valid Auth JWT token on connection.
   */
  constructor(server, options = {}) {
    if (!WebSocketServer || !WebSocket) {
      throw new Error(
        "[WS ERROR] 'ws' package is not installed. Install it with: npm install ws or npx blue-bird add ws",
      );
    }

    this.server = server;
    this.path = options.path || "/ws";
    this.requireAuth = options.auth ?? false;
    this.rooms = new Map();
    this.clients = new Set();
    this.connectionHandler = null;
    this.redisPublisher = null;
    this.redisSubscriber = null;

    this.wss = new WebSocketServer({ noServer: true });

    this._setupUpgrade();
    this._setupHeartbeat();
    this._setupRedisPubSub();
  }


  /**
   * Attaches the HTTP Upgrade listener to the Express HTTP server instance.
   * @private
   */
  _setupUpgrade() {
    this.server.on("upgrade", async (request, socket, head) => {
      const urlObj = new URL(request.url, `http://${request.headers.host || "localhost"}`);
      if (urlObj.pathname !== this.path) {
        return;
      }

      if (this.requireAuth) {
        const cookieHeader = request.headers.cookie || "";
        const cookies = {};
        cookieHeader.split(";").forEach((c) => {
          const parts = c.trim().split("=");
          if (parts[0]) cookies[parts[0]] = decodeURIComponent(parts[1] || "");
        });

        const token = cookies.auth || urlObj.searchParams.get("token") || request.headers.authorization?.split(" ")[1];
        const user = token ? Auth.verifyToken(token) : null;

        if (!user) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        request.user = user;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit("connection", ws, request);
      });
    });

    this.wss.on("connection", (ws, req) => {
      ws.isAlive = true;
      ws.user = req.user || null;
      ws.rooms = new Set();
      this.clients.add(ws);

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        ws.rooms.forEach((room) => this.leave(room, ws));
      });

      ws.on("error", () => {
        this.clients.delete(ws);
      });

      ws.join = (room) => this.join(room, ws);
      ws.leave = (room) => this.leave(room, ws);
      ws.sendJSON = (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
      };

      if (this.connectionHandler) {
        this.connectionHandler(ws, req);
      }
    });
  }

  /**
   * Registers a connection callback handler.
   * @param {Function} handler - Callback function: (ws, req) => {}
   */
  onConnection(handler) {
    this.connectionHandler = handler;
  }

  /**
   * Subscribes a WebSocket connection to a room.
   * @param {string} room - Room identifier.
   * @param {WebSocket} ws - Target WebSocket instance.
   */
  join(room, ws) {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room).add(ws);
    ws.rooms.add(room);
  }

  /**
   * Unsubscribes a WebSocket connection from a room.
   * @param {string} room - Room identifier.
   * @param {WebSocket} ws - Target WebSocket instance.
   */
  leave(room, ws) {
    if (this.rooms.has(room)) {
      this.rooms.get(room).delete(ws);
      if (this.rooms.get(room).size === 0) {
        this.rooms.delete(room);
      }
    }
    ws.rooms.delete(room);
  }

  /**
   * Broadcasts a JSON payload or string to all connected clients (or specific room).
   * Automatically synchronizes across PM2 cluster workers via Redis Pub/Sub if Redis is active.
   * @param {any} data - Data to send.
   * @param {string} [room=null] - Optional target room.
   */
  broadcast(data, room = null) {
    const payload = typeof data === "string" ? data : JSON.stringify(data);

    this._sendLocal(payload, room);

    if (this.redisPublisher && this.redisPublisher.isOpen) {
      this.redisPublisher.publish("bluebird:ws:broadcast", JSON.stringify({ room, payload })).catch(() => {});
    }
  }

  /**
   * Transmits payload to local WebSocket connections.
   * @private
   */
  _sendLocal(payload, room = null) {
    const targetSockets = room && this.rooms.has(room) ? this.rooms.get(room) : this.clients;
    targetSockets.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  /**
   * Sets up 30s ping/pong heartbeat to clear dead TCP sockets.
   * @private
   */
  _setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          this.clients.delete(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
    this.heartbeatInterval.unref();
  }

  /**
   * Initializes Redis Pub/Sub channels for multi-process PM2 cluster synchronization.
   * @private
   */
  async _setupRedisPubSub() {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return;

      this.redisPublisher = redisClient.duplicate();
      this.redisSubscriber = redisClient.duplicate();

      await this.redisPublisher.connect();
      await this.redisSubscriber.connect();

      await this.redisSubscriber.subscribe("bluebird:ws:broadcast", (message) => {
        try {
          const { room, payload } = JSON.parse(message);
          this._sendLocal(payload, room);
        } catch {}
      });
    } catch {}
  }
}

export default WebSocketManager;
