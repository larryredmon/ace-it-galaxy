// Split out of App.jsx so this code only downloads when it is needed.
import { useState, useRef, useEffect } from "react";
import { FC_DECKS, aiFetch, tpSync } from "../shared.jsx";

// ─── Brain Map App ────────────────────────────────────────────────────────────
const BM_PALETTE = ["#4F6EF7","#E85D3F","#2BAE7E","#9B59B6","#F5C842","#E67E22","#1DA1F2","#E91E8C","#C8B8FF","#6ED9B8","#FF6B6B","#4ECDC4"];

const BM_INITIAL_MAPS = [];

// ── BrainMapCanvas — the interactive map editor ───────────────────────────────
function BrainMapCanvas({ map, onNodesChange, onBack, allDecks = FC_DECKS }) {
  const [nodes,         setNodes]         = useState(map.nodes);
  const [selectedId,    setSelectedId]    = useState(null);
  const [pan,           setPan]           = useState({ x: 0, y: 0 });
  const [zoom,          setZoom]          = useState(0.85);
  const [editingId,     setEditingId]     = useState(null);
  const [editLabel,     setEditLabel]     = useState("");
  const [mapTitle,      setMapTitle]      = useState(map.title);
  const [editTitle,     setEditTitle]     = useState(false);
  const [showDeckPicker,setShowDeckPicker]= useState(false);
  const [studyNode,     setStudyNode]     = useState(null);
  const [studyDeckIdx,  setStudyDeckIdx]  = useState(0);
  const [studyCardIdx,  setStudyCardIdx]  = useState(0);
  const [studyFlipped,  setStudyFlipped]  = useState(false);
  const [showNodeMenu,  setShowNodeMenu]  = useState(false);

  // Undo/Redo history
  const historyRef = useRef([]);
  const redoRef    = useRef([]);
  const pushHistory = (prevNodes) => { historyRef.current = [...historyRef.current.slice(-29), prevNodes]; redoRef.current = []; };
  const handleUndo = () => {
    if (!historyRef.current.length) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    redoRef.current = [...redoRef.current, nodes];
    historyRef.current = historyRef.current.slice(0, -1);
    setNodes(prev); setSelectedId(null);
  };
  const handleRedo = () => {
    if (!redoRef.current.length) return;
    const next = redoRef.current[redoRef.current.length - 1];
    historyRef.current = [...historyRef.current, nodes];
    redoRef.current = redoRef.current.slice(0, -1);
    setNodes(next); setSelectedId(null);
  };
  const setNodesWithHistory = (updater) => {
    setNodes(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      pushHistory(prev);
      return next;
    });
  };

  // AI expansion state
  const [showAI,      setShowAI]      = useState(false);
  const [aiTopic,     setAiTopic]     = useState('');
  const [aiLoading,   setAiLoading]   = useState(false);
  // Minimap
  const [showMinimap, setShowMinimap] = useState(true);

  const dragRef  = useRef(null);
  const canvasRef= useRef(null);

  const selectedNode = nodes.find(n => n.id === selectedId);

  // ── Sync changes up (skip initial mount) ──
  const bmSyncMounted = useRef(false);
  useEffect(() => {
    if (!bmSyncMounted.current) { bmSyncMounted.current = true; return; }
    onNodesChange(nodes, mapTitle);
  }, [nodes, mapTitle]);

  // ── Global mouse events for reliable drag ──
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      if (d.type === "pan") {
        setPan({ x: d.origPanX + (e.clientX - d.startX), y: d.origPanY + (e.clientY - d.startY) });
      } else if (d.type === "node") {
        const dx = (e.clientX - d.startX) / zoom;
        const dy = (e.clientY - d.startY) / zoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.hasMoved = true;
        setNodes(ns => ns.map(n => n.id === d.id ? { ...n, x: d.origX + dx, y: d.origY + dy } : n));
      }
    };
    const onUp = () => {
      const d = dragRef.current;
      if (d?.type === "node" && d.hasMoved) {
        // Push original position to undo history now that drag is complete
        pushHistory(d.origNodes);
      }
      dragRef.current = null;
    };
    const onKeyDown = (e) => {
      if ((e.ctrlKey||e.metaKey) && e.shiftKey && e.key==='z') { e.preventDefault();
        // Access refs directly to avoid stale closure
        const next = redoRef.current[redoRef.current.length-1];
        if (next) { historyRef.current=[...historyRef.current,nodes]; redoRef.current=redoRef.current.slice(0,-1); setNodes(next); setSelectedId(null); }
        return;
      }
      if ((e.ctrlKey||e.metaKey) && e.key==='z') { e.preventDefault();
        const prev = historyRef.current[historyRef.current.length-1];
        if (prev) { redoRef.current=[...redoRef.current,nodes]; historyRef.current=historyRef.current.slice(0,-1); setNodes(prev); setSelectedId(null); }
        return;
      }
      if (editingId || e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA') return;
      if (e.key==='Tab' && selectedId) { e.preventDefault(); addChild(selectedId); return; }
      if (e.key==='Enter' && selectedId) { e.preventDefault(); const n=nodes.find(x=>x.id===selectedId); if(n) startEditing(n.id,n.label); return; }
      if ((e.key==='Delete'||e.key==='Backspace') && selectedId && selectedId!=='root') {
        e.preventDefault();
        const hasChildren = nodes.some(n => n.parentId === selectedId);
        if (hasChildren) {
          const label = nodes.find(n=>n.id===selectedId)?.label||'this node';
          const childCount = (function countAll(id){return nodes.filter(n=>n.parentId===id).reduce((a,n)=>a+1+countAll(n.id),0);})(selectedId);
          if(!window.confirm(`Delete "${label.replace(/\n/g,' ')}" and its ${childCount} child node${childCount!==1?'s':''}?`)) return;
        }
        deleteNode(selectedId); return;
      }
      if (e.key==='Escape') { setSelectedId(null); setShowAI(false); return; }
      if (e.key==='+'||e.key==='=') { setZoom(z=>Math.min(z*1.15,3)); return; }
      if (e.key==='-') { setZoom(z=>Math.max(z*0.87,0.15)); return; }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("keydown",   onKeyDown);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); window.removeEventListener("keydown", onKeyDown); };
  }, [zoom, selectedId, nodes, editingId]); // re-attach so shortcuts (Tab, Enter, Delete, undo) see the current map

  const onCanvasDown = (e) => {
    if (e.target === canvasRef.current || e.target.classList.contains("bm-bg") || e.target.tagName === "svg") {
      setSelectedId(null); setShowDeckPicker(false); setShowNodeMenu(false);
      dragRef.current = { type: "pan", startX: e.clientX, startY: e.clientY, origPanX: pan.x, origPanY: pan.y };
    }
  };

  const onNodeDown = (e, node) => {
    e.stopPropagation();
    dragRef.current = { type: "node", id: node.id, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y, origNodes: nodes, hasMoved: false };
  };

  const onWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.min(Math.max(z * (e.deltaY < 0 ? 1.1 : 0.91), 0.15), 3));
  };
  useEffect(() => {
    const el = canvasRef.current;
    if (el) el.addEventListener("wheel", onWheel, { passive: false });
    return () => { if (el) el.removeEventListener("wheel", onWheel); };
  }, []);

  // Touch support
  const lastTouchRef = useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      lastTouchRef.current = { x: t.clientX, y: t.clientY, origPanX: pan.x, origPanY: pan.y };
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 1 && lastTouchRef.current) {
      e.preventDefault();
      const t = e.touches[0];
      setPan({ x: lastTouchRef.current.origPanX + (t.clientX - lastTouchRef.current.x), y: lastTouchRef.current.origPanY + (t.clientY - lastTouchRef.current.y) });
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if (lastTouchRef.current?.pinchDist) {
        setZoom(z => Math.min(Math.max(z * (dist/lastTouchRef.current.pinchDist), 0.15), 3));
      }
      if (lastTouchRef.current) lastTouchRef.current.pinchDist = dist;
    }
  };
  const onTouchEnd = () => { lastTouchRef.current = null; };

  // ── Node ops ──
  const getNodeById = (id) => nodes.find(n => n.id === id);

  const getBranchColor = (nodeId) => {
    let n = getNodeById(nodeId);
    while (n?.parentId && n.parentId !== "root") n = getNodeById(n.parentId);
    return n?.color || BM_PALETTE[0];
  };

  const addChild = (parentId) => {
    const parent = getNodeById(parentId);
    const children = nodes.filter(n => n.parentId === parentId);
    const baseAngle = parentId === "root"
      ? (children.length * (360 / Math.max(children.length + 1, 5))) * (Math.PI / 180)
      : Math.atan2(parent.y, parent.x);
    const spread = children.length * 0.45;
    const dist   = parentId === "root" ? 260 : 175;
    const angle  = baseAngle + (children.length % 2 === 0 ? spread : -spread) * 0.5;
    const newNode = {
      id: `n${Date.now()}`, label: "New Topic",
      x: parent.x + Math.cos(angle) * dist,
      y: parent.y + Math.sin(angle) * dist,
      color: getBranchColor(parentId) || parent.color,
      parentId, deckIds: [], note: "",
    };
    setNodesWithHistory(ns => [...ns, newNode]);
    setSelectedId(newNode.id);
    setTimeout(() => startEditing(newNode.id, "New Topic"), 80);
  };

  const deleteNode = (id) => {
    if (id === "root") return;
    const toRemove = new Set();
    const q = [id];
    while (q.length) { const cur = q.shift(); toRemove.add(cur); nodes.filter(n => n.parentId === cur).forEach(n => q.push(n.id)); }
    setNodesWithHistory(ns => ns.filter(n => !toRemove.has(n.id)));
    setSelectedId(null);
  };

  const updateNode = (id, updates) => setNodesWithHistory(ns => ns.map(n => n.id === id ? { ...n, ...updates } : n));
  const startEditing = (id, label) => { setEditingId(id); setEditLabel(label); };
  const commitEdit   = () => { if (editingId) { updateNode(editingId, { label: editLabel.trim() || "Topic" }); setEditingId(null); } };

  // ── Flash card study ──
  const studyDecks    = studyNode ? allDecks.filter(d => studyNode.deckIds.includes(d.id)) : [];
  const activeSDeck   = studyDecks[studyDeckIdx];
  const activeSCard   = activeSDeck?.cards[studyCardIdx];
  const totalStudyCards = studyDecks.reduce((a, d) => a + d.cards.length, 0);

  const openStudy = (node) => { setStudyNode(node); setStudyDeckIdx(0); setStudyCardIdx(0); setStudyFlipped(false); };
  const closeStudy = () => setStudyNode(null);
  const nextCard = () => {
    if (studyCardIdx < (activeSDeck?.cards.length || 1) - 1) { setStudyCardIdx(i => i + 1); setStudyFlipped(false); }
    else if (studyDeckIdx < studyDecks.length - 1) { setStudyDeckIdx(i => i + 1); setStudyCardIdx(0); setStudyFlipped(false); }
  };
  const prevCard = () => {
    if (studyCardIdx > 0) { setStudyCardIdx(i => i - 1); setStudyFlipped(false); }
    else if (studyDeckIdx > 0) { setStudyDeckIdx(i => i - 1); setStudyCardIdx(0); setStudyFlipped(false); }
  };

  // ── Auto-layout: radial tree ──
  const autoLayout = () => {
    const root = nodes.find(n=>n.id==='root');
    if(!root) return;
    const children = (pid) => nodes.filter(n=>n.parentId===pid);
    const positioned = new Map();
    positioned.set('root', {x:0, y:0});
    const layoutLevel = (parentId, startAngle, sweepAngle, radius) => {
      const kids = children(parentId);
      if(!kids.length) return;
      if(!positioned.has(parentId)) return; // guard: skip orphaned nodes
      const angleStep = sweepAngle / Math.max(kids.length,1);
      const {x:px=0, y:py=0} = positioned.get(parentId);
      kids.forEach((kid,i) => {
        const angle = startAngle + angleStep*i + angleStep/2 - sweepAngle/2;
        positioned.set(kid.id, {x: px+Math.cos(angle)*radius, y: py+Math.sin(angle)*radius});
        layoutLevel(kid.id, angle-sweepAngle/4, sweepAngle/2, radius*0.75);
      });
    };
    layoutLevel('root', -Math.PI/2, Math.PI*2, 240);
    setNodesWithHistory(ns => ns.map(n => positioned.has(n.id) ? {...n,...positioned.get(n.id)} : n));
  };

  // ── AI expand: generate child nodes ──
  const aiExpand = async (parentId, topic) => {
    setAiLoading(true);
    try {
      const res = await aiFetch('/api/claude', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:600,
          messages:[{role:'user', content:`Generate 5-7 key subtopics for a brain map node about "${topic}". Respond ONLY with JSON: {"nodes":[{"label":"short 1-4 word label","note":"one sentence"},...]}. No duplicates.`}]
        })
      });
      const data = await res.json();
      const txt = data.content?.find(b=>b.type==='text')?.text||'';
      const parsed = JSON.parse(txt.replace(/```json|```/g,'').trim());
      const parent = nodes.find(n=>n.id===parentId);
      if(!parent||!parsed.nodes) return;
      const color = getBranchColor(parentId)||parent.color;
      const newNodes = parsed.nodes.map((item,i) => {
        const angle = (-Math.PI/2)+(i/parsed.nodes.length)*Math.PI*2;
        const dist = parentId==='root'?260:180;
        return { id:`ai${Date.now()}${i}x${Math.floor(Math.random()*9999)}`, label:item.label, note:item.note||'', x:parent.x+Math.cos(angle)*dist, y:parent.y+Math.sin(angle)*dist, color, parentId, deckIds:[] };
      });
      setNodesWithHistory(ns=>[...ns,...newNodes]);
      setShowAI(false); setAiTopic('');
    } catch(e) { console.error('AI expand',e); }
    setAiLoading(false);
  };

  // ── Connection path (cubic bezier) ──
  const getPath = (parent, child) => {
    const mx = (parent.x + child.x) / 2;
    return `M ${parent.x} ${parent.y} C ${mx} ${parent.y}, ${mx} ${child.y}, ${child.x} ${child.y}`;
  };

  // ── Layout ──
  const W = typeof window !== "undefined" ? window.innerWidth  : 1440;
  const H = typeof window !== "undefined" ? window.innerHeight - 56 : 800;
  const cx = W / 2 + pan.x, cy = H / 2 + pan.y;

  const nodeRect = (node) => {
    const isRoot = node.id === "root";
    const chars  = node.label.replace("\n", "").length;
    const w = isRoot ? 140 : Math.min(Math.max(chars * 7.5 + 28, 108), 200);
    const h = isRoot ? 84  : node.label.includes("\n") ? 52 : 40;
    return { w, h, isRoot };
  };

  return (
    <div style={{ position: "fixed", top: 56, left: 0, right: 0, bottom: 0, background: "#0C0B18", overflow: "hidden" }}>
      {/* ── Toolbar ── */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:44, zIndex:50, display:"flex", alignItems:"center", gap:8, padding:"0 12px", background:"rgba(12,11,24,0.96)", borderBottom:"1px solid rgba(255,255,255,0.06)", backdropFilter:"blur(10px)" }}>
        <button onClick={onBack} style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", color:"rgba(255,255,255,0.4)", flexShrink:0 }}
          onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.4)"}>← Maps</button>
        <div style={{ width:1, height:16, background:"rgba(255,255,255,0.08)", flexShrink:0 }} />
        {editTitle
          ? <input autoFocus value={mapTitle} onChange={e=>setMapTitle(e.target.value)} onBlur={()=>setEditTitle(false)} onKeyDown={e=>{if(e.key==="Enter")setEditTitle(false);e.stopPropagation();}}
              style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:6, padding:"4px 10px", fontSize:14, fontWeight:700, color:"#F7F6F2", outline:"none", minWidth:160, maxWidth:260 }} />
          : <div onClick={()=>setEditTitle(true)} style={{ display:"flex", alignItems:"center", gap:5, cursor:"pointer", padding:"3px 7px", borderRadius:6, maxWidth:260 }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{ fontSize:14, fontWeight:800, color:"#F7F6F2", fontFamily:"'Playfair Display',serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{mapTitle}</span>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.2)", flexShrink:0 }}>✎</span>
            </div>
        }
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5 }}>
          {/* AI Expand */}
          <div style={{ position:"relative" }}>
            <button onClick={()=>{ if(!selectedId){setShowAI(false); return;} setShowAI(a=>!a);}} title="AI Expand — select a node first"
              style={{ background:showAI?"rgba(155,127,255,0.15)":"rgba(255,255,255,0.06)", border:`1px solid ${showAI?"rgba(155,127,255,0.5)":"rgba(255,255,255,0.09)"}`, borderRadius:5, padding:"0 10px", height:26, cursor:"pointer", color:showAI?"#9B7FFF":"rgba(255,255,255,0.55)", fontSize:11, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
              ✦ AI Expand
            </button>
            {showAI && (
              <div style={{ position:"absolute", top:32, right:0, background:"rgba(12,10,28,0.99)", border:"1px solid rgba(155,127,255,0.2)", borderRadius:12, padding:14, width:280, zIndex:200, boxShadow:"0 8px 32px rgba(0,0,0,0.6)" }} onClick={e=>e.stopPropagation()}>
                <div style={{ fontSize:11, fontWeight:700, color:"#9B7FFF", marginBottom:6 }}>✦ AI Generate Subtopics</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginBottom:10 }}>{selectedId?`Expanding: ${nodes.find(n=>n.id===selectedId)?.label||'selected node'}`:'Select a node first'}</div>
                <input value={aiTopic} onChange={e=>setAiTopic(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&selectedId){const n=nodes.find(x=>x.id===selectedId);aiExpand(selectedId,aiTopic.trim()||n?.label||mapTitle);}e.stopPropagation();}}
                  placeholder="Topic (or leave blank to use node label)"
                  style={{ width:"100%", padding:"8px 10px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:7, fontSize:12, color:"#F7F6F2", outline:"none", marginBottom:10, boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif" }} />
                <button onClick={()=>{ const n=nodes.find(x=>x.id===selectedId); if(selectedId) aiExpand(selectedId, aiTopic.trim()||n?.label||mapTitle); }}
                  disabled={!selectedId||aiLoading}
                  style={{ width:"100%", padding:"8px", borderRadius:8, border:"none", background:selectedId?"#9B7FFF":"rgba(255,255,255,0.07)", fontSize:12, fontWeight:700, cursor:selectedId?"pointer":"default", color:selectedId?"#fff":"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  {aiLoading?<><span style={{ width:10,height:10,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"qbSpin 0.6s linear infinite",display:"inline-block" }}/> Generating…</>:"✦ Generate Subtopics"}
                </button>
              </div>
            )}
          </div>
          {/* Auto-layout */}
          <button onClick={autoLayout} title="Auto-arrange nodes"
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:5, padding:"0 10px", height:26, cursor:"pointer", color:"rgba(255,255,255,0.55)", fontSize:11, fontWeight:600 }}>
            ⊞ Layout
          </button>
          <div style={{ width:1, height:16, background:"rgba(255,255,255,0.08)" }} />
          {/* Undo / Redo */}
          <button onClick={handleUndo} disabled={!historyRef.current.length} title="Undo (Ctrl+Z)"
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:5, padding:"0 9px", height:26, cursor:historyRef.current.length?"pointer":"default", color:historyRef.current.length?"rgba(255,255,255,0.65)":"rgba(255,255,255,0.18)", fontSize:13 }}>↩</button>
          <button onClick={handleRedo} disabled={!redoRef.current.length} title="Redo (Ctrl+Shift+Z)"
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:5, padding:"0 9px", height:26, cursor:redoRef.current.length?"pointer":"default", color:redoRef.current.length?"rgba(255,255,255,0.65)":"rgba(255,255,255,0.18)", fontSize:13 }}>↪</button>
          <div style={{ width:1, height:16, background:"rgba(255,255,255,0.08)" }} />
          {/* Zoom */}
          <button onClick={()=>setZoom(z=>Math.min(z*1.18,3))} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:5, width:26, height:26, cursor:"pointer", color:"rgba(255,255,255,0.6)", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", minWidth:36, textAlign:"center" }}>{Math.round(zoom*100)}%</span>
          <button onClick={()=>setZoom(z=>Math.max(z*0.85,0.15))} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:5, width:26, height:26, cursor:"pointer", color:"rgba(255,255,255,0.6)", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
          <button onClick={()=>{setPan({x:0,y:0});setZoom(0.85);}} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:5, padding:"3px 8px", cursor:"pointer", color:"rgba(255,255,255,0.35)", fontSize:10 }}>Fit</button>
          {/* Minimap toggle */}
          <button onClick={()=>setShowMinimap(m=>!m)} title="Toggle minimap"
            style={{ background:showMinimap?"rgba(240,168,192,0.12)":"rgba(255,255,255,0.06)", border:`1px solid ${showMinimap?"rgba(240,168,192,0.3)":"rgba(255,255,255,0.09)"}`, borderRadius:5, width:26, height:26, cursor:"pointer", color:showMinimap?"#F0A8C0":"rgba(255,255,255,0.4)", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>⊡</button>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", zIndex:40, pointerEvents:"none" }}>
        <div style={{ background:"rgba(12,11,24,0.8)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8, padding:"4px 14px", fontSize:9, color:"rgba(255,255,255,0.25)", display:"flex", gap:12, whiteSpace:"nowrap" }}>
          <span><strong style={{color:"rgba(255,255,255,0.4)"}}>Tab</strong> add child</span>
          <span><strong style={{color:"rgba(255,255,255,0.4)"}}>Enter</strong> edit</span>
          <span><strong style={{color:"rgba(255,255,255,0.4)"}}>Del</strong> delete</span>
          <span><strong style={{color:"rgba(255,255,255,0.4)"}}>Ctrl+Z</strong> undo</span>
          <span><strong style={{color:"rgba(255,255,255,0.4)"}}>+/−</strong> zoom</span>
        </div>
      </div>

      {/* ── Canvas area ── */}
      <div ref={canvasRef} style={{ position:"absolute", top:44, left:0, right:0, bottom:0, cursor:dragRef.current?.type==="pan"?"grabbing":"grab", touchAction:"none" }}
        onMouseDown={onCanvasDown} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

        {/* Dot grid */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}>
          <defs>
            <pattern id={`bmDots-${map.id}`} x={(pan.x%(28*zoom))} y={(pan.y%(28*zoom))} width={28*zoom} height={28*zoom} patternUnits="userSpaceOnUse">
              <circle cx={14*zoom} cy={14*zoom} r={0.7} fill="rgba(255,255,255,0.09)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#bmDots-${map.id})`} />
        </svg>

        {/* Connection + Node SVG layer */}
        <svg style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", overflow:"visible" }}
          onClick={()=>{ setSelectedId(null); setShowDeckPicker(false); setShowNodeMenu(false); setShowAI(false); }}>
          <g transform={`translate(${cx}, ${cy - 22}) scale(${zoom})`}>


            {/* Connections */}
            {nodes.filter(n => n.parentId).map(n => {
              const parent = getNodeById(n.parentId);
              if (!parent) return null;
              const isSelected = n.id === selectedId || n.parentId === selectedId;
              return (
                <path key={`e-${n.id}`} d={getPath(parent, n)}
                  fill="none" stroke={n.color} strokeWidth={(isSelected ? 3 : 2) / zoom}
                  strokeOpacity={isSelected ? 0.85 : 0.45} style={{ pointerEvents: "none", transition: "stroke-opacity 0.2s" }} />
              );
            })}

            {/* Nodes */}
            {nodes.map(n => {
              const { w, h, isRoot } = nodeRect(n);
              const isSel  = n.id === selectedId;
              const lines  = n.label.split("\n");
              const hasCards = n.deckIds.length > 0;
              const deckCount = allDecks.filter(d => n.deckIds.includes(d.id)).reduce((a, d) => a + (d.cards?.length || d.cardCount || 0), 0);

              return (
                <g key={n.id} transform={`translate(${n.x - w/2}, ${n.y - h/2})`}
                  style={{ cursor: "pointer" }}
                  onMouseDown={e => { onNodeDown(e, n); }}
                  onClick={e => { e.stopPropagation(); setSelectedId(n.id); setShowDeckPicker(false); setShowNodeMenu(false); }}
                  onDoubleClick={e => { e.stopPropagation(); startEditing(n.id, n.label); }}>

                  {/* Selection glow */}
                  {isSel && <rect x={-4} y={-4} width={w+8} height={h+8} rx={isRoot ? w/2+4 : 14} fill="none" stroke={n.color} strokeWidth={2.5 / zoom} opacity={0.4} />}

                  {/* Node shape */}
                  {isRoot ? (
                    <ellipse cx={w/2} cy={h/2} rx={w/2} ry={h/2} fill={n.color} opacity={isSel ? 1 : 0.9}
                      stroke={isSel ? "#fff" : "transparent"} strokeWidth={2.5 / zoom} />
                  ) : (
                    <rect x={0} y={0} width={w} height={h} rx={10}
                      fill={n.color} opacity={isSel ? 1 : 0.84}
                      stroke={isSel ? "#fff" : "transparent"} strokeWidth={2 / zoom} />
                  )}

                  {/* Label or inline editor */}
                  {editingId === n.id ? (
                    <foreignObject x={4} y={4} width={w - 8} height={h - 8}>
                      <textarea autoFocus value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); } if (e.key === "Escape") { setEditingId(null); } }}
                        style={{ width: "100%", height: "100%", background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: isRoot ? 12 : 10.5, fontWeight: 800, textAlign: "center", resize: "none", lineHeight: 1.35, padding: 0 }} />
                    </foreignObject>
                  ) : (
                    lines.map((line, li) => (
                      <text key={li} x={w / 2} y={h / 2 - (lines.length - 1) * 6.5 + li * 13}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="rgba(255,255,255,0.96)" fontSize={isRoot ? 12 : 10.5} fontWeight={800}
                        fontFamily="'DM Sans', sans-serif" style={{ pointerEvents: "none", userSelect: "none" }}>
                        {line}
                      </text>
                    ))
                  )}

                  {/* Flash card badge */}
                  {hasCards && !editingId && (
                    <g transform={`translate(${w - 8}, -8)`} onClick={e => { e.stopPropagation(); openStudy(n); }} style={{ cursor: "pointer" }}>
                      <circle cx={0} cy={0} r={10} fill="#F5C842" stroke="rgba(12,11,24,0.6)" strokeWidth={1.5} />
                      <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="#1A1814" fontWeight={900}>{deckCount}</text>
                    </g>
                  )}

                  {/* Add child button */}
                  {isSel && !editingId && (
                    <g transform={`translate(${w + 8}, ${h/2 - 11})`} onClick={e => { e.stopPropagation(); addChild(n.id); }} style={{ cursor: "pointer" }}>
                      <circle cx={11} cy={11} r={11} fill="rgba(255,255,255,0.13)" stroke="rgba(255,255,255,0.28)" strokeWidth={1.5 / zoom} />
                      <text x={11} y={11} textAnchor="middle" dominantBaseline="middle" fontSize={15} fill="#fff" fontWeight={700} style={{ pointerEvents: "none" }}>+</text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Node Inspector Panel ── */}
        {selectedNode && !studyNode && (
          <div style={{ position: "absolute", top: 56, right: 16, width: 252, background: "rgba(10,9,22,0.97)", border: "1px solid rgba(255,255,255,0.09)", borderTop: `3px solid ${selectedNode.color}`, borderRadius: 14, padding: "18px 18px 20px", backdropFilter: "blur(18px)", zIndex: 80, animation: "bm-pop 0.2s ease both" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(255,255,255,0.28)", marginBottom: 6 }}>Node</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: "#F7F6F2", marginBottom: 16, lineHeight: 1.3 }}>{selectedNode.label.replace("\n", " ")}</div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
              <button onClick={() => startEditing(selectedNode.id, selectedNode.label)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "rgba(255,255,255,0.65)", textAlign: "left", transition: "all 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
                ✎ Edit Label
              </button>
              <button onClick={() => addChild(selectedNode.id)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "rgba(255,255,255,0.65)", textAlign: "left", transition: "all 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
                ⊕ Add Child Node
              </button>
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 8 }}>Branch Color</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {BM_PALETTE.map(c => (
                  <button key={c} onClick={() => {
                    // Update selected node AND all descendants
                    const toUpdate = new Set([selectedNode.id]);
                    const q = [selectedNode.id];
                    while(q.length){ const cur=q.shift(); nodes.filter(n=>n.parentId===cur).forEach(n=>{toUpdate.add(n.id);q.push(n.id);}); }
                    setNodesWithHistory(ns=>ns.map(n=>toUpdate.has(n.id)?{...n,color:c}:n));
                  }}
                    style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: `2.5px solid ${selectedNode.color === c ? "#fff" : "transparent"}`, cursor: "pointer", outline: selectedNode.color === c ? `2px solid ${c}` : "none", outlineOffset: 1.5, transition: "all 0.15s" }} />
                ))}
              </div>
            </div>

            {/* Note */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 6 }}>Note</div>
              <textarea value={selectedNode.note || ""} onChange={e => updateNode(selectedNode.id, { note: e.target.value })} placeholder="Add a note…"
                style={{ width: "100%", minHeight: 58, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8, padding: "8px 10px", fontSize: 11.5, color: "rgba(255,255,255,0.65)", resize: "vertical", outline: "none", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.55 }} />
            </div>

            {/* Linked Flash Decks */}
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 8 }}>Flash Card Decks</div>
              {selectedNode.deckIds.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
                  {selectedNode.deckIds.map(did => {
                    const deck = allDecks.find(d => d.id === did);
                    if (!deck) return null;
                    return (
                      <div key={did} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", background: "rgba(255,255,255,0.04)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: deck.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deck.title}</div>
                        <button onClick={() => updateNode(selectedNode.id, { deckIds: selectedNode.deckIds.filter(i => i !== did) })}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "rgba(255,255,255,0.2)", padding: 0 }}>✕</button>
                      </div>
                    );
                  })}
                  <button onClick={() => openStudy(selectedNode)} style={{ padding: "8px", borderRadius: 8, border: "none", background: "#F5C842", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#1A1814", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    📇 Study ({allDecks.filter(d => selectedNode.deckIds.includes(d.id)).reduce((a, d) => a + (d.cards?.length || d.cardCount || 0), 0)} cards)
                  </button>
                </div>
              )}
              <button onClick={() => setShowDeckPicker(p => !p)} style={{ width: "100%", padding: "7px 0", borderRadius: 7, border: `1.5px dashed ${showDeckPicker ? "rgba(245,200,66,0.5)" : "rgba(255,255,255,0.13)"}`, background: showDeckPicker ? "rgba(245,200,66,0.06)" : "none", fontSize: 11, fontWeight: 600, cursor: "pointer", color: showDeckPicker ? "#F5C842" : "rgba(255,255,255,0.38)", transition: "all 0.15s" }}>
                {showDeckPicker ? "✕ Close" : "+ Attach Flash Deck"}
              </button>
              {showDeckPicker && (
                <div style={{ marginTop: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 8, overflow: "hidden" }}>
                  {allDecks.map(deck => {
                    const linked = selectedNode.deckIds.includes(deck.id);
                    return (
                      <div key={deck.id} onClick={() => updateNode(selectedNode.id, { deckIds: linked ? selectedNode.deckIds.filter(i => i !== deck.id) : [...selectedNode.deckIds, deck.id] })}
                        style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)", background: linked ? "rgba(245,200,66,0.07)" : "transparent", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = linked ? "rgba(245,200,66,0.12)" : "rgba(255,255,255,0.04)"}
                        onMouseLeave={e => e.currentTarget.style.background = linked ? "rgba(245,200,66,0.07)" : "transparent"}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: deck.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: linked ? "#F5C842" : "rgba(255,255,255,0.65)" }}>{deck.title}</div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.23)", marginTop: 1 }}>{deck.cardCount} cards · {deck.mastery}% mastered</div>
                        </div>
                        <div style={{ fontSize: 13, color: linked ? "#F5C842" : "rgba(255,255,255,0.18)" }}>{linked ? "✓" : "+"}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedNode.id !== "root" && (
              <button onClick={() => {
                const hasKids = nodes.some(n=>n.parentId===selectedNode.id);
                if(hasKids){const cnt=(function cA(id){return nodes.filter(n=>n.parentId===id).reduce((a,n)=>a+1+cA(n.id),0);})(selectedNode.id);if(!window.confirm(`Delete "${selectedNode.label.replace(/\n/g,' ')}" and its ${cnt} child node${cnt!==1?'s':''}?`))return;}
                deleteNode(selectedNode.id);
              }} style={{ marginTop: 14, width: "100%", padding: "7px 0", borderRadius: 7, border: "1px solid rgba(232,93,63,0.22)", background: "transparent", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "rgba(232,93,63,0.55)", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#E85D3F"; e.currentTarget.style.color = "#E85D3F"; e.currentTarget.style.background = "rgba(232,93,63,0.07)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(232,93,63,0.22)"; e.currentTarget.style.color = "rgba(232,93,63,0.55)"; e.currentTarget.style.background = "transparent"; }}>
                🗑 Delete Node
              </button>
            )}
          </div>
        )}

        {/* ── Minimap ── */}
        {showMinimap && nodes.length > 1 && (()=>{
          const MM_W=160, MM_H=100, PAD=12;
          const xs=nodes.map(n=>n.x), ys=nodes.map(n=>n.y);
          const minX=Math.min(...xs)-60, maxX=Math.max(...xs)+60;
          const minY=Math.min(...ys)-40, maxY=Math.max(...ys)+40;
          const rangeX=maxX-minX||1, rangeY=maxY-minY||1;
          const sc=Math.min(MM_W/rangeX, MM_H/rangeY, 1);
          const offX=(MM_W-(rangeX*sc))/2, offY=(MM_H-(rangeY*sc))/2;
          const toMM=(x,y)=>({ x:offX+(x-minX)*sc, y:offY+(y-minY)*sc });
          return(
            <div style={{ position:"absolute", bottom:20, right:16, zIndex:60, background:"rgba(10,9,22,0.92)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, overflow:"hidden", width:MM_W+PAD*2, height:MM_H+PAD*2, backdropFilter:"blur(8px)" }}>
              <svg width={MM_W+PAD*2} height={MM_H+PAD*2}>
                <g transform={`translate(${PAD},${PAD})`}>
                  {nodes.filter(n=>n.parentId).map(n=>{
                    const par=nodes.find(p=>p.id===n.parentId); if(!par) return null;
                    const a=toMM(par.x,par.y), b=toMM(n.x,n.y);
                    return <line key={`ml-${n.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={n.color} strokeWidth={0.8} strokeOpacity={0.4}/>;
                  })}
                  {nodes.map(n=>{ const pos=toMM(n.x,n.y); return <circle key={`mm-${n.id}`} cx={pos.x} cy={pos.y} r={n.id==='root'?4:2.5} fill={n.color} opacity={n.id===selectedId?1:0.7}/>; })}
                  {(()=>{
                    const vW=typeof window!=='undefined'?window.innerWidth:1440;
                    const vH=typeof window!=='undefined'?window.innerHeight-100:800;
                    const vpX=(-(pan.x)-minX-(vW/(2*zoom)))*sc+offX;
                    const vpY=(-(pan.y)-minY-(vH/(2*zoom)))*sc+offY;
                    const vpW=Math.min((vW/zoom)*sc, MM_W); const vpH=Math.min((vH/zoom)*sc, MM_H);
                    const clampedX=Math.max(-PAD,Math.min(vpX,MM_W)); const clampedY=Math.max(-PAD,Math.min(vpY,MM_H));
                    return <rect x={clampedX} y={clampedY} width={vpW} height={vpH} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={0.8} rx={1}/>;
                  })()}
                </g>
              </svg>
            </div>
          );
        })()}
      </div>

      {/* ── Flash Card Study Drawer ── */}
      {studyNode && (
        <>
          <div onClick={closeStudy} style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }} />
          <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(580px, 94vw)", zIndex: 251, background: "#F7F6F2", borderRadius: "20px 20px 0 0", padding: "28px 30px 36px", boxShadow: "0 -24px 70px rgba(0,0,0,0.5)", animation: "bm-fade 0.28s ease both" }}>
            <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 34, height: 4, borderRadius: 2, background: "#D8D5CE" }} />

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", marginBottom: 4 }}>
                  Studying · <span style={{ color: "#1A1814" }}>{studyNode.label.replace("\n", " ")}</span>
                </div>
                {studyDecks.length > 1 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {studyDecks.map((d, i) => (
                      <button key={d.id} onClick={() => { setStudyDeckIdx(i); setStudyCardIdx(0); setStudyFlipped(false); }}
                        style={{ padding: "4px 12px", borderRadius: 6, border: `1.5px solid ${studyDeckIdx === i ? d.color : "#ECEAE4"}`, background: studyDeckIdx === i ? d.color : "transparent", fontSize: 11, fontWeight: 700, cursor: "pointer", color: studyDeckIdx === i ? "#fff" : "#8C8880", transition: "all 0.15s" }}>
                        {d.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={closeStudy} style={{ background: "#ECEAE4", border: "none", borderRadius: 7, width: 30, height: 30, cursor: "pointer", fontSize: 13, color: "#8C8880", flexShrink: 0 }}>✕</button>
            </div>

            {activeSDeck && activeSCard ? (
              <>
                {/* Progress bar */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#A8A59E", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: activeSDeck.color }}>{activeSDeck.title}</span>
                  <span>{studyCardIdx + 1} / {activeSDeck.cards.length}</span>
                </div>
                <div style={{ height: 3, background: "#ECEAE4", borderRadius: 2, marginBottom: 20, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${((studyCardIdx + 1) / activeSDeck.cards.length) * 100}%`, background: activeSDeck.color, borderRadius: 2, transition: "width 0.35s" }} />
                </div>

                {/* Flip card */}
                <div onClick={() => setStudyFlipped(f => !f)}
                  style={{ background: studyFlipped ? activeSDeck.color + "10" : "#fff", border: `2px solid ${studyFlipped ? activeSDeck.color : "#ECEAE4"}`, borderRadius: 16, padding: "36px 30px", textAlign: "center", cursor: "pointer", minHeight: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 18, transition: "all 0.22s", boxShadow: studyFlipped ? `0 4px 24px ${activeSDeck.color}22` : "0 2px 12px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: studyFlipped ? activeSDeck.color : "#A8A59E", marginBottom: 14, transition: "color 0.22s" }}>
                    {studyFlipped ? "Definition" : "Term · click to reveal"}
                  </div>
                  <div style={{ fontFamily: studyFlipped ? "'DM Sans', sans-serif" : "'Playfair Display', serif", fontSize: studyFlipped ? 16 : 24, fontWeight: studyFlipped ? 400 : 800, color: "#1A1814", lineHeight: 1.5 }}>
                    {studyFlipped ? activeSCard.definition : activeSCard.term}
                  </div>
                </div>

                {/* Nav */}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={prevCard} disabled={studyCardIdx === 0 && studyDeckIdx === 0}
                    style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1.5px solid #ECEAE4", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#5A5752", opacity: studyCardIdx === 0 && studyDeckIdx === 0 ? 0.3 : 1, transition: "all 0.15s" }}>← Prev</button>
                  <button onClick={nextCard} disabled={studyCardIdx >= activeSDeck.cards.length - 1 && studyDeckIdx >= studyDecks.length - 1}
                    style={{ flex: 2, padding: "11px 0", borderRadius: 9, border: "none", background: activeSDeck.color, fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#fff", opacity: studyCardIdx >= activeSDeck.cards.length - 1 && studyDeckIdx >= studyDecks.length - 1 ? 0.4 : 1, transition: "all 0.15s" }}>Next →</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#A8A59E", fontSize: 14 }}>No flash card decks linked to this node.<br /><span style={{ fontSize: 12 }}>Select the node and click "+ Attach Flash Deck"</span></div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── BrainMapApp — top-level router (home | maps | canvas) ─────────────────────
function BrainMapApp({ onBack, user, openAuth, onLogout, onMapCreated }) {
  const [view,        setView]       = useState("home");
  // Read user's actual decks from localStorage (same key as FlashCardsApp)
  const [userDecks, setUserDecks] = useState(() => {
    try { const s = localStorage.getItem("tp_fc_decks"); if (s) return JSON.parse(s); } catch {}
    return FC_DECKS;
  });
  // Keep userDecks fresh if localStorage changes (e.g. user creates a deck in another tab)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "tp_fc_decks") {
        try { const d = JSON.parse(e.newValue); if (d) setUserDecks(d); } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const [maps,        setMaps]       = useState(() => {
    try { const s = localStorage.getItem("tp_bm_maps"); if (s) return JSON.parse(s); } catch {}
    return BM_INITIAL_MAPS;
  });
  const [activeMap,   setActiveMap]  = useState(null);
  const [sidebarOpen, setSidebarOpen]= useState(false);
  const [showNewMap,  setShowNewMap] = useState(false);
  const [newTitle,    setNewTitle]   = useState("");

  const bmMounted = useRef(false);
  useEffect(() => {
    if (!bmMounted.current) { bmMounted.current = true; return; }
    try { localStorage.setItem("tp_bm_maps", JSON.stringify(maps)); } catch {}
    tpSync("tp_bm_maps", maps);
  }, [maps]);

  const openMap  = (map) => { setActiveMap(map); setView("canvas"); };
  const createMap = () => {
    if (!newTitle.trim()) return;
    const color = BM_PALETTE[maps.length % BM_PALETTE.length];
    const map = {
      id: `map${Date.now()}`, title: newTitle, color, createdAt: new Date(),
      nodes: [{ id: "root", label: newTitle.split(" ").slice(0, 3).join("\n"), x: 0, y: 0, color, parentId: null, deckIds: [], note: "" }],
    };
    setMaps(ms => [...ms, map]);
    setActiveMap(map);
    setNewTitle(""); setShowNewMap(false);
    setView("canvas");
    if (onMapCreated) onMapCreated(newTitle);
  };
  const onNodesChange = (nodes, mapTitle) => {
    setMaps(ms => ms.map(m => m.id === activeMap?.id ? { ...m, nodes, title: mapTitle } : m));
    setActiveMap(am => am ? { ...am, nodes, title: mapTitle } : am);
  };

  const updateMap = (id, changes) => {
    setMaps(ms => ms.map(m => m.id === id ? { ...m, ...changes } : m));
    setActiveMap(am => am?.id === id ? { ...am, ...changes } : am);
  };

  if (view === "canvas" && activeMap) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#0C0B18", minHeight: "100vh" }}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`* { box-sizing: border-box; } @keyframes bm-pop { from { opacity:0; transform:scale(0.9); } to { opacity:1; transform:scale(1); } } @keyframes bm-fade { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
        {/* Nav */}
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: 56, background: "rgba(12,11,24,0.97)", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", paddingLeft: 16, paddingRight: 20, gap: 12, backdropFilter: "blur(10px)" }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, width: 34, height: 34, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <div style={{ width: 13, height: 1.5, background: "rgba(255,255,255,0.6)", borderRadius: 1 }} />
            <div style={{ width: 9,  height: 1.5, background: "rgba(255,255,255,0.35)", borderRadius: 1 }} />
            <div style={{ width: 13, height: 1.5, background: "rgba(255,255,255,0.6)", borderRadius: 1 }} />
          </button>
          <button onClick={onBack} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "5px 12px", fontSize: 11, cursor: "pointer", color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}>← Galaxy</button>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 3, gap: 2 }}>
            {[["home","🏠 Home"],["maps","📂 Maps"]].map(([v,label]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "4px 12px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.35)" }}
                onMouseEnter={e => e.currentTarget.style.color = "#fff"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>{label}</button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {user ? (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #F0A8C0, #9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontSize: 12, fontWeight: 800, color: "#fff", cursor: "pointer" }}
                onClick={() => setSidebarOpen(true)}>{user.avatar}</div>
            ) : (
              <>
                <button onClick={() => openAuth("login")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "5px 12px", fontSize: 11, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>Log In</button>
                <button onClick={() => openAuth("signup")} style={{ background: "#F0A8C0", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#1A1814" }}>Sign Up</button>
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />}
        <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 268, zIndex: 151, background: "linear-gradient(160deg, rgba(12,10,28,0.99) 0%, rgba(6,4,18,0.99) 100%)", borderRight: "1px solid rgba(255,255,255,0.06)", transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.38s cubic-bezier(0.16,1,0.3,1)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: "#F0A8C0" }}>Ace It Brain Map</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: 3, textTransform: "uppercase", marginTop: 1 }}>Ace It</div>
            </div>
            <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, width: 26, height: 26, cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          {/* User */}
          <div style={{ padding: "14px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #F0A8C0, #9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 800, color: "#fff" }}>{user.avatar}</div>
                <div><div style={{ fontSize: 13, fontWeight: 700, color: "#F7F6F2" }}>{user.name}</div><div style={{ fontSize: 10, color: "#F0A8C0", marginTop: 1 }}>● Active</div></div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 7 }}>
                <button onClick={() => { openAuth("login"); setSidebarOpen(false); }} style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "1.5px solid rgba(255,255,255,0.13)", background: "transparent", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#F7F6F2" }}>Log In</button>
                <button onClick={() => { openAuth("signup"); setSidebarOpen(false); }} style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "none", background: "#F0A8C0", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#1A1814" }}>Sign Up</button>
              </div>
            )}
          </div>
          {/* Maps */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.22)", padding: "0 4px", marginBottom: 8 }}>Your Maps</div>
            {maps.map(m => (
              <div key={m.id} onClick={() => { openMap(m); setSidebarOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 9px", borderRadius: 8, cursor: "pointer", marginBottom: 3, background: m.id === activeMap?.id ? "rgba(255,255,255,0.07)" : "transparent", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} onMouseLeave={e => e.currentTarget.style.background = m.id === activeMap?.id ? "rgba(255,255,255,0.07)" : "transparent"}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                <div><div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{m.title}</div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>{m.nodes.length} nodes</div></div>
              </div>
            ))}
            <button onClick={() => { setShowNewMap(true); setSidebarOpen(false); }} style={{ width: "100%", marginTop: 6, padding: "8px 0", borderRadius: 8, border: "1.5px dashed rgba(255,255,255,0.1)", background: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "rgba(255,255,255,0.3)", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(240,168,192,0.45)"; e.currentTarget.style.color = "#F0A8C0"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}>
              + New Map
            </button>
          </div>
          {/* FC Decks panel */}
          <div style={{ padding: "12px 14px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 10 }}>Flash Card Decks</div>
            {userDecks.map(d => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{d.title}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)" }}>{d.cardCount || d.cards?.length || 0} cards · {d.mastery || 0}% mastered</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 10, lineHeight: 1.55 }}>Select a node on the map, then click "+ Attach Flash Deck" to link it.</div>
          </div>
        </div>

        <BrainMapCanvas map={activeMap} onNodesChange={onNodesChange} onBack={() => setView("maps")} allDecks={userDecks} />
      </div>
    );
  }

  // ── Home & Maps views (light bg) ──
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#F7F6F2", minHeight: "100vh", color: "#1A1814" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; } @keyframes bm-pop { from { opacity:0; transform:scale(0.9) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } } @keyframes bm-fade { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } } .bm-card { transition: all 0.22s !important; } .bm-card:hover { transform: translateY(-4px) !important; background: rgba(255,255,255,0.07) !important; } @media (max-width: 768px) { .bm-nav-tabs { display: none !important; } .bm-nav { padding: 0 16px !important; } .bm-main { padding: 28px 16px 60px !important; } .bm-hero { padding: 48px 20px 40px !important; } .bm-cards-grid { grid-template-columns: 1fr !important; } .bm-stats-grid { grid-template-columns: 1fr 1fr !important; } .bm-feats-grid { grid-template-columns: 1fr 1fr !important; } } @media (max-width: 480px) { .bm-feats-grid { grid-template-columns: 1fr !important; } }`}</style>

      {/* Nav */}
      <nav className="bm-nav" style={{ background: "#fff", borderBottom: "1px solid #ECEAE4", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)" }}>
        <div style={{ padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Hamburger */}
            <button onClick={() => setSidebarOpen(o => !o)}
              style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 6, width: 36, height: 36, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4.5, flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#ECEAE4"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#ECEAE4"}>
              <div style={{ width: 14, height: 1.5, background: "#5A5752", borderRadius: 1 }} />
              <div style={{ width: 10, height: 1.5, background: "#5A5752", borderRadius: 1, alignSelf: "flex-start", marginLeft: 2 }} />
              <div style={{ width: 14, height: 1.5, background: "#5A5752", borderRadius: 1 }} />
            </button>
            <button onClick={onBack} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "#6F6B63", transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.color = "#1A1814"} onMouseLeave={e => e.currentTarget.style.color = "#6F6B63"}>← Galaxy</button>
            <div style={{ width: 1, height: 18, background: "#fff" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "#F0A8C0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✺</div>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#1A1814" }}><span style={{ color: "#B8476E" }}>Ace It</span> Brain Map</span>
            </div>
          </div>
          <div className="bm-nav-tabs" style={{ display: "flex", background: "#F1EFEA", borderRadius: 9, padding: 3, gap: 2 }}>
            {[["home","Home"],["maps","All Maps"],["explore","🌐 Explore"]].map(([v,label]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "7px 18px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: view === v ? "#ECEAE4" : "transparent", color: view === v ? "#1A1814" : "#6F6B63", transition: "all 0.18s", whiteSpace:"nowrap" }}>{label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1A1814" }}>{user.name}</span>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #F0A8C0, #9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 800, color: "#1A1814", cursor: "pointer" }} onClick={() => setSidebarOpen(true)}>{user.avatar}</div>
              </div>
            ) : (
              <>
                <button onClick={() => openAuth("login")} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: "pointer", color: "#3A3830" }}>Log In</button>
                <button onClick={() => openAuth("signup")} style={{ background: "#F0A8C0", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#1A1814" }}>Sign Up Free</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Sidebar overlay + panel — shared across home/maps views */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />}
      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 268, zIndex: 151, background: "linear-gradient(160deg, rgba(12,10,28,0.99) 0%, rgba(6,4,18,0.99) 100%)", borderRight: "1px solid rgba(255,255,255,0.06)", transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.38s cubic-bezier(0.16,1,0.3,1)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: "#F0A8C0" }}>Ace It Brain Map</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: 3, textTransform: "uppercase", marginTop: 1 }}>Ace It</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, width: 26, height: 26, cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {!user ? (
          <div style={{ padding: "16px", display: "flex", gap: 8 }}>
            <button onClick={() => { openAuth("login"); setSidebarOpen(false); }} style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "1.5px solid rgba(255,255,255,0.13)", background: "transparent", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#F7F6F2" }}>Log In</button>
            <button onClick={() => { openAuth("signup"); setSidebarOpen(false); }} style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "none", background: "#F0A8C0", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#1A1814" }}>Sign Up</button>
          </div>
        ) : (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#F0A8C0,#9B59B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>{user.avatar}</div>
            <div><div style={{ fontSize: 12, fontWeight: 700, color: "#F7F6F2" }}>{user.name}</div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{user.email}</div></div>
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 8, paddingLeft: 6 }}>My Maps</div>
          {maps.map(m => (
            <div key={m.id} onClick={() => { openMap(m); setSidebarOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 9px", borderRadius: 8, cursor: "pointer", marginBottom: 3, background: m.id === activeMap?.id ? "rgba(255,255,255,0.07)" : "transparent", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = m.id === activeMap?.id ? "rgba(255,255,255,0.07)" : "transparent"}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginLeft: "auto", flexShrink: 0 }}>{m.nodes?.length || 0}</span>
            </div>
          ))}
          <button onClick={() => { setShowNewMap(true); setSidebarOpen(false); }} style={{ width: "100%", marginTop: 6, padding: "8px 0", borderRadius: 8, border: "1.5px dashed rgba(255,255,255,0.1)", background: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "rgba(255,255,255,0.3)", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(240,168,192,0.4)"; e.currentTarget.style.color = "#F0A8C0"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}>
            + New Map
          </button>
        </div>
      </div>

      {/* ── HOME view ── */}
      {view === "home" && (
        <div>
          {/* Hero */}
          <div className="bm-hero" style={{ padding: "80px 24px 72px", textAlign: "center", position: "relative", overflow: "hidden", background: "#1A1814" }}>
            <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,168,192,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(240,168,192,0.1)", border: "1px solid rgba(240,168,192,0.22)", borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#F0A8C0", marginBottom: 24 }}>
              ✺ Visual Mind Mapping
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(40px, 6vw, 68px)", fontWeight: 900, color: "#F7F6F2", lineHeight: 1.08, marginBottom: 20, letterSpacing: -1.5 }}>
              <span style={{ color: "#F0A8C0" }}>Ace It</span> Brain Map</h1>
            <p style={{ fontSize: 17, fontWeight: 300, color: "rgba(247,246,242,0.45)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 40px" }}>
              Build beautiful mind maps and attach flash card decks directly to topics — so studying and understanding happen in the same place.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setShowNewMap(true)} style={{ background: "#F0A8C0", border: "none", borderRadius: 9, padding: "14px 30px", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#1A1814", transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.88"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                + Create New Map
              </button>
              <button onClick={() => setView("maps")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 9, padding: "14px 30px", fontSize: 14, fontWeight: 500, cursor: "pointer", color: "rgba(247,246,242,0.7)" }}>Browse My Maps</button>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ background: "#fff", borderTop: "1px solid #ECEAE4", borderBottom: "1px solid #ECEAE4" }}>
            <div className="bm-stats-grid" style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
              {[
                [maps.length.toString(), "Brain Maps"],
                [maps.reduce((a, m) => a + m.nodes.length, 0).toString(), "Total Nodes"],
                [userDecks.length.toString(), "Linked Decks"],
                [maps.reduce((a, m) => a + m.nodes.filter(n => n.deckIds?.length > 0).length, 0).toString(), "Nodes with Cards"],
              ].map(([val, lbl], i) => (
                <div key={lbl} style={{ padding: "22px 0", textAlign: "center", borderRight: i < 3 ? "1px solid #ECEAE4" : "none" }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: "#B8476E" }}>{val}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#6F6B63", letterSpacing: 1, textTransform: "uppercase", marginTop: 4 }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent maps */}
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#6F6B63", marginBottom: 8 }}>Continue Mapping</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, color: "#1A1814", margin: 0 }}>Your Maps</h2>
              </div>
              <button onClick={() => setView("maps")} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 600, color: "#B8476E", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>View all →</button>
            </div>
            <div className="bm-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {maps.map(m => (
                <div key={m.id} className="bm-card" onClick={() => openMap(m)}
                  style={{ background: "#fff", border: "1.5px solid #ECEAE4", borderTop: `3px solid ${m.color}`, borderRadius: 14, padding: "24px 22px 20px", cursor: "pointer" }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 800, color: "#1A1814", marginBottom: 6 }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: "#6F6B63", marginBottom: 18 }}>{m.nodes.length} nodes · {m.nodes.filter(n => n.deckIds?.length > 0).length} with flash cards</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {m.nodes.filter(n => n.parentId === "root").slice(0, 5).map(n => (
                      <div key={n.id} style={{ padding: "3px 9px", borderRadius: 5, background: n.color + "20", border: `1px solid ${n.color}40`, fontSize: 10, fontWeight: 700, color: n.color }}>{n.label.split("\n")[0]}</div>
                    ))}
                  </div>
                </div>
              ))}
              {/* New map card */}
              <div onClick={() => setShowNewMap(true)} className="bm-card"
                style={{ background: "transparent", border: "1.5px dashed #D8D5CE", borderRadius: 14, padding: "24px 22px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 140 }}>
                <div style={{ fontSize: 28, opacity: 0.35 }}>+</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#6F6B63" }}>New Brain Map</div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div style={{ borderTop: "1px solid #ECEAE4", padding: "60px 24px" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: "#1A1814", textAlign: "center", marginBottom: 40 }}>Built for deep understanding</h2>
              <div className="bm-feats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {[
                  { emoji: "🧠", title: "Infinite Canvas",       desc: "Pan and zoom freely across an infinite workspace. Your map grows as your ideas do." },
                  { emoji: "🎨", title: "Color Branches",        desc: "12 branch colors to organize topics visually. Change any node instantly from the panel." },
                  { emoji: "📇", title: "Flash Card Integration",desc: "Attach any flash card deck to any node. Study directly from the map with a single click." },
                  { emoji: "📝", title: "Node Notes",            desc: "Add context notes to any node — definitions, reminders, or references." },
                  { emoji: "🔗", title: "Unlimited Connections",  desc: "Build deep hierarchies with unlimited child nodes off any parent branch." },
                  { emoji: "📂", title: "Multiple Maps",         desc: "Create separate maps for every subject, chapter, or project and switch between them instantly." },
                ].map(f => (
                  <div key={f.title} style={{ background: "#fff", border: "1.5px solid #ECEAE4", borderRadius: 12, padding: "20px 20px" }}>
                    <div style={{ fontSize: 24, marginBottom: 10 }}>{f.emoji}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 800, color: "#1A1814", marginBottom: 6 }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: "#6F6B63", lineHeight: 1.6 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAPS view ── */}
      {view === "maps" && (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "50px 24px 60px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#6F6B63", marginBottom: 8 }}>Your Workspace</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 800, color: "#1A1814", margin: 0 }}>All Maps</h2>
            </div>
            <button onClick={() => setShowNewMap(true)} style={{ background: "#F0A8C0", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#1A1814" }}>+ New Map</button>
          </div>
          <div className="bm-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {maps.map(m => (
              <div key={m.id} className="bm-card"
                style={{ background: "#fff", border: "1.5px solid #ECEAE4", borderTop: `3px solid ${m.color}`, borderRadius: 14, padding: "24px 22px 16px", cursor: "pointer" }}>
                <div onClick={() => openMap(m)}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 800, color: "#1A1814", marginBottom: 6 }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: "#6F6B63", marginBottom: 14 }}>{m.nodes.length} nodes · {m.nodes.filter(n => n.deckIds?.length > 0).length} with flash cards</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                    {m.nodes.filter(n => n.parentId === "root").slice(0, 6).map(n => (
                      <div key={n.id} style={{ padding: "3px 9px", borderRadius: 5, background: n.color + "20", border: `1px solid ${n.color}40`, fontSize: 10, fontWeight: 700, color: n.color }}>{n.label.split("\n")[0]}</div>
                    ))}
                  </div>
                </div>
                {/* Public/Private toggle + rating */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:10, borderTop:"1px solid #ECEAE4" }}>
                  <button onClick={e => { e.stopPropagation(); updateMap(m.id, { isPublic: !m.isPublic }); }}
                    style={{ padding:"5px 12px", borderRadius:7, border:`1px solid ${m.isPublic ? "#2BAE7E" : "#ECEAE4"}`, background: m.isPublic ? "#2BAE7E18" : "transparent", fontSize:11, fontWeight:700, cursor:"pointer", color: m.isPublic ? "#2BAE7E" : "#6F6B63", transition:"all 0.18s" }}>
                    {m.isPublic ? "🌐 Public" : "🔒 Private"}
                  </button>
                  {m.isPublic && (
                    <div style={{ display:"flex", gap:2 }}>
                      {[1,2,3,4,5].map(s => {
                        const avg = m.ratings?.length ? m.ratings.reduce((a,r)=>a+r.stars,0)/m.ratings.length : 0;
                        return <span key={s} style={{ fontSize:13, color: s<=Math.round(avg) ? "#F5C842" : "#8C8880" }}>★</span>;
                      })}
                      {m.ratings?.length > 0 && <span style={{ fontSize:10, color:"#6F6B63", marginLeft:4 }}>({m.ratings.length})</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div onClick={() => setShowNewMap(true)} className="bm-card"
              style={{ background: "transparent", border: "1.5px dashed #D8D5CE", borderRadius: 14, padding: "24px 22px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 140 }}>
              <div style={{ fontSize: 28, opacity: 0.35 }}>+</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#6F6B63" }}>Create New Map</div>
            </div>
          </div>
        </div>
      )}

      {/* ── EXPLORE view ── */}
      {view === "explore" && (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "50px 24px 60px" }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#6F6B63", marginBottom: 8 }}>Community</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 800, color: "#1A1814", marginBottom: 8 }}>🌐 Public Brain Maps</h2>
            <p style={{ fontSize: 14, color: "#6F6B63", lineHeight: 1.7 }}>Browse mind maps shared by the community. Rate maps to help others find the best ones.</p>
          </div>
          {maps.filter(m => m.isPublic).length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:"#6F6B63" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🗺️</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:800, color:"#3A3830", marginBottom:8 }}>No public maps yet</div>
              <p style={{ fontSize:14, maxWidth:360, margin:"0 auto", lineHeight:1.7 }}>Be the first to share a map! Go to All Maps and click 🔒 Private to make it public.</p>
            </div>
          ) : (
            <div className="bm-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {maps.filter(m => m.isPublic).map(m => {
                const avg = m.ratings?.length ? m.ratings.reduce((a,r)=>a+r.stars,0)/m.ratings.length : 0;
                const userRating = user ? m.ratings?.find(r=>r.userId===user.uid)?.stars||0 : 0;
                return (
                  <div key={m.id} className="bm-card"
                    style={{ background: "#fff", border: "1.5px solid #ECEAE4", borderTop: `3px solid ${m.color}`, borderRadius: 14, padding: "24px 22px 18px" }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 800, color: "#1A1814", marginBottom: 6 }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: "#6F6B63", marginBottom: 14 }}>{m.nodes.length} nodes · by {m.author || user?.name || "Anonymous"}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
                      {m.nodes.filter(n => n.parentId === "root").slice(0, 5).map(n => (
                        <div key={n.id} style={{ padding: "3px 9px", borderRadius: 5, background: n.color + "20", border: `1px solid ${n.color}40`, fontSize: 10, fontWeight: 700, color: n.color }}>{n.label.split("\n")[0]}</div>
                      ))}
                    </div>
                    {/* Star rating */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                      <div style={{ display:"flex", gap:2 }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s}
                            onClick={() => {
                              if (!user) { openAuth("login"); return; }
                              const newRatings = [...(m.ratings||[]).filter(r=>r.userId!==user.uid), { userId:user.uid, stars:s }];
                              updateMap(m.id, { ratings: newRatings });
                            }}
                            style={{ fontSize:18, cursor: user ? "pointer" : "default", color: s<=(userRating||Math.round(avg)) ? "#F5C842" : "rgba(255,255,255,0.15)", transition:"color 0.1s" }}>★</span>
                        ))}
                      </div>
                      <span style={{ fontSize:11, color:"#6F6B63" }}>
                        {avg ? `${avg.toFixed(1)} (${m.ratings.length} ${m.ratings.length===1?"rating":"ratings"})` : "No ratings yet"}
                      </span>
                      {!user && <span style={{ fontSize:11, color:"#8C8880" }}>· Log in to rate</span>}
                    </div>
                    <button onClick={() => openMap(m)}
                      style={{ width:"100%", padding:"9px 0", borderRadius:8, border:"none", background:"#F0A8C0", color:"#1A1814", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.18s" }}
                      onMouseEnter={e=>e.currentTarget.style.opacity="0.88"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                      Open Map →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── New map modal ── */}
      {showNewMap && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(26,24,20,0.45)", backdropFilter: "blur(10px)" }} onClick={() => setShowNewMap(false)}>
          <div style={{ background: "#fff", border: "1px solid #ECEAE4", borderRadius: 18, padding: "40px 38px 34px", width: 420, animation: "bm-pop 0.22s ease both" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>✺</div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, color: "#1A1814", marginBottom: 8 }}>New Brain Map</h3>
            <p style={{ fontSize: 13, color: "#6F6B63", marginBottom: 26 }}>Give your map a topic to start branching from.</p>
            <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && createMap()} placeholder="e.g. Biology — Chapter 4" autoComplete="off"
              style={{ width: "100%", padding: "13px 15px", border: "1.5px solid #ECEAE4", borderRadius: 9, fontSize: 15, fontWeight: 600, color: "#1A1814", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "#fff", marginBottom: 20, transition: "border-color 0.18s" }}
              onFocus={e => e.target.style.borderColor = "#F0A8C0"} onBlur={e => e.target.style.borderColor = "#ECEAE4"} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowNewMap(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "1px solid #ECEAE4", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#6F6B63" }}>Cancel</button>
              <button onClick={createMap} disabled={!newTitle.trim()} style={{ flex: 2, padding: "11px 0", borderRadius: 8, border: "none", background: newTitle.trim() ? "#F0A8C0" : "#fff", fontSize: 13, fontWeight: 700, cursor: newTitle.trim() ? "pointer" : "default", color: newTitle.trim() ? "#1A1814" : "#8C8880", transition: "all 0.18s" }}>Create Map →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrainMapApp;
