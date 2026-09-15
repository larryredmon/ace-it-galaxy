import { useState, useEffect, useRef } from "react";
import { db, storage, app } from "../firebase";
import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  serverTimestamp, deleteField, getDoc, getDocs, query, orderBy, limit, where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getDatabase, ref as rtdbRef, set as rtdbSet, remove as rtdbRemove, onValue, onDisconnect } from "firebase/database";
const rtdb = getDatabase(app);

// ── Study Buddy presence tuning ───────────────────────────────────────────────
const NEW_ROOM_GRACE_MS = 120000; // don't auto-close a room younger than this
const JOIN_GRACE_MS     = 15000;  // wait this long before treating a Firestore participant as gone

function StudyBuddyApp({ onBack, user, openAuth }) {
  const SB = '#FFA8D0';
  const [view,         setView]         = useState('lobby');
  const [rooms,        setRooms]        = useState([]);
  const [presenceMap,  setPresenceMap]  = useState({});
  const [searchQ,      setSearchQ]      = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [createForm,   setCreateForm]   = useState({ title:'', subject:'', isPublic:true, maxParticipants:6 });
  const [showJoin,     setShowJoin]     = useState(false);
  const [joinInput,    setJoinInput]    = useState('');
  const [joining,      setJoining]      = useState(false);
  const [activeRoom,   setActiveRoom]   = useState(null);
  const [roomCode,     setRoomCode]     = useState('');
  const [participants, setParticipants] = useState({});
  const [messages,     setMessages]     = useState([]);
  const [newMsg,       setNewMsg]       = useState('');
  const [timerSecs,    setTimerSecs]    = useState(25*60);
  const [timerOn,      setTimerOn]      = useState(false);
  const [timerMode,    setTimerMode]    = useState('focus');
  const [showChat,     setShowChat]     = useState(true);
  const [localStream,  setLocalStream]  = useState(null);
  const [remoteStreams,setRemoteStreams] = useState({});
  const [videoOn,      setVideoOn]      = useState(true);
  const [audioOn,      setAudioOn]      = useState(true);
  const [mediaError,   setMediaError]   = useState(null);
  const [studyView,    setStudyView]    = useState('video');
  const [docPages,     setDocPages]     = useState([]);
  const [docPage,      setDocPage]      = useState(0);
  const [docName,      setDocName]      = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [sharedDocs,   setSharedDocs]   = useState({}); // {uid: {url,name,isPDF,uploaderName}}
  const [activeDocUid, setActiveDocUid] = useState(null); // whose doc is being viewed
  const [screenSharing, setScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);
  const [errMsg,       setErrMsg]       = useState('');
  const [roomLocked,   setRoomLocked]   = useState(false);
  const [pinnedMsg,    setPinnedMsg]    = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const localVidRef    = useRef(null);
  const remoteVidRefs  = useRef({});
  const peerConns      = useRef({});
  const localStreamRef = useRef(null);
  const participantsRef  = useRef({});
  const activeRoomRef  = useRef(null);
  const unsubRooms     = useRef(null);
  const unsubRoom      = useRef(null);
  const unsubMsgs      = useRef(null);
  const unsubSigs      = useRef(null);
  const timerRef       = useRef(null);
  const msgEndRef      = useRef(null);
  const processedSigs    = useRef(new Set());
  const iceCandidateQueue = useRef({});
  const joinedAt          = useRef(0);
  const healthRef         = useRef(null);
  const presenceRef       = useRef(null);
  const unsubPresence     = useRef(null);

  const ICE_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'turn:openrelay.metered.ca:80',  username:'openrelayproject', credential:'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username:'openrelayproject', credential:'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username:'openrelayproject', credential:'openrelayproject' },
    ]
  };

  useEffect(()=>{
    try{
      const q=query(collection(db,'studyRooms'),orderBy('createdAt','desc'),limit(50));
      unsubRooms.current=onSnapshot(q,snap=>{setRooms(snap.docs.map(d=>({id:d.id,...d.data()})));},()=>{});
    }catch{}
    return()=>{unsubRooms.current?.();};
  },[]);
  // Live presence for the lobby — who is actually connected right now (Realtime DB)
  useEffect(()=>{
    let unsub=null;
    try{ unsub=onValue(rtdbRef(rtdb,'presence'),snap=>setPresenceMap(snap.val()||{}),()=>{}); }catch{}
    return()=>{try{unsub&&unsub();}catch{}};
  },[]);
  // Auto-close any room with nobody connected (after a short grace for brand-new rooms)
  useEffect(()=>{
    const now=Date.now();
    rooms.forEach(r=>{
      const activeCount=Object.keys(presenceMap[r.id]||{}).length;
      const created=r.createdAt?.toDate?.()?.getTime?.()||now;
      if(activeCount===0 && (now-created)>NEW_ROOM_GRACE_MS){ deleteDoc(doc(db,'studyRooms',r.id)).catch(()=>{}); }
    });
  },[rooms,presenceMap]);

  useEffect(()=>{msgEndRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);
  useEffect(()=>{if(localVidRef.current&&localStream)localVidRef.current.srcObject=localStream;},[localStream]);
  useEffect(()=>{Object.entries(remoteStreams).forEach(([uid,stream])=>{const el=remoteVidRefs.current[uid];if(el&&el.srcObject!==stream){el.srcObject=stream;el.play().catch(()=>{});}});},[remoteStreams]);
  useEffect(()=>{
    if(timerOn){timerRef.current=setInterval(()=>{setTimerSecs(s=>{if(s<=1){clearInterval(timerRef.current);setTimerOn(false);const next=timerMode==='focus'?'break':'focus';setTimerMode(next);return next==='focus'?25*60:5*60;}return s-1;});},1000);}
    else clearInterval(timerRef.current);
    return()=>clearInterval(timerRef.current);
  },[timerOn,timerMode]);
  useEffect(()=>()=>{doLeave(true);unsubRooms.current?.();},[]);

  const makePC = (roomId, targetUid) => {
    const old = peerConns.current[targetUid];
    if (old) { try { old.close(); } catch {} }
    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConns.current[targetUid] = pc;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => { try { pc.addTrack(t, localStreamRef.current); } catch {} });
    }
    const remoteStream = new MediaStream();
    pc.ontrack = e => {
      const track = e.track;
      remoteStream.getTracks().filter(t => t.kind === track.kind).forEach(t => remoteStream.removeTrack(t));
      remoteStream.addTrack(track);
      setRemoteStreams(prev => ({ ...prev, [targetUid]: remoteStream }));
      track.onunmute = () => setRemoteStreams(prev => ({ ...prev, [targetUid]: remoteStream }));
    };
    pc.onicecandidate = async e => {
      if (!e.candidate) return;
      try { await addDoc(collection(db,'studyRooms',roomId,'signals'),{from:user.uid,to:targetUid,type:'ice-candidate',data:JSON.stringify(e.candidate),ts:serverTimestamp()}); } catch {}
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'failed') {
        pc.restartIce();
        setTimeout(() => { if (peerConns.current[targetUid]===pc && pc.connectionState==='failed') connectToPeer(roomId,targetUid); }, 4000);
      }
      if (s === 'disconnected') {
        setTimeout(() => { if (peerConns.current[targetUid]===pc && (pc.connectionState==='disconnected'||pc.connectionState==='failed')) connectToPeer(roomId,targetUid); }, 8000);
      }
      if (s === 'closed') {
        setRemoteStreams(prev => { const n={...prev}; delete n[targetUid]; return n; });
        if (peerConns.current[targetUid]===pc) delete peerConns.current[targetUid];
      }
    };
    return pc;
  };

  const sendOffer = async (roomId, targetUid) => {
    if (user.uid > targetUid) return;
    const existing = peerConns.current[targetUid];
    if (existing) {
      const cs = existing.connectionState;
      if (cs==='connected'||cs==='connecting') return;
      try { existing.close(); } catch {}
      delete peerConns.current[targetUid];
    }
    const pc = makePC(roomId, targetUid);
    try {
      const offer = await pc.createOffer({offerToReceiveAudio:true,offerToReceiveVideo:true});
      await pc.setLocalDescription(offer);
      await addDoc(collection(db,'studyRooms',roomId,'signals'),{from:user.uid,to:targetUid,type:'offer',data:JSON.stringify(pc.localDescription),ts:serverTimestamp()});
    } catch(e) { console.error('[WebRTC] sendOffer:',e.message); }
  };

  const connectToPeer = async (roomId, targetUid) => {
    if (user.uid < targetUid) {
      await sendOffer(roomId, targetUid);
    } else {
      const existing = peerConns.current[targetUid];
      if (!existing || existing.connectionState==='failed' || existing.connectionState==='closed') {
        makePC(roomId, targetUid);
      }
    }
  };

  const handleSignal = async (roomId, sig, sigId) => {
    if (sigId && processedSigs.current.has(sigId)) return;
    if (sigId) processedSigs.current.add(sigId);
    const { from, type, data } = sig;
    if (from === user.uid) return;
    const sigTime = sig.ts?.toMillis?.() || (sig.ts?.seconds ? sig.ts.seconds*1000 : 0);
    if (sigTime > 0 && sigTime < joinedAt.current - 5000) return;
    let pc = peerConns.current[from];
    if (!pc || pc.connectionState==='closed') pc = makePC(roomId, from);
    try {
      if (type==='offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data)));
        const queued = iceCandidateQueue.current[from]||[];
        for (const cand of queued) { try { await pc.addIceCandidate(cand); } catch {} }
        iceCandidateQueue.current[from] = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await addDoc(collection(db,'studyRooms',roomId,'signals'),{from:user.uid,to:from,type:'answer',data:JSON.stringify(pc.localDescription),ts:serverTimestamp()});
      } else if (type==='answer') {
        if (pc.signalingState==='have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data)));
          const queued = iceCandidateQueue.current[from]||[];
          for (const cand of queued) { try { await pc.addIceCandidate(cand); } catch {} }
          iceCandidateQueue.current[from] = [];
        }
      } else if (type==='ice-candidate') {
        const candidate = new RTCIceCandidate(JSON.parse(data));
        if (pc.remoteDescription) { try { await pc.addIceCandidate(candidate); } catch {} }
        else { if (!iceCandidateQueue.current[from]) iceCandidateQueue.current[from]=[]; iceCandidateQueue.current[from].push(candidate); }
      }
    } catch(e) { console.error('[WebRTC] handleSignal:',type,from.slice(-4),e.message); }
  };

  const startMedia = async () => {
    setMediaError(null);
    const attempts = [
      {video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'},audio:{echoCancellation:true,noiseSuppression:true}},
      {video:true,audio:true},
      {video:false,audio:true},
    ];
    for (let i=0; i<attempts.length; i++) {
      try {
        const s = await navigator.mediaDevices.getUserMedia(attempts[i]);
        localStreamRef.current=s; setLocalStream(s);
        if (i===2) setMediaError('Camera unavailable — audio only.');
        return s;
      } catch(e) {
        if (i===attempts.length-1) setMediaError(e.name==='NotAllowedError' ? 'Camera & mic blocked. Tap 🔒 in address bar → Allow → rejoin.' : 'Could not access camera.');
      }
    }
    return null;
  };

  const renderPDFFromUrl=async(url)=>{
    try{
      const res=await fetch(url);
      const arrayBuffer=await res.arrayBuffer();
      if(!window['pdfjs-dist/build/pdf']){
        await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});
      }
      const lib=window['pdfjs-dist/build/pdf'];
      lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      const pdf=await lib.getDocument({data:arrayBuffer}).promise;
      const totalPages=pdf.numPages;
      const maxPages=Math.min(totalPages,100);
      if(totalPages>100){console.warn(`[PDF] Document has ${totalPages} pages, showing first 100.`);}
      const pages=[];
      for(let p=1;p<=maxPages;p++){
        const page=await pdf.getPage(p);
        const viewport=page.getViewport({scale:1.5});
        const canvas=document.createElement('canvas');
        canvas.width=viewport.width;canvas.height=viewport.height;
        await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
        pages.push(canvas.toDataURL('image/jpeg',0.75));
      }
      setDocPages(pages);setDocPage(0);
    }catch(e){console.error('PDF URL render error:',e);}
  };

  const renderPDFDoc=async(file)=>{
    setDocUploading(true);
    try{
      const arrayBuffer=await file.arrayBuffer();
      const pdfjsLib=window['pdfjs-dist/build/pdf'];
      if(!pdfjsLib){
        // Load PDF.js dynamically
        await new Promise((res,rej)=>{
          const s=document.createElement('script');
          s.src='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
          s.onload=res;s.onerror=rej;document.head.appendChild(s);
        });
        window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      }
      const lib=window['pdfjs-dist/build/pdf'];
      lib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      const pdf=await lib.getDocument({data:arrayBuffer}).promise;
      const pages=[];
      const totalPages=pdf.numPages;
      const maxPages=Math.min(totalPages,100);
      if(totalPages>100){setErrMsg(`Note: showing first 100 of ${totalPages} pages.`);setTimeout(()=>setErrMsg(''),5000);}
      for(let p=1;p<=maxPages;p++){
        const page=await pdf.getPage(p);
        const viewport=page.getViewport({scale:1.5});
        const canvas=document.createElement('canvas');
        canvas.width=viewport.width;canvas.height=viewport.height;
        await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
        pages.push(canvas.toDataURL('image/jpeg',0.75));
      }
      setDocPages(pages);setDocPage(0);setDocName(file.name);setStudyView('doc');
      // Also upload to storage and share URL + pages with room
      await uploadStudyDoc(file);
    }catch(e){console.error('PDF render error:',e);}
    setDocUploading(false);
  };

  const uploadStudyDoc=async(file)=>{
    if(!file||!activeRoom)return;
    setDocUploading(true);
    try{
      const storageRef=ref(storage,`studyRooms/${activeRoom.id}/studyDoc_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef,file);
      const url=await getDownloadURL(storageRef);
      const isPDF=file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf');
      await updateDoc(doc(db,'studyRooms',activeRoom.id),{[`studyDocs.${user.uid}`]:{url,name:file.name,isPDF,uploadedBy:user.uid,uploaderName:user.name||'Someone',uploadedAt:Date.now()}});
      setSharedDocs(prev=>({...prev,[user.uid]:{url,name:file.name,isPDF,uploadedBy:user.uid,uploaderName:user.name||'Someone'}}));
      setActiveDocUid(user.uid);
      setDocPages(existing=>existing.length>1?existing:[url]);
      setDocPage(0);setStudyView('doc');
    }catch(e){console.error('Upload error:',e.message);}
    setDocUploading(false);
  };

  const enterRoom=async(room)=>{
    if(!user){openAuth('login');return;}
    if(room.isLocked&&room.host!==user.uid){setErrMsg('This room is locked.');return;}
    const currentCount=Object.keys(room.participants||{}).length;
    if(room.maxParticipants&&currentCount>=room.maxParticipants&&room.host!==user.uid){setErrMsg(`This room is full (${currentCount}/${room.maxParticipants} people).`);return;}
    setJoining(true);setErrMsg('');
    try{
      const up=updateDoc(doc(db,'studyRooms',room.id),{[`participants.${user.uid}`]:{name:user.name||'User',avatar:user.avatar||'?',uid:user.uid,joinedAt:new Date().toISOString()}});
      await Promise.race([up,new Promise((_,rej)=>setTimeout(()=>rej(new Error('Connection timed out.')),8000))]);
      setActiveRoom(room);activeRoomRef.current=room;setRoomLocked(room.isLocked||false);
      joinedAt.current = Date.now();setView('room');setJoining(false);
      await startMedia();
      // ── Realtime presence: server removes me automatically if my tab closes / crashes ──
      try{
        const pRef=rtdbRef(rtdb,`presence/${room.id}/${user.uid}`);
        await rtdbSet(pRef,{uid:user.uid,at:Date.now()});
        onDisconnect(pRef).remove();
        presenceRef.current=pRef;
        unsubPresence.current=onValue(rtdbRef(rtdb,`presence/${room.id}`),snap=>{
          const present=snap.val()||{}; const rid=activeRoomRef.current?.id; if(!rid)return;
          const now=Date.now(), parts=participantsRef.current||{};
          // Drop anyone still listed in Firestore who is no longer connected
          Object.entries(parts).forEach(([uid,pp])=>{
            const joined=pp.joinedAt?Date.parse(pp.joinedAt):0;
            if(!present[uid] && (now-joined)>JOIN_GRACE_MS){
              updateDoc(doc(db,'studyRooms',rid),{[`participants.${uid}`]:deleteField(),[`studyDocs.${uid}`]:deleteField()}).catch(()=>{});
              const pc=peerConns.current[uid]; if(pc){try{pc.close();}catch{} delete peerConns.current[uid];}
            }
          });
          // Nobody connected anymore → close the room
          if(Object.keys(present).length===0){ deleteDoc(doc(db,'studyRooms',rid)).catch(()=>{}); }
        },()=>{});
      }catch{}
      healthRef.current=setInterval(()=>{
        const rId=activeRoomRef.current?.id;
        if(!rId)return;
        Object.entries(peerConns.current).forEach(([uid,pc])=>{
          const s=pc.connectionState;
          if(s==='failed'||s==='closed'||s==='disconnected'){console.log('[health] reconnect',uid.slice(-4));connectToPeer(rId,uid);}
        });
        Object.keys(participantsRef.current||{}).forEach(uid=>{
          if(uid!==user.uid&&(!peerConns.current[uid]||peerConns.current[uid].connectionState==='failed')){console.log('[health] missing peer',uid.slice(-4));connectToPeer(rId,uid);}
        });
      },6000);
      try{unsubRoom.current=onSnapshot(doc(db,'studyRooms',room.id),snap=>{if(!snap.exists()){doLeave(true);return;}const d=snap.data();const parts=d.participants||{};setParticipants(parts);participantsRef.current=parts;setRoomLocked(d.isLocked||false);if(d.timerOn!==undefined)setTimerOn(d.timerOn);if(d.timerSecs!==undefined)setTimerSecs(d.timerSecs);if(d.timerMode!==undefined)setTimerMode(d.timerMode);if(d.pinnedMsg!==undefined)setPinnedMsg(d.pinnedMsg||null);
          if(d.studyDocs){
            setSharedDocs(prev=>{
              const incoming=d.studyDocs||{};
              // Load pages for newly added docs
              Object.entries(incoming).forEach(([uid,docInfo])=>{
                if(!prev[uid]&&docInfo.url&&uid!==user.uid){
                  // New doc from another user - auto-switch to it if no doc selected
                  setActiveDocUid(aid=>aid||uid);
                }
              });
              return incoming;
            });
          }Object.keys(parts).forEach(uid=>{if(uid!==user.uid&&localStreamRef.current&&(!peerConns.current[uid]||peerConns.current[uid].connectionState==='failed'||peerConns.current[uid].connectionState==='closed'))connectToPeer(room.id,uid);});},()=>{});}catch{}
      try{const mq=query(collection(db,'studyRooms',room.id,'messages'),orderBy('ts','asc'));unsubMsgs.current=onSnapshot(mq,snap=>{setMessages(snap.docs.map(d=>({id:d.id,...d.data()})));},()=>{});}catch{}
      try{const sq=collection(db,'studyRooms',room.id,'signals');unsubSigs.current=onSnapshot(sq,snap=>{snap.docChanges().forEach(c=>{if(c.type==='added'){const sig=c.doc.data();if(sig.to===user.uid)handleSignal(room.id,sig,c.doc.id);}});},()=>{});}catch{}
      try{const snap2=await getDoc(doc(db,'studyRooms',room.id));Object.keys(snap2.data()?.participants||{}).forEach(uid=>{if(uid!==user.uid)connectToPeer(room.id,uid);});}catch{}
    }catch(e){setErrMsg(e.message||'Failed to join.');setJoining(false);}
  };

  const createRoom=async()=>{
    if(!user){openAuth('login');return;}
    if(!createForm.title.trim()||!createForm.subject.trim())return;
    setJoining(true);setErrMsg('');
    try{
      const code=createForm.isPublic?'':Math.random().toString(36).substr(2,6).toUpperCase();
      const addP=addDoc(collection(db,'studyRooms'),{title:createForm.title.trim(),subject:createForm.subject.trim(),host:user.uid,hostName:user.name,isPublic:createForm.isPublic,code,maxParticipants:Math.min(createForm.maxParticipants||6,6),isLocked:false,participants:{},createdAt:serverTimestamp(),timerOn:false,timerSecs:25*60,timerMode:'focus',pinnedMsg:null});
      const ref=await Promise.race([addP,new Promise((_,rej)=>setTimeout(()=>rej(new Error('Firestore timed out.')),8000))]);
      const room={id:ref.id,...createForm,code,host:user.uid,hostName:user.name,participants:{},isLocked:false};
      setShowCreate(false);if(!createForm.isPublic)setRoomCode(code);setCreateForm({title:'',subject:'',isPublic:true,maxParticipants:6});
      await enterRoom(room);
    }catch(e){setErrMsg(e.message||'Failed to create room.');setJoining(false);}
  };

  const joinByCode=async()=>{
    if(!user){openAuth('login');return;}if(joinInput.length<6)return;setErrMsg('');
    try{const q=query(collection(db,'studyRooms'),where('code','==',joinInput.trim().toUpperCase()));const snap=await getDocs(q);if(snap.empty){setErrMsg('Room not found.');return;}setShowJoin(false);setJoinInput('');await enterRoom({id:snap.docs[0].id,...snap.docs[0].data()});}
    catch{setErrMsg('Could not find that room.');}
  };

  const doLeave=async(silent=false)=>{
    // Stop screen share if active
    screenStreamRef.current?.getTracks().forEach(t=>t.stop());screenStreamRef.current=null;setScreenSharing(false);
    localStreamRef.current?.getTracks().forEach(t=>t.stop());localStreamRef.current=null;setLocalStream(null);
    Object.values(peerConns.current).forEach(pc=>pc.close());peerConns.current={};setRemoteStreams({});
    unsubRoom.current?.();unsubMsgs.current?.();unsubSigs.current?.();unsubPresence.current?.();unsubPresence.current=null;clearInterval(timerRef.current);clearInterval(healthRef.current);processedSigs.current.clear();iceCandidateQueue.current={};joinedAt.current=0;
    if(presenceRef.current){try{onDisconnect(presenceRef.current).cancel();}catch{}try{rtdbRemove(presenceRef.current);}catch{}presenceRef.current=null;}
    if(!silent&&activeRoomRef.current&&user){
      const roomId=activeRoomRef.current.id;
      try{
        // Delete my uploaded study doc from Storage
        const roomSnap=await getDoc(doc(db,'studyRooms',roomId));
        const myDoc=roomSnap.data()?.studyDocs?.[user.uid];
        if(myDoc?.url){try{const url=new URL(myDoc.url);const path=decodeURIComponent(url.pathname.split('/o/')[1]?.split('?')[0]||'');if(path){await deleteObject(ref(storage,path));}}catch{}}
        // Clean up my signals
        const sigSnap=await getDocs(query(collection(db,'studyRooms',roomId,'signals'),where('from','==',user.uid)));
        await Promise.all(sigSnap.docs.map(d=>deleteDoc(d.ref)));
      }catch{}
      try{
        await updateDoc(doc(db,'studyRooms',roomId),{[`participants.${user.uid}`]:deleteField(),[`studyDocs.${user.uid}`]:deleteField()});
        const snap=await getDoc(doc(db,'studyRooms',roomId));
        if(snap.exists()&&Object.keys(snap.data()?.participants||{}).length===0)await deleteDoc(doc(db,'studyRooms',roomId));
      }catch{}
    }
    setActiveRoom(null);activeRoomRef.current=null;setMessages([]);setParticipants({});setTimerSecs(25*60);setTimerOn(false);setTimerMode('focus');setRoomCode('');setView('lobby');setPinnedMsg(null);setDocPages([]);setDocName('');setDocPage(0);setStudyView('video');setSharedDocs({});setActiveDocUid(null);setScreenSharing(false);
  };

  const sendMsg=async()=>{if(!newMsg.trim()||!activeRoom)return;const t=newMsg.trim();setNewMsg('');try{await addDoc(collection(db,'studyRooms',activeRoom.id,'messages'),{text:t,userId:user.uid,userName:user.name,avatar:user.avatar,ts:serverTimestamp(),reactions:{}});}catch{}};
  const syncTimer=async(u)=>{if(!activeRoom)return;try{await updateDoc(doc(db,'studyRooms',activeRoom.id),{...u,timerChangedBy:user.name||'Someone'});}catch{}};
  const toggleVideo=()=>{const t=localStreamRef.current?.getVideoTracks()[0];if(t){t.enabled=!videoOn;setVideoOn(!videoOn);}};

  // Load pages when active doc changes
  useEffect(()=>{
    if(!activeDocUid||!sharedDocs[activeDocUid])return;
    const docInfo=sharedDocs[activeDocUid];
    if(!docInfo.url)return;
    setDocPages([]);
    setDocPage(0);
    if(docInfo.isPDF){
      renderPDFFromUrl(docInfo.url);
    } else {
      setDocPages([docInfo.url]);
    }
  },[activeDocUid]);

  // Attach local stream to video element whenever stream changes
  useEffect(()=>{
    if(localVidRef.current && localStream){
      localVidRef.current.srcObject=localStream;
      localVidRef.current.play().catch(()=>{});
    }
  },[localStream]);
  const toggleAudio=()=>{const t=localStreamRef.current?.getAudioTracks()[0];if(t){t.enabled=!audioOn;setAudioOn(!audioOn);}};
  const toggleScreenShare=async()=>{
    if(screenSharing){
      screenStreamRef.current?.getTracks().forEach(t=>t.stop());screenStreamRef.current=null;setScreenSharing(false);
      // Restore camera track to all peers
      const camTrack=localStreamRef.current?.getVideoTracks()[0];
      if(camTrack){Object.values(peerConns.current).forEach(pc=>{const sender=pc.getSenders().find(s=>s.track?.kind==='video');if(sender)sender.replaceTrack(camTrack).catch(()=>{});});}
      return;
    }
    try{
      const screenStream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
      screenStreamRef.current=screenStream;setScreenSharing(true);
      const screenTrack=screenStream.getVideoTracks()[0];
      // Replace video track in all peer connections
      Object.values(peerConns.current).forEach(pc=>{const sender=pc.getSenders().find(s=>s.track?.kind==='video');if(sender)sender.replaceTrack(screenTrack).catch(()=>{});});
      screenTrack.onended=()=>{screenStreamRef.current=null;setScreenSharing(false);const camTrack=localStreamRef.current?.getVideoTracks()[0];if(camTrack){Object.values(peerConns.current).forEach(pc=>{const sender=pc.getSenders().find(s=>s.track?.kind==='video');if(sender)sender.replaceTrack(camTrack).catch(()=>{});});}};
    }catch(e){if(e.name!=='NotAllowedError')setMediaError('Screen share failed.');}
  };
  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const filteredRooms=rooms.filter(r=>r.isPublic&&(!searchQ||r.subject?.toLowerCase().includes(searchQ.toLowerCase())||r.title?.toLowerCase().includes(searchQ.toLowerCase())));
  const partList=Object.values(participants);
  const otherStreams=Object.entries(remoteStreams);
  const isHost=activeRoom&&user&&activeRoom.host===user.uid;

  if(view==='room'&&activeRoom) return(
    <div style={{position:'fixed',inset:0,background:'#060412',display:'flex',flexDirection:'column',fontFamily:"'DM Sans',sans-serif",color:'#F7F6F2'}}>
      {(()=>{const code=roomCode||(!activeRoom?.isPublic?activeRoom?.code:'');return code&&isHost&&(<div style={{background:`${SB}18`,borderBottom:`1px solid ${SB}30`,padding:'8px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}><span style={{fontSize:12,color:SB,fontWeight:600}}>🔒 Room code: <strong style={{fontFamily:'monospace',letterSpacing:4,fontSize:14}}>{code}</strong></span><button onClick={()=>setRoomCode('')} style={{background:'none',border:'none',cursor:'pointer',color:SB,fontSize:16}}>✕</button></div>);})()}
      {pinnedMsg&&(<div style={{background:'rgba(245,200,66,0.1)',borderBottom:'1px solid rgba(245,200,66,0.2)',padding:'8px 16px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}><span>📌</span><span style={{fontSize:12,color:'rgba(245,200,66,0.9)',fontWeight:600}}>{pinnedMsg.userName}:</span><span style={{fontSize:12,color:'rgba(247,246,242,0.8)'}}>{pinnedMsg.text}</span></div>)}
      <div style={{height:52,background:'rgba(6,4,18,0.98)',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',padding:'0 12px',gap:8,flexShrink:0}}>
        <button onClick={()=>doLeave()} style={{background:'none',border:'1px solid rgba(255,255,255,0.12)',borderRadius:7,padding:'5px 10px',fontSize:12,cursor:'pointer',color:'rgba(255,255,255,0.45)',flexShrink:0}}>← Leave</button>
        <div style={{flex:1,minWidth:0}}><div style={{fontWeight:800,fontSize:13,color:'#F7F6F2',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeRoom.title}</div><div style={{fontSize:10,color:SB,fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{activeRoom.subject} · {partList.length} studying{roomLocked?' · 🔒':''}</div></div>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:10,padding:'5px 10px',flexShrink:0}}>
          <div style={{fontSize:9,fontWeight:700,color:timerMode==='focus'?SB:'#6ED9B8',letterSpacing:1,textTransform:'uppercase'}}>{timerMode==='focus'?'Focus':'Break'}</div>
          <div style={{fontFamily:'monospace',fontSize:16,fontWeight:800,color:timerOn?'#F7F6F2':'rgba(255,255,255,0.35)',minWidth:46}}>{fmt(timerSecs)}</div>
          <button onClick={()=>{const n=!timerOn;setTimerOn(n);syncTimer({timerOn:n,timerSecs,timerMode});}} style={{background:timerOn?'rgba(232,93,63,0.15)':'rgba(255,165,128,0.15)',border:`1px solid ${timerOn?'rgba(232,93,63,0.4)':'rgba(255,165,128,0.4)'}`,borderRadius:5,padding:'2px 8px',fontSize:10,fontWeight:700,cursor:'pointer',color:timerOn?'#E85D3F':'#FFA880'}}>{timerOn?'Pause':'Start'}</button>
          <button onClick={()=>{setTimerOn(false);const s=timerMode==='focus'?25*60:5*60;setTimerSecs(s);syncTimer({timerOn:false,timerSecs:s,timerMode});}} style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:'rgba(255,255,255,0.2)'}}>↺</button>
        </div>
        <button onClick={()=>setShowChat(c=>!c)} style={{background:showChat?`${SB}18`:'rgba(255,255,255,0.05)',border:`1px solid ${showChat?SB+'50':'rgba(255,255,255,0.09)'}`,borderRadius:7,padding:'5px 10px',fontSize:12,fontWeight:600,cursor:'pointer',color:showChat?SB:'rgba(255,255,255,0.4)'}}>💬</button>
        <div style={{display:'flex',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:7,padding:2,gap:2,flexShrink:0}}>
          <button onClick={()=>setStudyView('video')} style={{background:studyView==='video'?SB:'transparent',border:'none',borderRadius:5,padding:'4px 10px',fontSize:11,fontWeight:700,cursor:'pointer',color:studyView==='video'?'#1A1814':'rgba(255,255,255,0.4)',transition:'all 0.15s'}}>📹 Video</button>
          <button onClick={()=>setStudyView('doc')} style={{background:studyView==='doc'?SB:'transparent',border:'none',borderRadius:5,padding:'4px 10px',fontSize:11,fontWeight:700,cursor:'pointer',color:studyView==='doc'?'#1A1814':'rgba(255,255,255,0.4)',transition:'all 0.15s'}}>📄 Doc</button>
        </div>
      </div>
      <div style={{flex:1,display:'flex',overflow:'hidden',minHeight:0}}>
        {studyView==='doc'&&(
          <div style={{flex:1,background:'#0D0B1A',display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
            {/* Tabs bar */}
            <div style={{background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',padding:'0 8px',gap:4,flexShrink:0,overflowX:'auto',minHeight:44}}>
              {Object.entries(sharedDocs).map(([uid,docInfo])=>(
                <div key={uid} onClick={()=>{setActiveDocUid(uid);setDocPage(0);setDocPages([]);}}
                  style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:7,cursor:'pointer',background:activeDocUid===uid?SB+'25':'transparent',border:`1px solid ${activeDocUid===uid?SB+'60':'transparent'}`,flexShrink:0,maxWidth:180,transition:'all 0.15s'}}>
                  <div style={{width:20,height:20,borderRadius:'50%',background:SB+'40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:SB,flexShrink:0}}>{docInfo.uploaderName?.[0]||'?'}</div>
                  <span style={{fontSize:11,fontWeight:600,color:activeDocUid===uid?SB:'rgba(255,255,255,0.5)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{docInfo.name}</span>
                  {uid===user.uid&&<button onClick={async e=>{e.stopPropagation();try{await updateDoc(doc(db,'studyRooms',activeRoom.id),{[`studyDocs.${user.uid}`]:deleteField()});setSharedDocs(prev=>{const n={...prev};delete n[user.uid];return n;});if(activeDocUid===user.uid){setActiveDocUid(null);setDocPages([]);}}catch(err){console.error(err);}}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',fontSize:12,padding:'0 2px',flexShrink:0,lineHeight:1}} onMouseEnter={e=>e.currentTarget.style.color='#E85D3F'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.3)'}>✕</button>}
                </div>
              ))}
              <label style={{background:SB,border:'none',borderRadius:7,padding:'5px 12px',fontSize:11,fontWeight:700,cursor:docUploading?'default':'pointer',color:'#1A1814',opacity:docUploading?0.6:1,display:'flex',alignItems:'center',gap:5,flexShrink:0,marginLeft:'auto'}}>
                {docUploading?'Uploading…':'📎 Upload'}
                <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,image/*,application/pdf" style={{display:'none'}} disabled={docUploading} onChange={async e=>{const f=e.target.files?.[0];if(f){if(f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf')){await renderPDFDoc(f);}else{await uploadStudyDoc(f);}}e.target.value='';}}/>
              </label>
              {(()=>{const activeDoc=sharedDocs[activeDocUid];if(!activeDoc||!docPages.length)return null;return(<div style={{display:'flex',alignItems:'center',gap:6,padding:'0 8px',flexShrink:0}}>
                <button onClick={()=>setDocPage(p=>Math.max(0,p-1))} disabled={docPage===0} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,padding:'3px 10px',fontSize:12,cursor:'pointer',color:'rgba(255,255,255,0.6)',opacity:docPage===0?0.3:1}}>‹</button>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.4)',whiteSpace:'nowrap'}}>{docPage+1}/{docPages.length}</span>
                <button onClick={()=>setDocPage(p=>Math.min(docPages.length-1,p+1))} disabled={docPage===docPages.length-1} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,padding:'3px 10px',fontSize:12,cursor:'pointer',color:'rgba(255,255,255,0.6)',opacity:docPage===docPages.length-1?0.3:1}}>›</button>
              </div>);})()}
            </div>
            {/* Doc content */}
            <div style={{flex:1,overflow:'auto',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:16}}>
              {docPages.length>0
                ?<img src={docPages[docPage]} alt={`Page ${docPage+1}`} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain',borderRadius:8,boxShadow:'0 4px 32px rgba(0,0,0,0.5)'}}/>
                :<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:16,color:'rgba(255,255,255,0.25)'}}>
                  <div style={{fontSize:52}}>📄</div>
                  <div style={{fontSize:15,fontWeight:700,color:'rgba(255,255,255,0.4)'}}>No document yet</div>
                  <p style={{fontSize:13,textAlign:'center',maxWidth:280,lineHeight:1.6}}>Upload a PDF or image to share with your study group.</p>
                  <label style={{background:SB,border:'none',borderRadius:9,padding:'10px 24px',fontSize:13,fontWeight:700,cursor:docUploading?'default':'pointer',color:'#1A1814',opacity:docUploading?0.6:1}}>
                    {docUploading?'Uploading…':'📎 Upload Document'}
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,image/*,application/pdf" style={{display:'none'}} disabled={docUploading} onChange={async e=>{const f=e.target.files?.[0];if(f){if(f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf')){await renderPDFDoc(f);}else{await uploadStudyDoc(f);}}e.target.value='';}}/>
                  </label>
                </div>
              }
            </div>
          </div>
        )}
        {studyView==='video'&&(
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#04020C',position:'relative',minHeight:0}}>
          {(()=>{
            const allParts=partList.filter(p=>p.uid!==user?.uid);
            const total=1+allParts.length;
            const cols=total===1?1:total===2?2:total<=4?2:3;
            const rows=Math.ceil(total/cols);
            const Tile=({children,border,label,sublabel,camOff,muted})=>(
              <div style={{position:'relative',background:'#111020',borderRadius:10,overflow:'hidden',border:`2px solid ${border||'rgba(255,255,255,0.08)'}`,display:'flex',alignItems:'center',justifyContent:'center',minHeight:0,minWidth:0}}>
                {children}
                {camOff&&<div style={{position:'absolute',inset:0,background:'#0D0B1E',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8}}><div style={{width:56,height:56,borderRadius:'50%',background:'rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:'rgba(255,255,255,0.5)',fontWeight:800}}>{sublabel||'?'}</div></div>}
                <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,0.75))',padding:'20px 10px 7px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:11,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'70%'}}>{label}</span>
                  <div style={{display:'flex',gap:3,flexShrink:0}}>
                    {muted&&<span style={{background:'rgba(232,93,63,0.9)',borderRadius:4,padding:'1px 5px',fontSize:9,fontWeight:700}}>🔇</span>}
                    {camOff&&<span style={{background:'rgba(60,60,80,0.9)',borderRadius:4,padding:'1px 5px',fontSize:9,fontWeight:700}}>CAM OFF</span>}
                  </div>
                </div>
              </div>
            );
            return(
              <div style={{flex:1,display:'grid',gap:5,padding:8,gridTemplateColumns:`repeat(${cols},1fr)`,gridTemplateRows:`repeat(${rows},1fr)`,overflow:'hidden',boxSizing:'border-box'}}>
                <Tile border={`2px solid ${SB}70`} label={`${user?.name||'You'} (you)${screenSharing?' 🖥️':''}`} sublabel={user?.avatar||user?.name?.[0]} camOff={!videoOn} muted={!audioOn}>
                  {localStream?<video ref={el=>{localVidRef.current=el;if(el&&localStream&&el.srcObject!==localStream){el.srcObject=localStream;el.play().catch(()=>{});}}} autoPlay muted playsInline style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0,transform:'scaleX(-1)'}}/>:<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}><div style={{width:56,height:56,borderRadius:'50%',background:`${SB}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:SB,fontWeight:800}}>{user?.avatar||'?'}</div><span style={{fontSize:11,color:'rgba(255,255,255,0.5)',textAlign:'center',maxWidth:160,lineHeight:1.4}}>{mediaError||'Starting camera…'}</span>
                        {mediaError&&<button onClick={async()=>{setMediaError(null);const s=await startMedia();if(s&&activeRoom)enterRoom(activeRoom);}} style={{marginTop:8,background:'#F5C842',border:'none',borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:700,cursor:'pointer',color:'#1A1814'}}>🔄 Retry Camera</button>}
                      </div>}
                </Tile>
                {otherStreams.map(([uid,stream])=>{const p=participants[uid];const attachRef=(el)=>{if(el&&el.srcObject!==stream){remoteVidRefs.current[uid]=el;el.srcObject=stream;el.play().catch(()=>{});}};return(<Tile key={uid} label={`${p?.name||'User'}${p?.uid===activeRoom?.host?' 👑':''}`} sublabel={p?.avatar||p?.name?.[0]}><video ref={attachRef} autoPlay playsInline style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0}}/></Tile>);})}
                {allParts.filter(p=>!remoteStreams[p.uid]).map(p=>(<Tile key={p.uid||p.name} label={`${p.name||'User'}${p.uid===activeRoom?.host?' 👑':''}`} sublabel={p.avatar||p.name?.[0]} camOff><div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}><div style={{width:56,height:56,borderRadius:'50%',background:'rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:'rgba(255,255,255,0.4)',fontWeight:800}}>{p.avatar||p.name?.[0]||'?'}</div><div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:7,height:7,borderRadius:'50%',background:SB,animation:'pulse 1.4s ease-in-out infinite'}}/><span style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>Connecting…</span></div><button onClick={()=>connectToPeer(activeRoom.id,p.uid)} style={{background:`rgba(255,165,208,0.12)`,border:`1px solid ${SB}40`,borderRadius:6,padding:'4px 12px',fontSize:10,fontWeight:700,cursor:'pointer',color:SB}}>↺ Reconnect</button></div></Tile>))}
              </div>
            );
          })()}
          {mediaError&&<div style={{padding:'8px 14px',background:'rgba(232,93,63,0.1)',borderTop:'1px solid rgba(232,93,63,0.2)',fontSize:11,color:'#E85D3F',display:'flex',gap:6,alignItems:'center',flexShrink:0}}><span>⚠️</span><span>{mediaError}</span></div>}
          <div style={{height:56,background:'rgba(6,4,18,0.96)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'center',gap:12,flexShrink:0}}>
            <button onClick={toggleAudio} title={audioOn?'Mute':'Unmute'} style={{width:42,height:42,borderRadius:'50%',background:audioOn?'rgba(255,255,255,0.08)':'rgba(232,93,63,0.2)',border:`1px solid ${audioOn?'rgba(255,255,255,0.12)':'rgba(232,93,63,0.5)'}`,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>{audioOn?'🎙️':'🔇'}</button>
            <button onClick={toggleVideo} title={videoOn?'Turn off camera':'Turn on camera'} style={{width:42,height:42,borderRadius:'50%',background:videoOn?'rgba(255,255,255,0.08)':'rgba(232,93,63,0.2)',border:`1px solid ${videoOn?'rgba(255,255,255,0.12)':'rgba(232,93,63,0.5)'}`,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>{videoOn?'📹':'📷'}</button>
            <button onClick={toggleScreenShare} title={screenSharing?'Stop sharing':'Share screen'} style={{width:42,height:42,borderRadius:'50%',background:screenSharing?`${SB}30`:'rgba(255,255,255,0.08)',border:`1px solid ${screenSharing?SB+'80':'rgba(255,255,255,0.12)'}`,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>{screenSharing?'🖥️':'💻'}</button>
            <button onClick={()=>doLeave()} style={{padding:'9px 24px',borderRadius:20,background:'rgba(232,93,63,0.15)',border:'1px solid rgba(232,93,63,0.4)',fontSize:13,fontWeight:700,cursor:'pointer',color:'#E85D3F'}}>Leave Room</button>
          </div>
        </div>
        )}
        {showChat&&(<div style={{width:290,borderLeft:'1px solid rgba(255,255,255,0.07)',display:'flex',flexDirection:'column',background:'rgba(5,3,14,0.99)',flexShrink:0}}>
          <div style={{padding:'10px 12px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'rgba(255,255,255,0.22)',marginBottom:7}}>In this room ({partList.length})</div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {partList.map(p=>(<div key={p.uid||p.name} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 6px',borderRadius:7}}><div style={{width:22,height:22,borderRadius:'50%',background:`${SB}35`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:SB,flexShrink:0}}>{p.avatar||p.name?.[0]||'?'}</div><span style={{fontSize:11,color:'rgba(255,255,255,0.7)',fontWeight:600}}>{p.name}{p.uid===user?.uid?' (you)':''}{p.uid===activeRoom.host?' 👑':''}</span>{isHost&&p.uid!==user?.uid&&(<button onClick={async()=>{try{await updateDoc(doc(db,'studyRooms',activeRoom.id),{[`participants.${p.uid}`]:deleteField()});const pc=peerConns.current[p.uid];if(pc){pc.close();delete peerConns.current[p.uid];}setRemoteStreams(prev=>{const n={...prev};delete n[p.uid];return n;});}catch{}}} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'rgba(232,93,63,0.4)',fontSize:12,padding:'2px 4px'}} onMouseEnter={e=>e.currentTarget.style.color='#E85D3F'} onMouseLeave={e=>e.currentTarget.style.color='rgba(232,93,63,0.4)'}>✕</button>)}</div>))}
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:10}}>
            {messages.length===0&&<div style={{textAlign:'center',padding:'24px 0',color:'rgba(255,255,255,0.2)',fontSize:12}}>No messages yet — say hello! 👋</div>}
            {messages.map(m=>(<div key={m.id} style={{display:'flex',gap:8,alignItems:'flex-start'}}><div style={{width:26,height:26,borderRadius:'50%',background:`${SB}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:SB,flexShrink:0}}>{m.avatar||m.userName?.[0]||'?'}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:10,fontWeight:700,color:m.userId===user?.uid?SB:'rgba(255,255,255,0.45)',marginBottom:2}}>{m.userId===user?.uid?'You':m.userName}</div><div style={{fontSize:13,color:'rgba(247,246,242,0.82)',lineHeight:1.5,wordBreak:'break-word'}}>{m.text}</div></div></div>))}
            <div ref={msgEndRef}/>
          </div>
          <div style={{padding:10,borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:8}}>
            <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}e.stopPropagation();}} placeholder="Say something…" style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#F7F6F2',outline:'none',fontFamily:"'DM Sans',sans-serif"}}/>
            <button onClick={sendMsg} style={{background:SB,border:'none',borderRadius:8,width:36,cursor:'pointer',fontSize:16,color:'#1A1814',fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>↑</button>
          </div>
        </div>)}
      </div>
    </div>
  );

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",background:'#060412',minHeight:'100vh',color:'#F7F6F2'}}>
      <style>{`@keyframes sb-fade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}@media(max-width:768px){.sb-nav{padding:0 12px!important}.sb-lobby{padding:16px 12px!important}.sb-rooms{grid-template-columns:1fr!important}}`}</style>
      <nav style={{position:'sticky',top:0,zIndex:100,height:56,background:'rgba(6,4,18,0.97)',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',padding:'0 20px',gap:12,backdropFilter:'blur(10px)'}}>
        <button onClick={onBack} style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,padding:'5px 12px',fontSize:12,cursor:'pointer',color:'rgba(255,255,255,0.4)'}}>← Galaxy</button>
        <div style={{display:'flex',alignItems:'center',gap:9}}><div style={{width:30,height:30,borderRadius:8,background:SB,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>❋</div><span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:'#F7F6F2'}}><span style={{color:SB}}>Ace It</span> Study Buddy</span></div>
        <div style={{marginLeft:'auto'}}>{user?<div style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,0.6)'}}>{user.name}</div>:<button onClick={()=>openAuth('login')} style={{background:SB,border:'none',borderRadius:7,padding:'7px 16px',fontSize:12,fontWeight:700,cursor:'pointer',color:'#1A1814'}}>Log In to Study</button>}</div>
      </nav>
      <div style={{maxWidth:1000,margin:'0 auto',padding:'40px 24px 80px',animation:'sb-fade 0.4s ease both'}}>
        <div style={{textAlign:'center',marginBottom:48}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:`${SB}15`,border:`1px solid ${SB}30`,borderRadius:20,padding:'5px 16px',fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:SB,marginBottom:20}}>❋ Virtual Study Rooms</div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(32px,5vw,52px)',fontWeight:900,color:'#F7F6F2',lineHeight:1.1,marginBottom:14,letterSpacing:-1}}>Find your study crew</h1>
          <p style={{fontSize:16,color:'rgba(247,246,242,0.4)',maxWidth:480,margin:'0 auto 32px',lineHeight:1.7}}>Join a room, turn on your camera, and study together — just like the library, but from anywhere.</p>
          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={()=>{if(!user){openAuth('login');return;}setShowCreate(true);}} style={{background:SB,border:'none',borderRadius:9,padding:'12px 28px',fontSize:14,fontWeight:700,cursor:'pointer',color:'#1A1814'}}>+ Create a Study Room</button>
            <button onClick={()=>{if(!user){openAuth('login');return;}setShowJoin(true);}} style={{background:'transparent',border:`1px solid ${SB}50`,borderRadius:9,padding:'12px 22px',fontSize:14,fontWeight:500,cursor:'pointer',color:SB}}>🔒 Join Private Room</button>
          </div>
        </div>
        {errMsg&&<div style={{background:'rgba(232,93,63,0.1)',border:'1px solid rgba(232,93,63,0.25)',borderRadius:9,padding:'10px 16px',fontSize:13,color:'#E85D3F',marginBottom:20,textAlign:'center'}}>{errMsg}</div>}
        <div style={{position:'relative',marginBottom:28}}><span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:14,opacity:0.3,pointerEvents:'none'}}>🔍</span><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.stopPropagation()} placeholder="Search by subject — Biology, Calculus, Spanish…" style={{width:'100%',padding:'12px 16px 12px 42px',background:'rgba(255,255,255,0.05)',border:'1.5px solid rgba(255,255,255,0.1)',borderRadius:10,fontSize:14,color:'#F7F6F2',outline:'none',fontFamily:"'DM Sans',sans-serif",boxSizing:'border-box'}}/></div>
        {filteredRooms.length===0?(<div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,0.25)'}}><div style={{fontSize:48,marginBottom:16}}>📚</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:800,color:'rgba(255,255,255,0.4)',marginBottom:8}}>{searchQ?'No rooms match that subject':'No study rooms open right now'}</div><p style={{fontSize:14,maxWidth:340,margin:'0 auto',lineHeight:1.7}}>{searchQ?'Try a different search or create a room.':'Be the first — create a room and others will find you.'}</p></div>):(<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>{filteredRooms.map(r=>{const count=Object.keys(presenceMap[r.id]||{}).length,full=r.maxParticipants&&count>=r.maxParticipants;return(<div key={r.id} style={{background:'rgba(255,255,255,0.03)',border:`1.5px solid ${SB}22`,borderTop:`3px solid ${full?'rgba(232,93,63,0.5)':SB}`,borderRadius:14,padding:'20px',transition:'all 0.2s'}} onMouseEnter={e=>e.currentTarget.style.background=`${SB}08`} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}><div style={{fontSize:16,fontWeight:800,color:'#F7F6F2',fontFamily:"'Playfair Display',serif",flex:1,paddingRight:8}}>{r.title}</div><div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>{r.isLocked&&<span title="Locked" style={{fontSize:11}}>🔒</span>}<div style={{display:'flex',alignItems:'center',gap:3,background:'rgba(255,255,255,0.05)',borderRadius:6,padding:'2px 7px'}}><span style={{width:5,height:5,borderRadius:'50%',background:count>0?'#2BAE7E':'rgba(255,255,255,0.2)',display:'inline-block'}}/><span style={{fontSize:10,color:'rgba(255,255,255,0.45)'}}>{count}{r.maxParticipants?`/${r.maxParticipants}`:''}</span></div></div></div><div style={{display:'inline-block',background:`${SB}18`,border:`1px solid ${SB}30`,borderRadius:6,padding:'2px 9px',fontSize:10,fontWeight:700,color:SB,marginBottom:10}}>{r.subject}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.28)',marginBottom:12}}>Host: {r.hostName||'Anonymous'}</div><button onClick={()=>enterRoom(r)} disabled={joining||full||r.isLocked} style={{width:'100%',padding:'8px',borderRadius:8,border:'none',background:full||r.isLocked?'rgba(255,255,255,0.06)':SB,fontSize:12,fontWeight:700,cursor:joining||full||r.isLocked?'default':'pointer',color:full||r.isLocked?'rgba(255,255,255,0.25)':'#1A1814',opacity:joining?0.5:1}}>{joining?'Joining…':full?'Room Full':r.isLocked?'🔒 Locked':'Join Room →'}</button></div>);})}</div>)}
      </div>
      {showCreate&&(<div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.75)',backdropFilter:'blur(10px)'}} onClick={()=>setShowCreate(false)}><div style={{background:'rgba(10,8,24,0.99)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,padding:'36px',width:420,animation:'sb-fade 0.22s ease'}} onClick={e=>e.stopPropagation()}><div style={{fontSize:28,marginBottom:14}}>❋</div><h3 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:'#F7F6F2',marginBottom:6}}>Create a Study Room</h3>{errMsg&&<div style={{background:'rgba(232,93,63,0.12)',border:'1px solid rgba(232,93,63,0.3)',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#E85D3F',marginBottom:16,wordBreak:'break-word'}}>{errMsg}</div>}<input value={createForm.title} onChange={e=>setCreateForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.stopPropagation()} placeholder="Room name e.g. Bio 101 Midterm Prep" style={{width:'100%',padding:'12px 14px',border:'1.5px solid rgba(255,255,255,0.12)',borderRadius:9,fontSize:14,color:'#F7F6F2',fontFamily:"'DM Sans',sans-serif",outline:'none',background:'rgba(255,255,255,0.05)',marginBottom:12,boxSizing:'border-box'}}/><input value={createForm.subject} onChange={e=>setCreateForm(f=>({...f,subject:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter')createRoom();e.stopPropagation();}} placeholder="Subject e.g. Biology, Calculus, Spanish" style={{width:'100%',padding:'12px 14px',border:'1.5px solid rgba(255,255,255,0.12)',borderRadius:9,fontSize:14,color:'#F7F6F2',fontFamily:"'DM Sans',sans-serif",outline:'none',background:'rgba(255,255,255,0.05)',marginBottom:16,boxSizing:'border-box'}}/><div style={{display:'flex',gap:8,marginBottom:24}}>{[true,false].map(pub=>(<button key={String(pub)} onClick={()=>setCreateForm(f=>({...f,isPublic:pub}))} style={{flex:1,padding:'10px',borderRadius:9,border:`1.5px solid ${createForm.isPublic===pub?SB:'rgba(255,255,255,0.1)'}`,background:createForm.isPublic===pub?`${SB}18`:'transparent',fontSize:13,fontWeight:700,cursor:'pointer',color:createForm.isPublic===pub?SB:'rgba(255,255,255,0.4)'}}>{pub?'🌐 Public':'🔒 Private'}</button>))}</div><div style={{display:'flex',gap:10}}><button onClick={()=>setShowCreate(false)} style={{flex:1,padding:'11px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',fontSize:13,fontWeight:600,cursor:'pointer',color:'rgba(255,255,255,0.4)'}}>Cancel</button><button onClick={createRoom} disabled={!createForm.title.trim()||!createForm.subject.trim()||joining} style={{flex:2,padding:'11px',borderRadius:9,border:'none',background:createForm.title.trim()&&createForm.subject.trim()?SB:'rgba(255,255,255,0.07)',fontSize:13,fontWeight:700,cursor:'pointer',color:createForm.title.trim()&&createForm.subject.trim()?'#1A1814':'rgba(255,255,255,0.2)'}}>{joining?'Creating…':'Create Room →'}</button></div></div></div>)}
      {showJoin&&(<div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.75)',backdropFilter:'blur(10px)'}} onClick={()=>{setShowJoin(false);setErrMsg('');}}><div style={{background:'rgba(10,8,24,0.99)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:18,padding:'36px',width:380,animation:'sb-fade 0.22s ease'}} onClick={e=>e.stopPropagation()}><div style={{fontSize:28,marginBottom:14}}>🔒</div><h3 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:'#F7F6F2',marginBottom:6}}>Join Private Room</h3>{errMsg&&<div style={{background:'rgba(232,93,63,0.1)',border:'1px solid rgba(232,93,63,0.25)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#E85D3F',marginBottom:14}}>{errMsg}</div>}<input value={joinInput} onChange={e=>setJoinInput(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==='Enter')joinByCode();e.stopPropagation();}} placeholder="e.g. A1B2C3" maxLength={6} style={{width:'100%',padding:'14px',border:`1.5px solid ${SB}50`,borderRadius:9,fontSize:22,fontWeight:800,color:SB,fontFamily:'monospace',letterSpacing:6,outline:'none',background:`${SB}08`,textAlign:'center',boxSizing:'border-box',marginBottom:16}}/><div style={{display:'flex',gap:10}}><button onClick={()=>{setShowJoin(false);setErrMsg('');}} style={{flex:1,padding:'11px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',fontSize:13,fontWeight:600,cursor:'pointer',color:'rgba(255,255,255,0.4)'}}>Cancel</button><button onClick={joinByCode} disabled={joinInput.length<6} style={{flex:2,padding:'11px',borderRadius:9,border:'none',background:joinInput.length>=6?SB:'rgba(255,255,255,0.07)',fontSize:13,fontWeight:700,cursor:'pointer',color:joinInput.length>=6?'#1A1814':'rgba(255,255,255,0.2)'}}>Join Room →</button></div></div></div>)}
    </div>
  );
}

export default StudyBuddyApp;
