const { io } = require('socket.io-client');

const BASE = 'http://localhost:5001';
const COURSE = '6ae9aaea4f50f48f782a2fa2';
let failed = false;

const check = (name, ok) => { console.log(ok ? 'PASS' : 'FAIL', '-', name); if (!ok) failed = true; };

async function login(email) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: '123456' }),
  });
  return (await r.json()).token;
}

const connect = (token) => new Promise((resolve, reject) => {
  const s = io(BASE, { auth: { token }, reconnection: false });
  s.on('connect', () => resolve(s));
  s.on('connect_error', reject);
});
const join = (s) => new Promise((res) => s.emit('join-class', { courseId: COURSE }, res));
const once = (s, ev) => new Promise((res) => s.once(ev, res));

setTimeout(() => { console.log('FAIL - timed out after 15 seconds'); process.exit(1); }, 15000);

(async () => {
  const [instToken, studToken] = await Promise.all([login('inst@test.com'), login('stud@test.com')]);
  const host = await connect(instToken);
  const viewer = await connect(studToken);

  const hostSeesViewer = once(host, 'viewer-joined');
  const a = await join(host);
  check('instructor joins as host', a.role === 'host');
  const b = await join(viewer);
  check('student joins as viewer and the class is live', b.role === 'viewer' && b.live === true);
  const v = await hostSeesViewer;
  check('host is told that a viewer joined', v.viewerId === viewer.id);

  const gotSignal = once(viewer, 'signal');
  host.emit('signal', { to: viewer.id, data: { type: 'offer', sdp: 'test' } });
  const sig = await gotSignal;
  check('signal passes from host to viewer', sig.from === host.id && sig.data.type === 'offer');

  const chatAtHost = once(host, 'chat');
  viewer.emit('chat', { text: 'Hello from student' });
  const m = await chatAtHost;
  check('chat message reaches the instructor', m.text === 'Hello from student' && m.role === 'student');

  try { await connect('bad-token'); check('bad token is rejected', false); }
  catch { check('bad token is rejected', true); }

  const ended = once(viewer, 'class-ended');
  host.disconnect();
  await ended;
  check('students are told when the instructor leaves', true);

  viewer.disconnect();
  console.log(failed ? '\nSome checks FAILED' : '\nAll live class checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });