const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');

const hosts = new Map(); // courseId -> socket id of the instructor who is live

function initSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL || true } });

  // only logged-in users can connect
  io.use(async (socket, next) => {
    try {
      const decoded = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Not authorized'));
    }
  });

  io.on('connection', (socket) => {
    const roomOf = () => (socket.courseId ? `class:${socket.courseId}` : null);

    socket.on('join-class', async ({ courseId }, ack) => {
      try {
        const course = await Course.findById(courseId);
        if (!course) return ack?.({ error: 'Course not found' });
        const isHost = String(course.instructor) === String(socket.user._id);
        const enrolled = !isHost && (await Enrollment.findOne({ student: socket.user._id, course: courseId }));
        if (!isHost && !enrolled) return ack?.({ error: 'Enroll in the course first' });

        socket.courseId = courseId;
        socket.isHost = isHost;
        socket.join(roomOf());

        if (isHost) {
          hosts.set(courseId, socket.id);
          io.to(roomOf()).emit('class-started');
          // tell the host about viewers already waiting so it can call each of them
          const sockets = await io.in(roomOf()).fetchSockets();
          sockets.filter((s) => s.id !== socket.id).forEach((s) =>
            socket.emit('viewer-joined', { viewerId: s.id, name: s.user?.name })
          );
        } else if (hosts.has(courseId)) {
          io.to(hosts.get(courseId)).emit('viewer-joined', { viewerId: socket.id, name: socket.user.name });
        }

        const count = (await io.in(roomOf()).fetchSockets()).length;
        io.to(roomOf()).emit('participants', { count });
        ack?.({ ok: true, role: isHost ? 'host' : 'viewer', live: hosts.has(courseId), title: course.title });
      } catch (e) {
        ack?.({ error: e.message });
      }
    });

    // WebRTC signaling: pass offers, answers and ICE candidates between two sockets
    socket.on('signal', ({ to, data }) => {
      if (to) io.to(to).emit('signal', { from: socket.id, data });
    });

    socket.on('chat', ({ text }) => {
      const room = roomOf();
      const clean = String(text || '').trim().slice(0, 500);
      if (!room || !clean) return;
      io.to(room).emit('chat', {
        name: socket.user.name,
        role: socket.isHost ? 'instructor' : 'student',
        text: clean,
        time: new Date().toISOString(),
      });
    });

    socket.on('disconnect', async () => {
      const room = roomOf();
      if (!room) return;
      if (socket.isHost && hosts.get(socket.courseId) === socket.id) {
        hosts.delete(socket.courseId);
        io.to(room).emit('class-ended');
      } else if (hosts.has(socket.courseId)) {
        io.to(hosts.get(socket.courseId)).emit('viewer-left', { viewerId: socket.id });
      }
      const count = (await io.in(room).fetchSockets()).length;
      io.to(room).emit('participants', { count });
    });
  });

  return io;
}

module.exports = initSocket;