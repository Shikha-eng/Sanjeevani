import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import connectDB from './config/database';
import authRoutes from './routes/auth';
import reportsRoutes from './routes/reports';
import assistantRoutes from './routes/assistant';
import doctorRoutes from './routes/doctor';
import patientRoutes from './routes/patient';
import pharmacyRoutes from './routes/pharmacy';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();
const httpServer = http.createServer(app);

// Connect to database
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ─── Socket.IO WebRTC Signaling Server ───────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Track rooms: roomId → Set of socket ids
const callRooms = new Map<string, Set<string>>();

io.on('connection', (socket: Socket) => {
  // Join a call room (room = appointmentId)
  socket.on('join-room', (roomId: string, userId: string) => {
    if (!callRooms.has(roomId)) callRooms.set(roomId, new Set());
    const room = callRooms.get(roomId)!;

    if (room.size >= 2) {
      socket.emit('room-full');
      return;
    }

    room.add(socket.id);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;

    // Notify everyone else in the room that a new peer joined
    socket.to(roomId).emit('peer-joined', socket.id);
    // Tell the joining socket who is already in the room
    const others = [...room].filter(id => id !== socket.id);
    socket.emit('room-peers', others);
  });

  // Relay SDP offer to target peer
  socket.on('offer', (payload: { sdp: { type: string; sdp: string }; to: string }) => {
    io.to(payload.to).emit('offer', { sdp: payload.sdp, from: socket.id });
  });

  // Relay SDP answer to target peer
  socket.on('answer', (payload: { sdp: { type: string; sdp: string }; to: string }) => {
    io.to(payload.to).emit('answer', { sdp: payload.sdp, from: socket.id });
  });

  // Relay ICE candidate to target peer
  socket.on('ice-candidate', (payload: { candidate: object; to: string }) => {
    io.to(payload.to).emit('ice-candidate', { candidate: payload.candidate, from: socket.id });
  });

  // One side ended the call
  socket.on('end-call', (roomId: string) => {
    socket.to(roomId).emit('call-ended');
    socket.leave(roomId);
    cleanRoom(roomId, socket.id);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('call-ended');
      cleanRoom(roomId, socket.id);
    }
  });
});

function cleanRoom(roomId: string, socketId: string) {
  const room = callRooms.get(roomId);
  if (room) {
    room.delete(socketId);
    if (room.size === 0) callRooms.delete(roomId);
  }
}
// ─────────────────────────────────────────────────────────────────────────────
app.use(morgan('dev')); // Logging
app.use(express.json()); // Body parser
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/pharmacy', pharmacyRoutes);

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Start server
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export default app;
