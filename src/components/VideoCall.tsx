'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface VideoCallProps {
  appointmentId: string;
  userId: string;
  userName: string;
  role: 'doctor' | 'patient';
  onClose: () => void;
}

type ConnectionStatus =
  | 'connecting'
  | 'waiting'
  | 'calling'
  | 'connected'
  | 'reconnecting'
  | 'ended';

// ── Low-bandwidth SDP helpers ─────────────────────────────────────────────────
// Cap video bitrate at 150 kbps and audio at 40 kbps in the SDP.
function capSdpBandwidth(sdp: string): string {
  // Insert b=AS: after each m= section for video and audio
  return sdp
    .replace(/(m=video[^\n]*\n)/g, '$1b=AS:150\n')
    .replace(/(m=audio[^\n]*\n)/g, '$1b=AS:40\n');
}

// Prefer VP9 → VP8 for better compression at low bitrate
function preferCodec(sdp: string, codec: string): string {
  const lines = sdp.split('\n');
  const mLineIndex = lines.findIndex(l => l.startsWith('m=video'));
  if (mLineIndex === -1) return sdp;

  const codecRegex = new RegExp(`a=rtpmap:(\\d+) ${codec}`, 'i');
  const codecLine = lines.find(l => codecRegex.test(l));
  if (!codecLine) return sdp;

  const payloadMatch = codecLine.match(/a=rtpmap:(\d+)/);
  if (!payloadMatch) return sdp;
  const payload = payloadMatch[1];

  const mLine = lines[mLineIndex];
  const parts = mLine.split(' ');
  // Move preferred payload to front (after port and protocol)
  const filtered = parts.filter((p, i) => i <= 2 || p !== payload);
  filtered.splice(3, 0, payload);
  lines[mLineIndex] = filtered.join(' ');
  return lines.join('\n');
}

// Low-bandwidth video/audio constraints
const LOW_BW_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 320, max: 480 },
    height: { ideal: 240, max: 360 },
    frameRate: { ideal: 15, max: 20 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 16000,    // 16 kHz is fine for voice
    channelCount: 1,       // mono saves bandwidth
  },
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

const SIGNALING_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

export default function VideoCall({ appointmentId, userId, userName, role, onClose }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [lowBwMode, setLowBwMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const stopCall = useCallback((emitEnd = true) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (emitEnd && socketRef.current) {
      socketRef.current.emit('end-call', appointmentId);
    }
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus('ended');
  }, [appointmentId]);

  // Apply low-bandwidth cap on an RTCRtpSender
  const applyBandwidthCap = useCallback(async (pc: RTCPeerConnection) => {
    for (const sender of pc.getSenders()) {
      if (!sender.track) continue;
      const params = sender.getParameters();
      if (!params.encodings) params.encodings = [{}];
      if (sender.track.kind === 'video') {
        params.encodings[0].maxBitrate = lowBwMode ? 60_000 : 150_000;
        params.encodings[0].maxFramerate = lowBwMode ? 8 : 15;
        params.encodings[0].scaleResolutionDownBy = lowBwMode ? 2 : 1;
      } else if (sender.track.kind === 'audio') {
        params.encodings[0].maxBitrate = 40_000;
      }
      try { await sender.setParameters(params); } catch (_) {}
    }
  }, [lowBwMode]);

  const createPeerConnection = useCallback((stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Show remote stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setStatus('connected');
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      }
    };

    // Send ICE candidates via signaling
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        const peerId = (pc as any)._peerId as string | undefined;
        if (peerId) {
          socketRef.current.emit('ice-candidate', { candidate: event.candidate, to: peerId });
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStatus('reconnecting');
      } else if (pc.connectionState === 'connected') {
        setStatus('connected');
        applyBandwidthCap(pc);
      }
    };

    return pc;
  }, [applyBandwidthCap]);

  // ── Main Effect ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 1. Get local media
        const stream = await navigator.mediaDevices.getUserMedia(LOW_BW_CONSTRAINTS);
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Connect to signaling server
        const socket = io(SIGNALING_URL, { transports: ['websocket'] });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('join-room', appointmentId, userId);
          setStatus('waiting');
        });

        socket.on('room-full', () => {
          setErrorMsg('Call room is full. Please try again later.');
          setStatus('ended');
        });

        // Someone already in the room — we are the late joiner, so create offer
        socket.on('peer-joined', async (peerId: string) => {
          setStatus('calling');
          const pc = createPeerConnection(stream);
          (pc as any)._peerId = peerId;
          pcRef.current = pc;

          const offer = await pc.createOffer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: true,
          });
          let sdp = capSdpBandwidth(offer.sdp || '');
          sdp = preferCodec(sdp, 'VP9');
          sdp = preferCodec(sdp, 'VP8');
          await pc.setLocalDescription({ type: offer.type, sdp });
          socket.emit('offer', { sdp: { type: offer.type, sdp }, to: peerId });
        });

        // We are the early joiner, receive peers list (empty until someone joins)
        socket.on('room-peers', (peers: string[]) => {
          if (peers.length === 0) setStatus('waiting');
        });

        // Received an offer — we are the early joiner
        socket.on('offer', async ({ sdp, from }: { sdp: RTCSessionDescriptionInit; from: string }) => {
          setStatus('calling');
          const pc = createPeerConnection(stream);
          (pc as any)._peerId = from;
          pcRef.current = pc;

          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          let answerSdp = capSdpBandwidth(answer.sdp || '');
          answerSdp = preferCodec(answerSdp, 'VP9');
          await pc.setLocalDescription({ type: answer.type, sdp: answerSdp });
          socket.emit('answer', { sdp: { type: answer.type, sdp: answerSdp }, to: from });
        });

        socket.on('answer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
          await pcRef.current?.setRemoteDescription(new RTCSessionDescription(sdp));
        });

        socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
          try {
            await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (_) {}
        });

        socket.on('call-ended', () => {
          stopCall(false);
        });

        socket.on('disconnect', () => {
          if (!cancelled) setStatus('reconnecting');
        });

      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message || 'Could not access camera/microphone.');
          setStatus('ended');
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      stopCall(true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, userId]);

  // ── Re-apply bandwidth when low-bw mode toggled ───────────────────────────
  useEffect(() => {
    if (pcRef.current && status === 'connected') {
      applyBandwidthCap(pcRef.current);
    }
  }, [lowBwMode, applyBandwidthCap, status]);

  // ── UI Controls ───────────────────────────────────────────────────────────────
  const toggleAudio = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setAudioEnabled(p => !p);
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setVideoEnabled(p => !p);
  };

  const handleEndCall = () => { stopCall(true); onClose(); };

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const statusLabels: Record<ConnectionStatus, string> = {
    connecting: 'Connecting…',
    waiting: 'Waiting for the other person to join…',
    calling: 'Establishing connection…',
    connected: `Connected · ${formatDuration(duration)}`,
    reconnecting: 'Reconnecting…',
    ended: 'Call ended',
  };

  const statusColors: Record<ConnectionStatus, string> = {
    connecting: 'text-yellow-400',
    waiting: 'text-blue-400',
    calling: 'text-yellow-400',
    connected: 'text-green-400',
    reconnecting: 'text-orange-400',
    ended: 'text-red-400',
  };

  if (status === 'ended') {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-2xl p-8 text-center max-w-sm w-full mx-4">
          <div className="text-6xl mb-4">📵</div>
          <h2 className="text-white text-xl font-semibold mb-2">Call Ended</h2>
          {errorMsg && <p className="text-red-400 text-sm mb-4">{errorMsg}</p>}
          {duration > 0 && (
            <p className="text-gray-400 text-sm mb-4">Duration: {formatDuration(duration)}</p>
          )}
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 backdrop-blur">
        <div>
          <h2 className="text-white font-semibold text-sm">Appointment Video Call</h2>
          <p className={`text-xs font-medium ${statusColors[status]}`}>{statusLabels[status]}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Low-bandwidth toggle */}
          <button
            onClick={() => setLowBwMode(p => !p)}
            title={lowBwMode ? 'Low-BW mode ON (60 kbps)' : 'Switch to Low-BW mode'}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              lowBwMode
                ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-orange-400'
            }`}
          >
            {lowBwMode ? '📶 Low BW' : '📶 Normal'}
          </button>
          <span className="text-gray-400 text-xs">{userName}</span>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative overflow-hidden bg-gray-950">
        {/* Remote video — full screen */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Placeholder when waiting */}
        {status !== 'connected' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
            <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-4xl mb-4">
              {role === 'doctor' ? '👨‍⚕️' : '🧑'}
            </div>
            <p className={`text-lg font-medium ${statusColors[status]}`}>{statusLabels[status]}</p>
            {status === 'waiting' && (
              <p className="text-gray-500 text-sm mt-2">
                Share this appointment link or wait for them to join
              </p>
            )}
          </div>
        )}

        {/* Local video — picture-in-picture */}
        <div className="absolute bottom-4 right-4 w-32 h-24 sm:w-40 sm:h-28 rounded-xl overflow-hidden border-2 border-gray-700 shadow-xl bg-gray-800">
          {videoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
              🎥
            </div>
          )}
          <span className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1 rounded">
            You
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-4 px-4 bg-gray-900/80 backdrop-blur">
        {/* Audio toggle */}
        <button
          onClick={toggleAudio}
          title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition shadow-lg ${
            audioEnabled
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {audioEnabled ? '🎙️' : '🔇'}
        </button>

        {/* Video toggle */}
        <button
          onClick={toggleVideo}
          title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition shadow-lg ${
            videoEnabled
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {videoEnabled ? '📹' : '📷'}
        </button>

        {/* End call */}
        <button
          onClick={handleEndCall}
          title="End call"
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-2xl text-white transition shadow-xl"
        >
          📵
        </button>
      </div>

      {/* Low-bandwidth info bar */}
      {lowBwMode && (
        <div className="bg-orange-900/40 text-orange-300 text-xs text-center py-1.5 px-4">
          Low-bandwidth mode active · Video capped at 60 kbps · 8 fps · Half resolution
        </div>
      )}
    </div>
  );
}
