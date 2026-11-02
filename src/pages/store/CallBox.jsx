import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff } from 'lucide-react';
import { storeApi, storeUrl } from '../../lib/commerce';

const data = (r) => r?.data?.data;

/** The full description with its network routes (one exchange each way, no trickling). */
function gathered(pc) {
    return new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const done = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', done); resolve(); } };
        pc.addEventListener('icegatheringstatechange', done);
        setTimeout(resolve, 4000);
    });
}

function ringer() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const beep = () => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 440; g.gain.value = 0.08; o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(() => o.stop(), 700); };
        beep();
        const t = setInterval(beep, 2500);
        return () => { clearInterval(t); ctx.close().catch(() => {}); };
    } catch { return () => {}; }
}

/**
 * A voice or video call with a customer (WhatsApp-style). Audio and video go directly between the two browsers,
 * encrypted by them; Payport passes the connection details. `start` = { chatId, video, name, avatar } for an outgoing
 * call; `incoming` = { id, chatId, video, name, avatar } for a ringing one.
 */
export default function CallBox({ start, incoming, onClose }) {
    const [state, setState] = useState(start ? 'Starting…' : `${incoming?.video ? 'Video' : 'Voice'} call…`);
    const [live, setLive] = useState(false);
    const [answered, setAnswered] = useState(!!start);
    const [muted, setMuted] = useState(false);
    const [camOff, setCamOff] = useState(false);
    const pc = useRef(null), local = useRef(null), callId = useRef(incoming?.id || 0), poller = useRef(null), timer = useRef(null), stopRing = useRef(null);
    const remoteV = useRef(null), localV = useRef(null);
    const video = start ? start.video : incoming?.video;
    const who = start || incoming || {};

    const cleanUp = (msg) => {
        stopRing.current?.();
        clearInterval(poller.current); clearInterval(timer.current);
        try { pc.current?.close(); } catch { /* closed */ }
        pc.current = null;
        local.current?.getTracks().forEach(t => t.stop());
        local.current = null;
        callId.current = 0;
        setLive(false);
        setState(msg || 'Call ended');
        setTimeout(onClose, 1500);
    };
    const hangUp = () => {
        const id = callId.current;
        if (id) storeApi.endCall(id).catch(() => {});
        cleanUp('Call ended');
    };

    const connect = (servers) => {
        const p = new RTCPeerConnection({ iceServers: servers });
        local.current.getTracks().forEach(t => p.addTrack(t, local.current));
        p.ontrack = (e) => { if (remoteV.current && remoteV.current.srcObject !== e.streams[0]) remoteV.current.srcObject = e.streams[0]; };
        p.onconnectionstatechange = () => {
            if (p.connectionState === 'connected') {
                stopRing.current?.();
                setLive(true);
                const t0 = Date.now();
                clearInterval(timer.current);
                timer.current = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); setState(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`); }, 1000);
            }
            if (p.connectionState === 'failed') hangUp();
        };
        if (video && localV.current) localV.current.srcObject = local.current;
        pc.current = p;
    };

    const follow = (id, outgoing) => {
        clearInterval(poller.current);
        poller.current = setInterval(async () => {
            try {
                const c = data(await storeApi.call(id));
                if (c.state === 'ENDED') { cleanUp(c.endReason === 'DECLINED' ? 'Declined' : c.endReason === 'MISSED' ? 'No answer' : 'Call ended'); return; }
                if (outgoing && c.answer && pc.current && !pc.current.currentRemoteDescription) {
                    setState('Connecting…');
                    await pc.current.setRemoteDescription({ type: 'answer', sdp: c.answer });
                }
            } catch { /* keep trying */ }
        }, 1500);
    };

    const media = () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: video ? { facingMode: 'user', width: { ideal: 1280 } } : false });

    useEffect(() => {
        if (!window.RTCPeerConnection || !navigator.mediaDevices) { cleanUp('This browser cannot make calls'); return undefined; }
        if (start) {
            (async () => {
                try {
                    const [m, ice] = await Promise.all([media(), storeApi.incomingCalls().then(r => data(r)?.iceServers || [])]);
                    local.current = m;
                    connect(ice);
                    await pc.current.setLocalDescription(await pc.current.createOffer());
                    await gathered(pc.current);
                    const c = data(await storeApi.startCall(start.chatId, video, pc.current.localDescription.sdp));
                    callId.current = c.id;
                    setState('Ringing…');
                    follow(c.id, true);
                } catch (e) {
                    cleanUp(e?.name === 'NotAllowedError' ? `Allow the microphone${video ? ' and camera' : ''} to call` : (e?.response?.data?.message || e?.message || 'The call could not be connected'));
                }
            })();
        } else if (incoming) {
            stopRing.current = ringer();
            follow(incoming.id, false);
        }
        return () => { clearInterval(poller.current); clearInterval(timer.current); stopRing.current?.(); };
    }, []);

    const answer = async () => {
        setAnswered(true);
        stopRing.current?.();
        setState('Connecting…');
        try {
            const [c, m, ice] = await Promise.all([storeApi.call(incoming.id).then(data), media(), storeApi.incomingCalls().then(r => data(r)?.iceServers || [])]);
            local.current = m;
            connect(ice);
            await pc.current.setRemoteDescription({ type: 'offer', sdp: c.offer });
            await pc.current.setLocalDescription(await pc.current.createAnswer());
            await gathered(pc.current);
            await storeApi.answerCall(incoming.id, pc.current.localDescription.sdp);
        } catch (e) {
            hangUp();
            setState(e?.name === 'NotAllowedError' ? 'Allow the microphone to answer' : 'The call could not be connected');
        }
    };

    const toggle = (kind) => {
        const tracks = kind === 'audio' ? local.current?.getAudioTracks() : local.current?.getVideoTracks();
        if (!tracks?.length) return;
        const on = tracks.some(t => t.enabled);
        tracks.forEach(t => { t.enabled = !on; });
        if (kind === 'audio') setMuted(on); else setCamOff(on);
    };

    const round = (bg) => ({ width: 62, height: 62, borderRadius: '50%', border: 0, background: bg, color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' });
    const avatar = storeUrl(who.avatar);
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'radial-gradient(circle at 50% 30%, #123a60, #0E2A47 70%)', color: '#fff',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '48px 16px 40px' }}>
            {video && <video ref={remoteV} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} />}
            {!video && <audio ref={remoteV} autoPlay />}
            {video && <video ref={localV} autoPlay playsInline muted style={{ position: 'absolute', right: 16, top: 16, width: 'min(28vw, 220px)', aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 12, border: '2px solid rgba(255,255,255,.6)', background: '#000', zIndex: 2 }} />}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>
                {!(video && live) && (avatar
                    ? <img src={avatar} alt="" style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover' }} />
                    : <span style={{ width: 110, height: 110, borderRadius: '50%', background: '#06A3DA', display: 'grid', placeItems: 'center', fontSize: 44, fontWeight: 700 }}>{(who.name || '?').charAt(0).toUpperCase()}</span>)}
                <strong style={{ fontSize: 26 }}>{who.name}</strong>
                <span style={{ fontSize: 16, color: '#cfe6f5' }}>{state}</span>
            </div>
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 22 }}>
                {answered && <button type="button" style={round(muted ? '#fff' : 'rgba(255,255,255,.18)')} onClick={() => toggle('audio')} aria-label="Mute">{muted ? <MicOff color="#0E2A47" /> : <Mic />}</button>}
                {answered && video && <button type="button" style={round(camOff ? '#fff' : 'rgba(255,255,255,.18)')} onClick={() => toggle('video')} aria-label="Camera">{camOff ? <VideoOff color="#0E2A47" /> : <Video />}</button>}
                {!answered && <button type="button" style={round('#22c55e')} onClick={answer} aria-label="Answer"><Phone /></button>}
                <button type="button" style={round('#e53935')} onClick={hangUp} aria-label="Hang up"><PhoneOff /></button>
            </div>
        </div>
    );
}
