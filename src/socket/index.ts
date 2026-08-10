import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { env } from "../config/env";

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  // every socket must present a valid access token to connect - same token
  // used for the REST API, passed as `auth: { token }` on the client
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("No access token provided"));

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("Invalid or expired access token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    // personal room - reminders and check-in feed both land here
    socket.join(`user:${socket.data.userId}`);

    // anyone can watch an event's seat count - it's public info, same as
    // the browse endpoint already shows
    socket.on("join-event", (eventId: string) => {
      if (typeof eventId === "string" && eventId) {
        socket.join(`event:${eventId}`);
      }
    });

    socket.on("leave-event", (eventId: string) => {
      if (typeof eventId === "string" && eventId) {
        socket.leave(`event:${eventId}`);
      }
    });
  });

  return io;
}

export function getIo(): SocketServer {
  if (!io)
    throw new Error("Socket.IO not initialized - call initSocket() first");
  return io;
}

export function emitToUser(
  userId: string,
  event: string,
  payload: unknown,
): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToEvent(
  eventId: string,
  event: string,
  payload: unknown,
): void {
  io?.to(`event:${eventId}`).emit(event, payload);
}
