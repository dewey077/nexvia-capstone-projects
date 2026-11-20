import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../AuthContext';

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export default function LiveClass() {
  const { id } = useParams();
  const { user } = useAuth();
  const isInstructor = user.role === 'instructor';

  const socketRef = useRef(null);
  const peers = useRef({});
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const chatEnd = useRef(null);

  const [status, setStatus] = useState(isInstructor ? 'idle' : 'connecting');
  const [title, setTitle] = useState('');
  const [count, setCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const closePeers = () => {
    Object.values(peers.current).forEach((pc) => pc.close());
    peers.current = {};
  };

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL, { auth: { token: localStorage.getItem('token') } });
    socketRef.current = socket;

    const makePeer = (peerId) => {
      const pc = new RTCPeerConnection(ICE);
      peers.current[peerId] = pc;
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('signal', { to: peerId, data: { candidate: e.candidate } });
      };
      return pc;
    };

    socket.on('connect_error', (e) => setError(e.message));
    socket.on('chat', (m) => setMessages((list) => [...list, m]));
    socket.on('participants', ({ count }) => setCount(count));

    // instructor: a student joined, so send them our stream
    socket.on('viewer-joined', async ({ viewerId }) => {
      if (!streamRef.current) return;
      peers.current[viewerId]?.close();
      const pc = makePeer(viewerId);
      streamRef.current.getTracks().forEach((t) => pc.addTrack(t, streamRef.current));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('signal', { to: viewerId, data: { sdp: pc.localDescription } });
    });

    socket.on('viewer-left', ({ viewerId }) => {
      peers.current[viewerId]?.close();
      delete peers.current[viewerId];
    });

    // both sides: offers, answers and network candidates
    socket.on('signal', async ({ from, data }) => {
      try {
        if (data.sdp?.type === 'offer') {
          peers.current[from]?.close();
          const pc = makePeer(from);
          pc.ontrack = (e) => {
            if (videoRef.current) videoRef.current.srcObject = e.streams[0];
            setStatus('watching');
          };
          await pc.setRemoteDescription(data.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', { to: from, data: { sdp: pc.localDescription } });
        } else if (data.sdp?.type === 'answer') {
          await peers.current[from]?.setRemoteDescription(data.sdp);
        } else if (data.candidate) {
          await peers.current[from]?.addIceCandidate(data.candidate);
        }
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('class-ended', () => {
      closePeers();
      if (videoRef.current) videoRef.current.srcObject = null;
      setStatus('ended');
    });

    // students join the room right away and wait for the instructor
    if (!isInstructor) {
      socket.emit('join-class', { courseId: id }, (res) => {
        if (res?.error) return setError(res.error);
        setTitle(res.title);
        setStatus('waiting');
      });
    }

    return () => {
      socket.disconnect();
      closePeers();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [id]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const startClass = async (mode) => {
    setError('');
    try {
      const stream = mode === 'screen'
        ? await navigator.mediaDevices.getDisplayMedia({ video: true })
        : await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      socketRef.current.emit('join-class', { courseId: id }, (res) => {
        if (res?.error) {
          setError(res.error);
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          return;
        }
        setTitle(res.title);
        setStatus('live');
      });
    } catch (e) {
      setError(`Could not start: ${e.message}`);
    }
  };

  const endClass = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    window.location.reload();
  };

  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || ['idle', 'connecting'].includes(status)) return;
    socketRef.current.emit('chat', { text });
    setText('');
  };

  const overlay = {
    idle: 'Choose how to start your class below',
    connecting: 'Connecting...',
    waiting: 'Waiting for the instructor to start the class...',
    ended: 'The class has ended',
  }[status];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Link to={isInstructor ? `/instructor/course/${id}` : `/learn/${id}`} className="text-sm text-blue-600">Back</Link>
      <div className="flex items-center justify-between mt-2">
        <h1 className="text-2xl font-bold">Live class{title && `: ${title}`}</h1>
        <span className="text-sm text-slate-500">{count} in the class</span>
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

      <div className="grid gap-6 md:grid-cols-3 mt-4">
        <div className="md:col-span-2 space-y-3">
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
            <video ref={videoRef} autoPlay playsInline controls={!isInstructor} className="w-full h-full object-contain" />
            {overlay && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-center p-4 bg-slate-800/80">{overlay}</div>
            )}
            {status === 'live' && <span className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded">LIVE</span>}
          </div>

          {isInstructor && (
            <div className="flex gap-2">
              {status === 'idle' ? (
                <>
                  <button onClick={() => startClass('camera')} className="bg-red-600 text-white rounded px-4 py-2 text-sm">Go live with camera</button>
                  <button onClick={() => startClass('screen')} className="bg-slate-700 text-white rounded px-4 py-2 text-sm">Go live sharing screen</button>
                </>
              ) : (
                <button onClick={endClass} className="bg-slate-700 text-white rounded px-4 py-2 text-sm">End class</button>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow flex flex-col h-[480px]">
          <h2 className="font-bold p-3 border-b">Chat</h2>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!messages.length && <p className="text-sm text-slate-400">No messages yet.</p>}
            {messages.map((m, i) => (
              <div key={i} className="text-sm">
                <span className="font-semibold">{m.name}</span>
                {m.role === 'instructor' && <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 px-1 rounded">instructor</span>}
                <p className="text-slate-700">{m.text}</p>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>
          <form onSubmit={send} className="p-3 border-t flex gap-2">
            <input className="border rounded p-2 flex-1 text-sm" placeholder="Type a message" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="bg-indigo-900 text-white rounded px-3 text-sm">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}