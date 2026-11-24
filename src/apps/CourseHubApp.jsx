// Split out of App.jsx so this code only downloads when it is needed.
import { useState, useRef, useEffect } from "react";
import { aiFetch, tpSync } from "../shared.jsx";
import { Icon } from "../shared.jsx";

// ─── Course Hub App ────────────────────────────────────────────────────────────
function CourseHubApp({ onBack, user, openAuth, launchApp }) {
  const CH = '#6ED9B8';
  const PALETTE = ['#6ED9B8','#C8B8FF','#F0A8C0','#F5C842','#90C8F8','#F8C898','#E85D3F'];
  const [courses,    setCourses]    = useState(()=>{try{return JSON.parse(localStorage.getItem('tp_courses')||'[]');}catch{return [];}});
  const [view,       setView]       = useState('home');
  const [chMenuOpen, setChMenuOpen] = useState(false);
  const [active,     setActive]     = useState(null);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [addContentType, setAddContentType] = useState(null); // 'text'|'file'|'link'|'audio'
  const [docName,    setDocName]    = useState('');
  const [docText,    setDocText]    = useState('');
  const [linkUrl,    setLinkUrl]    = useState('');
  const [linkTitle,  setLinkTitle]  = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob,   setAudioBlob]   = useState(null);
  const [audioTranscribing, setAudioTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [genProgress,setGenProgress]= useState('');
  const [genResult,  setGenResult]  = useState(null);
  const [expandedDoc,setExpandedDoc]= useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [showDocPicker, setShowDocPicker] = useState(null); // 'cards' | 'map'
  const [createForm, setCreateForm] = useState({name:'',subject:'',color:CH,description:''});
  const [showCreate, setShowCreate] = useState(false);
  const [errMsg,     setErrMsg]     = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [folderForm,  setFolderForm]  = useState({name:'',parentId:null});
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingDoc, setEditingDoc]       = useState(null);
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [editCourseForm, setEditCourseForm] = useState({name:'',subject:'',color:''});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [dragDocId,   setDragDocId]   = useState(null);
  const [sendToMenu,  setSendToMenu]  = useState(null);
  const [sendingTo,   setSendingTo]   = useState(null);
  const [assignDocId, setAssignDocId] = useState(null); // doc being assigned to folder
  const [chConfirmDelete, setChConfirmDelete] = useState(false);

  const chMounted = useRef(false);
  useEffect(()=>{if(!chMounted.current){chMounted.current=true;return;}localStorage.setItem('tp_courses',JSON.stringify(courses));tpSync('tp_courses',courses);},[courses]);

  const updateCourse=(id,changes)=>{setCourses(cs=>cs.map(c=>c.id===id?{...c,...changes}:c));setActive(a=>a?.id===id?{...a,...changes}:a);};
  const coursesRef=useRef(courses);
  useEffect(()=>{coursesRef.current=courses;},[courses]);
  const navigateTo=(course,v)=>{setActive(course);setView(v);setChMenuOpen(false);window.history.pushState({ch:true,view:v,courseId:course?.id},'',window.location.pathname);};

  useEffect(()=>{
    // Push initial state when CourseHub mounts
    window.history.pushState({ch:true,view:'home',courseId:null},'',window.location.pathname);
    const onPop=(e)=>{
      const s=e.state;
      if(s?.ch){
        if(s.view==='home'){setView('home');setActive(null);setActiveFolderId(null);}
        else if(s.view==='course'){
          const course=coursesRef.current.find(c=>c.id===s.courseId);
          if(course){setView('course');setActive(course);setActiveFolderId(null);}
          else{setView('home');setActive(null);}
        }
      } else {
        // No ch state = went back to galaxy
        onBack();
      }
    };
    window.addEventListener('popstate',onPop);
    return()=>window.removeEventListener('popstate',onPop);
  },[]);

  // Push history when view changes via setView directly
  useEffect(()=>{
    if(view==='home') window.history.replaceState({ch:true,view:'home',courseId:null},'',window.location.pathname);
    else if(view==='course'&&active) window.history.replaceState({ch:true,view:'course',courseId:active.id},'',window.location.pathname);
  },[view,active]);
  const deleteCourse=(id)=>{setCourses(cs=>cs.filter(c=>c.id!==id));setView('home');setActive(null);};

  // Recursive folder helpers
  const getFolderPath=(folders,folderId)=>{
    if(!folderId) return [];
    const path=[];let current=folderId;const visited=new Set();
    while(current&&!visited.has(current)){visited.add(current);const folder=folders.find(f=>f.id===current);if(!folder)break;path.unshift(folder);current=folder.parentId;}
    return path;
  };
  const getDescendantFolderIds=(folders,folderId)=>{
    const result=[];const queue=[folderId];
    while(queue.length){const id=queue.shift();folders.filter(f=>f.parentId===id).forEach(f=>{result.push(f.id);queue.push(f.id);});}
    return result;
  };
  const getDocCount=(folders,documents,folderId)=>{
    const descendants=getDescendantFolderIds(folders,folderId);
    const allIds=new Set([folderId,...descendants]);
    return documents.filter(d=>allIds.has(d.folderId)).length;
  };
  const deleteFolderDeep=(courseId,folderId)=>{
    const descendants=getDescendantFolderIds(active?.folders||[],folderId);
    const toDelete=new Set([folderId,...descendants]);
    const updatedDocs=(active?.documents||[]).map(d=>toDelete.has(d.folderId)?{...d,folderId:null}:d);
    const updatedFolders=(active?.folders||[]).filter(f=>!toDelete.has(f.id));
    updateCourse(courseId,{folders:updatedFolders,documents:updatedDocs});
    // Clear expanded state for deleted folders so sidebar re-renders correctly
    setExpandedFolders(ef=>{const next={...ef};toDelete.forEach(id=>delete next[id]);return next;});
    if(toDelete.has(activeFolderId)) setActiveFolderId(null);
  };
  const sendToApp=async(appId,sourceType,sourceId)=>{
    if(!user){openAuth('login');return;}
    setSendingTo(appId);setSendToMenu(null);
    try{
      let docs=[];let sourceName='';
      if(sourceType==='doc'){const doc=(active.documents||[]).find(d=>d.id===sourceId);if(!doc){setSendingTo(null);return;}docs=[doc];sourceName=doc.name;}
      else{const descendants=getDescendantFolderIds(active.folders||[],sourceId);const allIds=new Set([sourceId,...descendants]);docs=(active.documents||[]).filter(d=>allIds.has(d.folderId));sourceName=(active.folders||[]).find(f=>f.id===sourceId)?.name||'Folder';}
      const allText=docs.map(d=>'['+d.name+']\n'+(d.content||'')).join('\n\n').slice(0,12000);
      if(!allText.trim()){setSendingTo(null);setGenResult({type:'error',msg:'No text content found.'});return;}
      if(appId==='flashcards'){
        const res=await aiFetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:4000,messages:[{role:'user',content:'Create flashcards. Return ONLY JSON: {"cards":[{"term":"...","definition":"..."}]}\n\n'+allText}]})});
        const data=await res.json();const txt=data.content?.find(b=>b.type==='text')?.text||'';
        const parsed=JSON.parse(txt.replace(/```json|```/g,'').trim());
        if(parsed.cards?.length>0){const deck={id:'deck_'+Date.now(),title:sourceName,subject:active.subject||active.name,color:active.color,description:'From '+active.name,tags:[],courseId:active.id,cards:parsed.cards.map((card,i)=>({id:i+1,term:card.term,definition:card.definition,hint:'',mastery:0,dueDate:null})),cardCount:parsed.cards.length,mastery:0,isPublic:false,author:user?.name||'You',createdAt:new Date().toISOString()};const existing=JSON.parse(localStorage.getItem('tp_fc_decks')||'[]');localStorage.setItem('tp_fc_decks',JSON.stringify([...existing,deck]));tpSync('tp_fc_decks',[...existing,deck]);setGenResult({type:'send-cards',count:parsed.cards.length,app:'flashcards',name:sourceName});}
      } else if(appId==='notes'){
        const note={id:`note_${Date.now()}`,title:sourceName,content:allText,folder:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
        const existing=JSON.parse(localStorage.getItem('tp_notes')||'[]');localStorage.setItem('tp_notes',JSON.stringify([...existing,note]));tpSync('tp_notes',[...existing,note]);
        setGenResult({type:'send-notes',app:'notes',name:sourceName});
      } else if(appId==='simplifier'){
        localStorage.setItem('ch_pending_simplify',allText.slice(0,5000));launchApp('simplifier');return;
      }
    }catch(e){setGenResult({type:'error',msg:'Failed to send. Please try again.'});}
    setSendingTo(null);
  };

  const renameFolder=(courseId,folderId,name)=>{
    if(!name?.trim())return;
    updateCourse(courseId,{folders:(active?.folders||[]).map(f=>f.id===folderId?{...f,name:name.trim()}:f)});
  };
  const renameDoc=(courseId,docId,name)=>{
    if(!name?.trim())return;
    updateCourse(courseId,{documents:(active?.documents||[]).map(d=>d.id===docId?{...d,name:name.trim()}:d)});
  };
  const addFolder=(courseId,name,parentId=null)=>{
    if(!name.trim())return;
    const folder={id:`folder_${Date.now()}`,name:name.trim(),parentId,createdAt:new Date().toISOString()};
    updateCourse(courseId,{folders:[...(active?.folders||[]),folder]});
    return folder.id;
  };
  const deleteFolder=(courseId,folderId)=>{
    // Move docs in this folder to uncategorized
    const updatedDocs=(active?.documents||[]).map(d=>d.folderId===folderId?{...d,folderId:null}:d);
    // Also remove subfolders
    const updatedFolders=(active?.folders||[]).filter(f=>f.id!==folderId&&f.parentId!==folderId);
    updateCourse(courseId,{folders:updatedFolders,documents:updatedDocs});
  };
  const assignDocToFolder=(courseId,docId,folderId)=>{
    const updatedDocs=(active?.documents||[]).map(d=>d.id===docId?{...d,folderId}:d);
    updateCourse(courseId,{documents:updatedDocs});
    setAssignDocId(null);
  };

  const createCourse=()=>{
    if(!createForm.name.trim())return;
    if(courses.some(c=>c.name.trim().toLowerCase()===createForm.name.trim().toLowerCase())){
      setErrMsg(`A course named "${createForm.name.trim()}" already exists.`);
      setTimeout(()=>setErrMsg(""),4000);
      return;
    }
    const c={id:`course_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,...createForm,name:createForm.name.trim(),documents:[],flashDeckIds:[],brainMapIds:[],createdAt:new Date().toISOString()};
    setCourses(cs=>[...cs,c]);setActive(c);setView('course');setShowCreate(false);setCreateForm({name:'',subject:'',color:CH,description:''});
  };

  const startRecording=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mr=new MediaRecorder(stream);
      mediaRecorderRef.current=mr;
      audioChunksRef.current=[];
      mr.ondataavailable=e=>audioChunksRef.current.push(e.data);
      mr.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());
        const blob=new Blob(audioChunksRef.current,{type:'audio/webm'});
        setAudioBlob(blob);
        setIsRecording(false);
        // Transcribe using Web Speech API simulation — store as placeholder
        setDocText('[Audio recorded — transcription coming soon. Save to add the audio note.]');
        setDocName(docName||`Audio Note ${new Date().toLocaleTimeString()}`);
      };
      mr.start();
      setIsRecording(true);
    }catch(e){setErrMsg('Microphone access denied. Please allow microphone access and try again.');}
  };
  const stopRecording=()=>{mediaRecorderRef.current?.stop();};

  const fetchLinkContent=async()=>{
    if(!linkUrl.trim())return;
    setFileUploading(true);
    try{
      const isYT=linkUrl.includes('youtube.com')||linkUrl.includes('youtu.be');
      if(isYT){
        const res=await aiFetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,
            messages:[{role:'user',content:`This YouTube URL was added to a course: ${linkUrl}\nWrite a brief description of what this video likely covers based on the URL. Keep it to 2-3 sentences.`}]})});
        const data=await res.json();
        const desc=data.content?.find(b=>b.type==='text')?.text||'';
        setDocText(`[YouTube Video]\nURL: ${linkUrl}\n\n${desc}`);
        setDocName(linkTitle||'YouTube Video');
      } else {
        setDocText(`[Web Link]\nURL: ${linkUrl}\nTitle: ${linkTitle||linkUrl}`);
        setDocName(linkTitle||linkUrl.replace(/https?:\/\//,'').split('/')[0]);
      }
      setFileUploaded(true);
    }catch(e){setErrMsg('Could not fetch link. Saved as reference.');}
    setFileUploading(false);
  };

  const resetAddModal=()=>{
    setShowAddDoc(false);setAddContentType(null);setDocName('');setDocText('');
    setLinkUrl('');setLinkTitle('');setFileUploading(false);setFileUploaded(false);
    setAudioBlob(null);setIsRecording(false);setAudioTranscribing(false);
  };

  const addDocument=(overrideName=null,overrideContent=null)=>{
    const name=(overrideName||docName).trim()||`Document ${(active.documents?.length||0)+1}`;
    const content=(overrideContent||docText).trim();
    if(!content&&!name)return;
    const d={id:`doc_${Date.now()}`,name,content,addedAt:new Date().toISOString()};
    updateCourse(active.id,{documents:[...(active.documents||[]),d]});
    setDocName('');setDocText('');setShowAddDoc(false);setFileUploading(false);setFileUploaded(false);
  };

  const handleFileUpload=async(file)=>{
    if(!file)return;
    setFileUploading(true);
    setFileUploaded(false);
    setErrMsg('');
    const name=file.name.replace(/\.[^.]+$/,'');
    setDocName(name);
    try{
      const isText=file.type.startsWith('text/')||file.name.endsWith('.txt')||file.name.endsWith('.md');
      const isPDF=file.name.toLowerCase().endsWith('.pdf')||file.type==='application/pdf';
      const isImage=file.type.startsWith('image/');

      if(isText){
        const text=await file.text();
        setDocText(text);
        setFileUploaded(true);
        setFileUploading(false);
        return;
      }

      if(isPDF){
        // Extract text client-side using PDF.js — avoids server size limits entirely
        const arrayBuffer=await file.arrayBuffer();
        // Dynamically import pdfjs
        const pdfjsLib=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.min.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/build/pdf.worker.min.mjs';
        const pdf=await pdfjsLib.getDocument({data:arrayBuffer}).promise;
        const totalPages=pdf.numPages;
        let fullText='';
        for(let i=1;i<=totalPages;i++){
          setGenProgress&&setGenProgress(`Reading page ${i}/${totalPages}…`);
          const page=await pdf.getPage(i);
          const content=await page.getTextContent();
          const pageText=content.items.map(item=>item.str).join(' ');
          fullText+=pageText+'\n';
        }
        if(fullText.trim().length>10){
          setDocText(fullText.trim());
          setFileUploaded(true);
        } else {
          setFileUploaded(true);
          setErrMsg('Could not extract text from this PDF. It may be a scanned image. Please paste the text content manually.');
        }
        setFileUploading(false);
        return;
      }

      if(isImage){
        // Images still go through the API (they're smaller)
        const arrayBuffer=await file.arrayBuffer();
        const uint8=new Uint8Array(arrayBuffer);
        let binary='';
        for(let i=0;i<uint8.length;i++){binary+=String.fromCharCode(uint8[i]);}
        const base64=btoa(binary);
        const res=await aiFetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:4000,
            messages:[{role:'user',content:[
              {type:'image',source:{type:'base64',media_type:file.type||'image/jpeg',data:base64}},
              {type:'text',text:'Extract ALL text from this image. Return everything you can read.'}
            ]}]})});
        const data=await res.json();
        const extracted=data.content?.find(b=>b.type==='text')?.text||'';
        if(extracted.length>10){setDocText(extracted);setFileUploaded(true);}
        else{setFileUploaded(true);setErrMsg('Could not read text from image. Please paste content manually.');}
        setFileUploading(false);
        return;
      }

      setErrMsg('Unsupported file type. Please use PDF, PNG, JPG, or text files.');
      setFileUploaded(false);
      setFileUploading(false);

    }catch(e){
      console.error('File upload error:',e);
      setFileUploaded(true);
      setErrMsg('Could not process file: '+e.message+'. Please paste your content below.');
      setFileUploading(false);
    }
  };

    const generateFlashCards=async()=>{
    if(!active?.documents?.length){setErrMsg('Add at least one document first.');return;}
    if(!user){openAuth('login');return;}
    setGenerating('cards');setGenResult(null);setErrMsg('');
    // Only use docs from current folder (and subfolders) if inside a folder
    let docsToUse=active.documents||[];
    if(activeFolderId){
      const descendants=getDescendantFolderIds(active.folders||[],activeFolderId);
      const folderIds=new Set([activeFolderId,...descendants]);
      docsToUse=docsToUse.filter(d=>folderIds.has(d.folderId));
    }
    if(!docsToUse.length){setErrMsg('No documents in this folder. Add documents first.');setGenerating(null);return;}
    const allText=docsToUse.map(d=>'['+d.name+']\n'+d.content).join('\n\n');
    const totalChars=allText.length;
    try{
      setGenProgress('Reading your document and planning study structure…');
      const blueprintRes=await aiFetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:4000,
          messages:[{role:'user',content:'Analyze this study material and list ALL chapters/levels/sections as flashcard decks. Return ONLY valid JSON like this example:\n{"courseName":"Course Name","hasHierarchy":true,"folders":[{"id":"f1","name":"Level 01 Introduction","parentId":null,"decks":[{"id":"d1","name":"Real Estate Basics","topics":["topic1"]},{"id":"d2","name":"Real Estate Law","topics":["topic2"]}]},{"id":"f2","name":"Level 02 Real Property","parentId":null,"decks":[{"id":"d3","name":"Land and Property","topics":["topic1"]}]}],"flatDecks":[]}\n\nIMPORTANT: Find ALL levels and ALL chapters. Create one deck per chapter. No markdown. No explanation. Only the JSON object.\n\nDocument:\n'+allText.slice(0,12000)}]})});
      const bpData=await blueprintRes.json();
      const bpTxt=bpData.content?.find(b=>b.type==='text')?.text||'';
      let blueprint;
      console.log('Blueprint AI response:',bpTxt.slice(0,300));
      try{
        const bpClean=bpTxt.replace(/\`\`\`json/g,'').replace(/\`\`\`/g,'').trim();
        const bpStart=bpClean.indexOf('{');
        const bpEnd=bpClean.lastIndexOf('}');
        const bpJson=bpStart>=0&&bpEnd>bpStart?bpClean.slice(bpStart,bpEnd+1):bpClean;
        blueprint=JSON.parse(bpJson);
        console.log('Parsed:',blueprint?.folders?.length,'folders',blueprint?.flatDecks?.length,'flatDecks');
      }
      catch{
        // Fallback: create basic structure so generation continues
        blueprint={courseName:active.name,hasHierarchy:false,folders:[],
          flatDecks:[
            {id:'d1',name:active.name+' — Part 1',topics:['key concepts']},
            {id:'d2',name:active.name+' — Part 2',topics:['core topics']},
            {id:'d3',name:active.name+' — Part 3',topics:['important terms']},
          ]
        };
      }

      const allDecks=[],allFolders=[];
      const deckList=blueprint.hasHierarchy
        ?( blueprint.folders?.flatMap(f=>f.decks.map(d=>({...d,folderName:f.name,folderId:f.id})))||[] )
        :(blueprint.flatDecks||[]);
      const totalDecks=deckList.length;

      if(blueprint.hasHierarchy&&blueprint.folders?.length){
        const rootId='uf-ch-'+Date.now();
        allFolders.push({id:rootId,name:active.name,parentId:null});
        const folderIdMap={};
        blueprint.folders.forEach((f,fi)=>{
          const fid='uf-ch-'+(Date.now()+fi+1);
          folderIdMap[f.id]=fid;
          allFolders.push({id:fid,name:f.name,parentId:rootId});
        });
        deckList.forEach(d=>{d._realFolderId=folderIdMap[d.folderId]||null;});
      }

      for(let i=0;i<totalDecks;i++){
        const dp=deckList[i];
        setGenProgress('✦ Generating cards for "'+dp.name+'" ('+( i+1)+'/'+totalDecks+')…');
        const topicHints=(dp.topics||[]).join(', ');
        let relevantText=allText;
        const nameIdx=allText.toLowerCase().indexOf((dp.name||'').toLowerCase().slice(0,30));
        if(nameIdx>-1){const s=Math.max(0,nameIdx-200);relevantText=allText.slice(s,s+6000);}
        else{const chunk=Math.floor(totalChars/Math.max(totalDecks,1));relevantText=allText.slice(i*chunk,i*chunk+6000);}
        try{relevantText=relevantText.replace(/[\uD800-\uDFFF]/g,'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').slice(0,4000);}catch{relevantText=relevantText.slice(0,4000);}
        try{
                const cardRes=await aiFetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:6000,

            messages:[{role:'user',content:'Create comprehensive flashcards for: "'+dp.name+'"\nCourse: '+active.name+'\nKey topics: '+topicHints+'\n\nRules:\n- Include EVERY testable fact, definition, concept, formula, key term\n- Each card tests ONE specific thing\n- Do NOT skip anything that could appear on a test\n\nRespond ONLY with JSON:\n{"cards":[{"term":"...","definition":"...","hint":"optional"},...]}'+'\n\nContent:\n'+relevantText}]})});
        const cardData=await cardRes.json();
        const cardTxt=cardData.content?.find(b=>b.type==='text')?.text||'';
        try{
          const parsed=JSON.parse(cardTxt.replace(/\`\`\`json/g,'').replace(/\`\`\`/g,'').trim());
          if(parsed.cards?.length>0){allDecks.push({id:'deck_'+Date.now()+'_'+i,title:dp.name,subject:active.subject||active.name,color:active.color,description:'Generated from '+active.name,tags:[active.name.toLowerCase().replace(/\s+/g,'-')],courseId:active.id,folderKey:dp._realFolderId||null,cards:parsed.cards.map((c,ci)=>({id:ci+1,term:c.term||'',definition:c.definition||'',hint:c.hint||'',mastery:0,dueDate:null})),cardCount:parsed.cards.length,mastery:0,isPublic:false,author:user?.name||'You',createdAt:new Date().toISOString()});}
        }catch{}
        }catch(cardErr){console.warn('Card gen error for deck',dp.name,cardErr.message);}
        if(i<totalDecks-1)await new Promise(r=>setTimeout(r,300));
      }

      if(allDecks.length>0){
        setGenProgress('Saving decks and folder structure…');
        if(allFolders.length>0){
          const ef=JSON.parse(localStorage.getItem('tp_fc_folders')||'[]');
          localStorage.setItem('tp_fc_folders',JSON.stringify([...ef,...allFolders]));
          tpSync('tp_fc_folders',[...ef,...allFolders]);
        }
        const ed=JSON.parse(localStorage.getItem('tp_fc_decks')||'[]');
        localStorage.setItem('tp_fc_decks',JSON.stringify([...ed,...allDecks]));
        tpSync('tp_fc_decks',[...ed,...allDecks]);
        updateCourse(active.id,{flashDeckIds:[...(active.flashDeckIds||[]),...allDecks.map(d=>d.id)]});
        setGenResult({type:'cards',count:allDecks.length,total:allDecks.reduce((a,d)=>a+d.cardCount,0),folders:allFolders.length});
        setGenProgress('');
      }else{setErrMsg('Could not generate cards. Try adding more content to your documents.');}
    }catch(e){console.error(e);setErrMsg('Generation failed: '+e.message);}
    setGenerating(null);
  };

  const generateBrainMap=async()=>{
    if(!active?.documents?.length){setErrMsg('Add at least one document first.');return;}
    if(!user){openAuth('login');return;}
    setGenerating('map');setGenResult(null);setErrMsg('');
    const allText=active.documents.map(d=>`[${d.name}]\n${d.content}`).join('\n\n');
    try{
      setGenProgress('Building brain map structure…');
      const res=await aiFetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:2000,messages:[{role:'user',content:`Create a hierarchical brain map for course: "${active.name}". Root = course name. 4-7 main branches, each with 3-5 children.\nRespond ONLY with JSON: {"root":"${active.name}","branches":[{"label":"Main Topic","children":[{"label":"Subtopic","note":"brief desc"},...]},...]}.\nMaterial:\n${allText.slice(0,4000)}`}]})});
      const data=await res.json();const txt=data.content?.find(b=>b.type==='text')?.text||'';
      const parsed=JSON.parse(txt.replace(/\`\`\`json|\`\`\`/g,'').trim());
      const bmPalette=["#4F6EF7","#E85D3F","#2BAE7E","#9B59B6","#F5C842","#E67E22","#1DA1F2"];
      const nodes=[{id:'root',label:parsed.root||active.name,x:0,y:0,color:active.color,parentId:null,deckIds:[],note:''}];
      (parsed.branches||[]).forEach((branch,bi)=>{
        const bColor=bmPalette[bi%bmPalette.length],bAngle=(bi/(parsed.branches.length))*Math.PI*2-Math.PI/2;
        const bx=Math.cos(bAngle)*260,by=Math.sin(bAngle)*260,bid=`b${bi}`;
        nodes.push({id:bid,label:branch.label,x:bx,y:by,color:bColor,parentId:'root',deckIds:[],note:''});
        (branch.children||[]).forEach((child,ci)=>{const cAngle=bAngle+(ci-(branch.children.length-1)/2)*0.55;nodes.push({id:`${bid}c${ci}`,label:child.label,x:bx+Math.cos(cAngle)*190,y:by+Math.sin(cAngle)*190,color:bColor,parentId:bid,deckIds:[],note:child.note||''},);});
      });
      const newMap={id:`map_${Date.now()}`,title:active.name,color:active.color,courseId:active.id,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),nodes};
      const existing=JSON.parse(localStorage.getItem('tp_bm_maps')||'[]');
      localStorage.setItem('tp_bm_maps',JSON.stringify([...existing,newMap]));
      updateCourse(active.id,{brainMapIds:[...(active.brainMapIds||[]),newMap.id]});
      setGenResult({type:'map',nodeCount:nodes.length});setGenProgress('');
    }catch(e){console.error(e);setErrMsg('Generation failed. Please try again.');}
    setGenerating(null);
  };

  // Recursive sidebar folder tree — uses expandedFolders state (no hooks needed)
  const renderSidebarFolder=(folder,depth=0)=>{
    const children=(active.folders||[]).filter(f=>f.parentId===folder.id);
    const docCount=(active.documents||[]).filter(d=>d.folderId===folder.id).length;
    const isActive=activeFolderId===folder.id;
    const isOpen=expandedFolders[folder.id]!==false; // default open
    return(
      <div key={folder.id}>
        <div style={{display:'flex',alignItems:'center',paddingLeft:depth*12}}>
          {children.length>0
            ?<button onClick={e=>{e.stopPropagation();setExpandedFolders(ef=>({...ef,[folder.id]:!isOpen}));}} style={{background:'none',border:'none',cursor:'pointer',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center',color:'#A8A59E',fontSize:10,flexShrink:0}}>{isOpen?'▼':'▶'}</button>
            :<div style={{width:18,flexShrink:0}}/>
          }
          <button onClick={()=>setActiveFolderId(folder.id)} style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'7px 8px',borderRadius:8,border:'none',background:isActive?active.color+'20':'transparent',cursor:'pointer',textAlign:'left',minWidth:0}}>
            <span style={{fontSize:13}}>{isOpen&&children.length>0?<Icon e="📂" />:<Icon e="📁" />}</span>
            <span style={{fontSize:12,fontWeight:isActive?700:500,color:isActive?active.color:'#3A3530',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{folder.name}</span>
            {docCount>0&&<span style={{fontSize:10,color:'#A8A59E',flexShrink:0}}>{docCount}</span>}
          </button>
        </div>
        {isOpen&&children.length>0&&children.map(child=>renderSidebarFolder(child,depth+1))}
      </div>
    );
  };

  // Send To dropdown renderer
  const renderSendToDropdown=(sourceType,sourceId)=>(
    <div style={{position:'absolute',top:'100%',right:0,zIndex:200,background:'#fff',border:'1px solid #ECEAE4',borderRadius:12,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',padding:'6px',minWidth:180,marginTop:4}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#A8A59E',padding:'4px 10px 6px'}}>Send to...</div>
      {[
        {id:'flashcards',label:'Flash Cards',icon:'🃏',color:'#C8B8FF'},
        {id:'notes',label:'Notes',icon:<Icon e="📄" />,color:'#F0D080'},
        {id:'simplifier',label:'Text Simplifier',icon:<Icon e="🔍" />,color:'#6ED9B8'},
      ].map(app=>(
        <button key={app.id} onClick={()=>{sendToApp(app.id,sourceType,sourceId);setSendToMenu(null);}}
          style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,border:'none',background:'transparent',cursor:'pointer',textAlign:'left'}}
          onMouseEnter={e=>e.currentTarget.style.background=app.color+'20'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <span style={{fontSize:16}}>{app.icon}</span>
          <span style={{fontSize:13,fontWeight:500,color:'#1A1814'}}>{app.label}</span>
        </button>
      ))}
    </div>
  );

  if(view==='course'&&active) return(
    <div style={{fontFamily:"'DM Sans',sans-serif",background:'#F7F6F2',minHeight:'100vh',color:'#1A1814',display:'flex',flexDirection:'column'}}>
      <style>{`@keyframes ch-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.ch-folder-tile:hover{border-color:var(--ac)!important;background:var(--ac-light)!important;}.ch-doc-row:hover{background:#F7F6F2!important;}@media(max-width:768px){.ch-layout{flex-direction:column!important}.ch-sidebar{width:100%!important;border-right:none!important;border-bottom:1px solid #ECEAE4!important;max-height:200px!important}}`}</style>

      {chMenuOpen&&<div onClick={()=>setChMenuOpen(false)} style={{position:'fixed',inset:0,zIndex:150,background:'rgba(0,0,0,0.3)',backdropFilter:'blur(4px)'}}/>}
      <div style={{position:'fixed',left:0,top:0,bottom:0,width:256,zIndex:151,background:'#fff',borderRight:'1px solid #ECEAE4',transform:chMenuOpen?'translateX(0)':'translateX(-100%)',transition:'transform 0.3s cubic-bezier(0.16,1,0.3,1)',padding:'18px 14px',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,paddingBottom:10,borderBottom:'1px solid #ECEAE4'}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:800,color:'#166534'}}>Course Hub</span>
          <button onClick={()=>setChMenuOpen(false)} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:5,width:24,height:24,cursor:'pointer',fontSize:11,color:'#8C8880',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <button onClick={()=>{setView('home');setActive(null);setChMenuOpen(false);setActiveFolderId(null);}} style={{display:'block',width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #ECEAE4',background:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',color:'#166534',textAlign:'left',marginBottom:8}}>◎ All Courses</button>
        {courses.length>0&&(<><div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#A8A59E',margin:'10px 0 6px'}}>My Courses</div>{courses.map(course=>(<button key={course.id} onClick={()=>{navigateTo(course,'course');setActiveFolderId(null);setChMenuOpen(false);}} style={{display:'block',width:'100%',padding:'9px 12px',borderRadius:8,border:`1.5px solid ${active?.id===course.id?course.color:'#ECEAE4'}`,background:active?.id===course.id?course.color+'15':'#fff',fontSize:12,fontWeight:700,cursor:'pointer',color:'#1A1814',textAlign:'left',marginBottom:5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{course.name}</button>))}</>)}
        <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #ECEAE4'}}>
          <button onClick={()=>{setShowCreate(true);setChMenuOpen(false);}} style={{display:'block',width:'100%',padding:'9px 12px',borderRadius:8,border:'none',background:'#1A1814',fontSize:13,fontWeight:700,cursor:'pointer',color:'#F7F6F2',textAlign:'center'}}>+ New Course</button>
        </div>
      </div>

      <nav style={{position:'sticky',top:0,zIndex:100,height:56,background:'#fff',borderBottom:'1px solid #ECEAE4',display:'flex',alignItems:'center',padding:'0 16px',gap:10,flexShrink:0}}>
        <button onClick={()=>setChMenuOpen(o=>!o)} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:7,width:34,height:34,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.borderColor=active.color} onMouseLeave={e=>e.currentTarget.style.borderColor='#ECEAE4'}>
          <div style={{width:13,height:1.5,background:'#6B6860',borderRadius:1}}/><div style={{width:9,height:1.5,background:'#6B6860',borderRadius:1,alignSelf:'flex-start',marginLeft:2}}/><div style={{width:13,height:1.5,background:'#6B6860',borderRadius:1}}/>
        </button>
        <button onClick={onBack} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:7,padding:'5px 12px',fontSize:12,cursor:'pointer',color:'#8C8880',whiteSpace:'nowrap'}}>← Galaxy</button>
        <div style={{width:1,height:16,background:'#ECEAE4',flexShrink:0}}/>
        <span style={{fontSize:13,fontWeight:600,color:'#8C8880',cursor:'pointer',whiteSpace:'nowrap'}} onClick={()=>{setView('home');setActive(null);setActiveFolderId(null);}}>Course Hub</span>
        <span style={{color:'#C8C4BE',fontSize:12}}>›</span>
        <span style={{fontSize:13,fontWeight:700,color:'#1A1814',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{active.name}</span>
        {activeFolderId&&getFolderPath(active.folders||[],activeFolderId).map((folder,idx,arr)=>(
          <span key={folder.id} style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{color:'#C8C4BE',fontSize:12}}>›</span>
            <span onClick={()=>setActiveFolderId(folder.id)} style={{fontSize:13,fontWeight:idx===arr.length-1?700:500,color:idx===arr.length-1?active.color:'#8C8880',cursor:'pointer',whiteSpace:'nowrap'}}>{folder.name}</span>
          </span>
        ))}
      </nav>

      {showAddDoc&&(
        <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.55)',backdropFilter:'blur(10px)'}} onClick={resetAddModal}>
          <div style={{background:'#fff',borderRadius:20,padding:'28px 32px',width:540,maxWidth:'94vw',maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,color:'#1A1814'}}>
                {addContentType?{text:'Paste Text',file:'Upload File',link:'Add Link',audio:'Record Audio'}[addContentType]:'Add Content'}
              </h3>
              <button onClick={addContentType?()=>setAddContentType(null):resetAddModal} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:8,width:30,height:30,cursor:'pointer',fontSize:14,color:'#8C8880'}}>
                {addContentType?'←':'✕'}
              </button>
            </div>
            <p style={{fontSize:13,color:'#8C8880',marginBottom:20}}>
              {activeFolderId?`Adding to: ${(active.folders||[]).find(f=>f.id===activeFolderId)?.name}`:'Choose how to add content'}
            </p>

            {/* Type picker */}
            {!addContentType&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:8}}>
                {[
                  {id:'file',icon:<Icon e="📎" />,label:'Upload File',desc:'PDF, image, TXT, MD'},
                  {id:'text',icon:<Icon e="✏️" />,label:'Paste Text',desc:'Notes, chapters, content'},
                  {id:'link',icon:<Icon e="🔗" />,label:'Add Link',desc:'YouTube, article, website'},
                  {id:'audio',icon:<Icon e="🎙️" />,label:'Record Audio',desc:'Lecture, voice notes'},
                ].map(t=>(
                  <button key={t.id} onClick={()=>setAddContentType(t.id)}
                    style={{display:'flex',alignItems:'center',gap:12,padding:'16px',borderRadius:14,border:'1.5px solid #ECEAE4',background:'#fff',cursor:'pointer',textAlign:'left',transition:'all 0.15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=active.color;e.currentTarget.style.background=active.color+'08';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='#ECEAE4';e.currentTarget.style.background='#fff';}}>
                    <span style={{fontSize:28}}>{t.icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:'#1A1814'}}>{t.label}</div>
                      <div style={{fontSize:11,color:'#A8A59E',marginTop:2}}>{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* File upload */}
            {addContentType==='file'&&(
              <>
                <label style={{display:'block',border:`2px dashed ${active.color}`,borderRadius:12,padding:'28px 20px',textAlign:'center',cursor:'pointer',background:active.color+'08',marginBottom:16}}
                  onMouseEnter={e=>e.currentTarget.style.background=active.color+'15'}
                  onMouseLeave={e=>e.currentTarget.style.background=active.color+'08'}>
                  <input type="file" accept=".pdf,.txt,.md,image/*" style={{display:'none'}} onChange={async e=>{const file=e.target.files?.[0];if(file)handleFileUpload(file);e.target.value='';}}/>
                  {fileUploading
                    ?<><div style={{width:32,height:32,border:`3px solid ${active.color}30`,borderTopColor:active.color,borderRadius:'50%',animation:'qbSpin 0.8s linear infinite',margin:'0 auto 10px'}}/><div style={{fontSize:13,fontWeight:600,color:'#6B6860'}}>Reading file…</div></>
                    :fileUploaded
                      ?<><div style={{fontSize:36,marginBottom:8}}><Icon e="✅" /></div><div style={{fontSize:13,fontWeight:700,color:'#166534'}}>File ready — give it a name below</div></>
                      :<><div style={{fontSize:36,marginBottom:8}}><Icon e="📎" /></div><div style={{fontSize:13,fontWeight:700,color:'#1A1814'}}>Click to upload</div><div style={{fontSize:11,color:'#8C8880',marginTop:4}}>PDF, PNG, JPG, TXT, MD supported</div></>
                  }
                </label>
                <input value={docName} onChange={e=>setDocName(e.target.value)} placeholder="Document name (optional)" style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #ECEAE4',background:'#fff',fontSize:13,color:'#1A1814',outline:'none',marginBottom:16,boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif"}} onFocus={e=>e.target.style.borderColor=active.color} onBlur={e=>e.target.style.borderColor='#ECEAE4'}/>
              </>
            )}

            {/* Text paste */}
            {addContentType==='text'&&(
              <>
                <input value={docName} onChange={e=>setDocName(e.target.value)} placeholder="Document name (optional)" style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #ECEAE4',background:'#fff',fontSize:13,color:'#1A1814',outline:'none',marginBottom:10,boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif"}} onFocus={e=>e.target.style.borderColor=active.color} onBlur={e=>e.target.style.borderColor='#ECEAE4'}/>
                <textarea value={docText} onChange={e=>setDocText(e.target.value)} placeholder="Paste your notes, textbook chapters, syllabus, or any course content here…" onKeyDown={e=>e.stopPropagation()} style={{width:'100%',minHeight:200,padding:'10px 12px',borderRadius:9,border:'1.5px solid #ECEAE4',background:'#fff',fontSize:13,color:'#1A1814',outline:'none',resize:'vertical',marginBottom:16,boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif",lineHeight:1.6}} onFocus={e=>e.target.style.borderColor=active.color} onBlur={e=>e.target.style.borderColor='#ECEAE4'}/>
              </>
            )}

            {/* Link */}
            {addContentType==='link'&&(
              <>
                <input value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} placeholder="Paste URL (YouTube, article, website…)" style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #ECEAE4',background:'#fff',fontSize:13,color:'#1A1814',outline:'none',marginBottom:10,boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif"}} onFocus={e=>e.target.style.borderColor=active.color} onBlur={e=>e.target.style.borderColor='#ECEAE4'}/>
                <input value={linkTitle} onChange={e=>setLinkTitle(e.target.value)} placeholder="Title (optional)" style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #ECEAE4',background:'#fff',fontSize:13,color:'#1A1814',outline:'none',marginBottom:12,boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif"}} onFocus={e=>e.target.style.borderColor=active.color} onBlur={e=>e.target.style.borderColor='#ECEAE4'}/>
                {!fileUploaded&&<button onClick={fetchLinkContent} disabled={!linkUrl.trim()||fileUploading} style={{width:'100%',padding:'10px',borderRadius:9,border:'none',background:linkUrl.trim()?active.color:'#ECEAE4',fontSize:13,fontWeight:700,cursor:linkUrl.trim()?'pointer':'default',color:linkUrl.trim()?'#1A1814':'#A8A59E',marginBottom:16}}>
                  {fileUploading?'Fetching…':'Preview Link'}
                </button>}
                {fileUploaded&&<div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:9,padding:'10px 14px',marginBottom:16,fontSize:12,color:'#166534'}}>✓ Link ready to save</div>}
              </>
            )}

            {/* Audio */}
            {addContentType==='audio'&&(
              <>
                <div style={{textAlign:'center',padding:'24px 20px',background:'#F7F6F2',borderRadius:14,marginBottom:12}}>
                  {isRecording
                    ?<><div style={{width:56,height:56,borderRadius:'50%',background:'#E85D3F',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:24}}><Icon e="🎙️" /></div>
                      <div style={{fontSize:14,fontWeight:700,color:'#E85D3F',marginBottom:12}}>Recording…</div>
                      <button onClick={stopRecording} style={{padding:'10px 24px',borderRadius:10,border:'none',background:'#E85D3F',fontSize:13,fontWeight:700,cursor:'pointer',color:'#fff'}}>Stop Recording</button></>
                    :audioBlob
                      ?<><div style={{fontSize:36,marginBottom:8}}><Icon e="✅" /></div><div style={{fontSize:13,fontWeight:700,color:'#166534',marginBottom:4}}>Recording complete</div><div style={{fontSize:11,color:'#8C8880'}}>Name it below and save</div></>
                      :<><div style={{fontSize:40,marginBottom:10}}><Icon e="🎙️" /></div>
                        <div style={{fontSize:13,fontWeight:600,color:'#1A1814',marginBottom:4}}>Record a lecture or voice note</div>
                        <div style={{fontSize:11,color:'#8C8880',marginBottom:14}}>Requires microphone access</div>
                        <button onClick={startRecording} style={{padding:'10px 24px',borderRadius:10,border:'none',background:active.color,fontSize:13,fontWeight:700,cursor:'pointer',color:'#1A1814'}}>Start Recording</button></>
                  }
                </div>
                <div style={{textAlign:'center',fontSize:12,color:'#A8A59E',margin:'4px 0 10px'}}>— or upload an audio file —</div>
                <label style={{display:'block',border:'1.5px dashed #ECEAE4',borderRadius:10,padding:'12px',textAlign:'center',cursor:'pointer',marginBottom:12,transition:'all 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=active.color}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='#ECEAE4'}>
                  <input type="file" accept="audio/*" style={{display:'none'}} onChange={e=>{
                    const file=e.target.files?.[0];
                    if(!file)return;
                    setDocName(docName||file.name.replace(/\.[^.]+$/,''));
                    setDocText(`[Audio File: ${file.name}]`);
                    setAudioBlob(file);
                    e.target.value='';
                  }}/>
                  <span style={{fontSize:12,fontWeight:600,color:'#6B6860'}}><Icon e="📂" /> Upload audio file (MP3, M4A, WAV…)</span>
                </label>
                <input value={docName} onChange={e=>setDocName(e.target.value)} placeholder="Recording name (optional)" style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #ECEAE4',background:'#fff',fontSize:13,color:'#1A1814',outline:'none',marginBottom:16,boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif"}} onFocus={e=>e.target.style.borderColor=active.color} onBlur={e=>e.target.style.borderColor='#ECEAE4'}/>
              </>
            )}

            {/* Footer buttons */}
            {addContentType&&(
              <div style={{display:'flex',gap:10}}>
                <button onClick={resetAddModal} style={{flex:1,padding:'11px',borderRadius:10,border:'1px solid #ECEAE4',background:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',color:'#6B6860'}}>Cancel</button>
                <button
                  onClick={()=>{
                    const name=(docName).trim()||`Document ${(active.documents?.length||0)+1}`;
                    const content=docText.trim()||(addContentType==='link'?`[Link] ${linkUrl}`:addContentType==='audio'?'[Audio Note]':'');
                    if(!content&&!fileUploaded&&!audioBlob)return;
                    const d={id:`doc_${Date.now()}`,name,content,type:addContentType,url:addContentType==='link'?linkUrl:null,folderId:activeFolderId||null,addedAt:new Date().toISOString()};
                    updateCourse(active.id,{documents:[...(active.documents||[]),d]});
                    resetAddModal();
                  }}
                  disabled={fileUploading||isRecording||(addContentType==='text'&&!docText.trim())||(addContentType==='file'&&!fileUploaded)||(addContentType==='link'&&!fileUploaded&&!linkUrl.trim())||(addContentType==='audio'&&!audioBlob)}
                  style={{flex:2,padding:'11px',borderRadius:10,border:'none',fontSize:13,fontWeight:700,cursor:'pointer',
                    background:((addContentType==='text'&&docText.trim())||(addContentType==='file'&&fileUploaded)||(addContentType==='link'&&(fileUploaded||linkUrl.trim()))||(addContentType==='audio'&&audioBlob))?active.color:'#ECEAE4',
                    color:((addContentType==='text'&&docText.trim())||(addContentType==='file'&&fileUploaded)||(addContentType==='link'&&(fileUploaded||linkUrl.trim()))||(addContentType==='audio'&&audioBlob))?'#1A1814':'#A8A59E'}}>
                  Save Content
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showEditCourse&&(
        <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(8px)'}} onClick={()=>setShowEditCourse(false)}>
          <div style={{background:'#fff',borderRadius:18,padding:'32px',width:460,maxWidth:'94vw'}} onClick={e=>e.stopPropagation()}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,color:'#1A1814',marginBottom:20}}>Edit Course</h3>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#6B6860',marginBottom:4}}>Course Name</label>
            <input value={editCourseForm.name} onChange={e=>setEditCourseForm(f=>({...f,name:e.target.value}))} onKeyDown={e=>e.stopPropagation()}
              style={{width:'100%',padding:'9px 12px',borderRadius:9,border:`1.5px solid ${active?.color||'#ECEAE4'}`,background:'#fff',fontSize:13,color:'#1A1814',outline:'none',marginBottom:12,boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif"}}/>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#6B6860',marginBottom:4}}>Subject / Category</label>
            <input value={editCourseForm.subject} onChange={e=>setEditCourseForm(f=>({...f,subject:e.target.value}))} onKeyDown={e=>e.stopPropagation()} placeholder="e.g. Principles of Real Estate 1"
              style={{width:'100%',padding:'9px 12px',borderRadius:9,border:'1.5px solid #ECEAE4',background:'#fff',fontSize:13,color:'#1A1814',outline:'none',marginBottom:12,boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif"}}/>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#6B6860',marginBottom:8}}>Color</label>
            <div style={{display:'flex',gap:8,marginBottom:20}}>
              {['#6ED9B8','#C8B8FF','#F0A8C0','#F5C842','#90C8F8','#F8C898','#E85D3F'].map(col=>(
                <div key={col} onClick={()=>setEditCourseForm(f=>({...f,color:col}))} style={{width:28,height:28,borderRadius:'50%',background:col,cursor:'pointer',border:`3px solid ${editCourseForm.color===col?'#1A1814':'transparent'}`,transition:'all 0.15s'}}/>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowEditCourse(false)} style={{flex:1,padding:'11px',borderRadius:10,border:'1px solid #ECEAE4',background:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',color:'#6B6860'}}>Cancel</button>
              <button onClick={()=>{if(editCourseForm.name.trim()){updateCourse(active.id,{name:editCourseForm.name.trim(),subject:editCourseForm.subject.trim(),color:editCourseForm.color});setShowEditCourse(false);}}}
                style={{flex:2,padding:'11px',borderRadius:10,border:'none',background:editCourseForm.name.trim()?'#1A1814':'#ECEAE4',fontSize:13,fontWeight:700,cursor:'pointer',color:'#fff'}}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showFolderModal&&(
        <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.4)',backdropFilter:'blur(6px)'}} onClick={()=>setShowFolderModal(false)}>
          <div style={{background:'#fff',borderRadius:16,padding:'28px',width:360,maxWidth:'94vw'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:'#1A1814',marginBottom:14}}>New Folder</div>
            <input value={folderForm.name} onChange={e=>setFolderForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Level 01, Week 1, Chapter Notes" autoFocus
              onKeyDown={e=>{if(e.key==='Enter'&&folderForm.name.trim()){addFolder(active.id,folderForm.name,activeFolderId||null);setShowFolderModal(false);}e.stopPropagation();}}
              style={{width:'100%',padding:'11px 14px',borderRadius:9,border:`1.5px solid ${active.color}`,background:'#fff',fontSize:14,color:'#1A1814',outline:'none',marginBottom:16,boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif"}}/>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setShowFolderModal(false)} style={{flex:1,padding:'11px',borderRadius:9,border:'1px solid #ECEAE4',background:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',color:'#6B6860'}}>Cancel</button>
              <button onClick={()=>{if(folderForm.name.trim()){addFolder(active.id,folderForm.name,activeFolderId||null);setShowFolderModal(false);}}} disabled={!folderForm.name.trim()} style={{flex:2,padding:'11px',borderRadius:9,border:'none',background:folderForm.name.trim()?'#1A1814':'#ECEAE4',fontSize:13,fontWeight:700,cursor:folderForm.name.trim()?'pointer':'default',color:folderForm.name.trim()?'#fff':'#A8A59E'}}>Create Folder</button>
            </div>
          </div>
        </div>
      )}

      <div className='ch-layout' style={{display:'flex',flex:1,height:'calc(100vh - 56px)'}}>

        <div className='ch-sidebar' style={{width:240,flexShrink:0,background:'#fff',borderRight:'1px solid #ECEAE4',display:'flex',flexDirection:'column',overflowY:'auto'}}>
          <div style={{padding:'16px 14px 8px',flex:1}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#A8A59E',marginBottom:10}}>My Materials</div>
            <button onClick={()=>setActiveFolderId(null)} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'9px 12px',borderRadius:9,border:'none',background:activeFolderId===null?active.color+'20':'transparent',cursor:'pointer',textAlign:'left',marginBottom:2}}>
              <div style={{width:28,height:28,borderRadius:7,background:activeFolderId===null?active.color:'#F0EDE8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}><Icon e="📂" /></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'#1A1814'}}>All Folders</div>
                <div style={{fontSize:11,color:'#A8A59E'}}>{(active.folders||[]).length} folders</div>
              </div>
            </button>
            {(active.folders||[]).filter(f=>!f.parentId).map(folder=>renderSidebarFolder(folder,0))}
            {(active.folders||[]).length===0&&<div style={{fontSize:12,color:'#A8A59E',padding:'8px 12px',lineHeight:1.5}}>No folders yet. Create one to organize your documents.</div>}
          </div>
          <div style={{padding:'12px 14px',borderTop:'1px solid #ECEAE4'}}>
            <button onClick={()=>{if(chConfirmDelete){deleteCourse(active.id);setChConfirmDelete(false);}else{setChConfirmDelete(true);setTimeout(()=>setChConfirmDelete(false),4000);}}} style={{width:'100%',padding:'8px 12px',borderRadius:9,border:'none',background:chConfirmDelete?'rgba(232,93,63,0.1)':'transparent',cursor:'pointer',color:chConfirmDelete?'#E85D3F':'#D8D5CE',fontSize:11,fontWeight:600,textAlign:'left',transition:'all 0.15s'}} onMouseEnter={e=>e.currentTarget.style.color='#E85D3F'} onMouseLeave={e=>{if(!chConfirmDelete)e.currentTarget.style.color='#D8D5CE';}}>{chConfirmDelete?'Tap again to confirm':'Delete course'}</button>
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'28px 28px 80px',minWidth:0}}>
          <div style={{marginBottom:24,textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:active.color,marginBottom:8}}>{active.subject||'Course'}</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:900,color:'#1A1814',margin:'0 0 16px'}}>{active.name}</h2>
            <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
              <button onClick={()=>{setEditCourseForm({name:active.name,subject:active.subject||'',color:active.color});setShowEditCourse(true);}} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:9,padding:'9px 16px',fontSize:13,fontWeight:600,cursor:'pointer',color:'#6B6860'}} onMouseEnter={e=>e.currentTarget.style.borderColor='#1A1814'} onMouseLeave={e=>e.currentTarget.style.borderColor='#ECEAE4'}><Icon e="✏️" /> Edit</button>
              <button onClick={()=>{setFolderForm({name:'',parentId:activeFolderId||null});setShowFolderModal(true);}} style={{background:'#fff',border:'1px solid #ECEAE4',borderRadius:9,padding:'9px 20px',fontSize:13,fontWeight:600,cursor:'pointer',color:'#1A1814',whiteSpace:'nowrap'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#1A1814';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#ECEAE4';}}>+ New Folder</button>
              <button onClick={()=>setShowAddDoc(true)} style={{background:'#1A1814',border:'none',borderRadius:9,padding:'9px 20px',fontSize:13,fontWeight:700,cursor:'pointer',color:'#F7F6F2',whiteSpace:'nowrap'}}>+ Add Document</button>
            </div>
          </div>

          {activeFolderId===null&&(
            <div style={{animation:'ch-fade 0.2s ease'}}>
              {(active.folders||[]).length===0&&(active.documents||[]).length===0?(
                <div style={{textAlign:'center',padding:'60px 20px',background:'#fff',borderRadius:16,border:'1px solid #ECEAE4'}}>
                  <div style={{fontSize:48,marginBottom:12}}><Icon e="📂" /></div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:900,color:'#1A1814',marginBottom:8}}>Start organizing</div>
                  <p style={{fontSize:13,color:'#8C8880',maxWidth:320,margin:'0 auto 20px',lineHeight:1.6}}>Create folders to organize your materials by chapter, week, or topic — then add documents inside them.</p>
                  <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                    <button onClick={()=>{setFolderForm({name:'',parentId:null});setShowFolderModal(true);}} style={{background:'#1A1814',border:'none',borderRadius:9,padding:'10px 20px',fontSize:13,fontWeight:700,cursor:'pointer',color:'#F7F6F2'}}><Icon e="📁" /> Create a Folder</button>
                    <button onClick={()=>setShowAddDoc(true)} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:9,padding:'10px 20px',fontSize:13,fontWeight:600,cursor:'pointer',color:'#6B6860'}}>+ Add Document</button>
                  </div>
                </div>
              ):(
                <>
                  {(active.folders||[]).filter(f=>!f.parentId).length>0&&(
                    <>
                      <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#A8A59E',marginBottom:12}}>Folders</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:28}}>
                        {(active.folders||[]).filter(f=>!f.parentId).map(folder=>(
                          <div key={folder.id} onClick={()=>setActiveFolderId(folder.id)}
                            style={{background:'#fff',border:'1px solid #ECEAE4',borderRadius:14,padding:'20px 16px',cursor:'pointer',transition:'all 0.15s',position:'relative',textAlign:'center'}}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor=active.color;e.currentTarget.style.background=active.color+'08';}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor='#ECEAE4';e.currentTarget.style.background='#fff';}}>
                            <div style={{position:'absolute',top:8,right:8,display:'flex',gap:4}}>
                              <button onClick={e=>{e.stopPropagation();setEditingFolder(folder.id);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'#A8A59E',padding:2}} onMouseEnter={e=>e.currentTarget.style.color=active.color} onMouseLeave={e=>e.currentTarget.style.color='#A8A59E'}><Icon e="✏️" /></button>
                              <button onClick={e=>{e.stopPropagation();const cnt=getDocCount(active.folders||[],active.documents||[],folder.id);if(cnt>0&&!window.confirm(`Delete "${folder.name}" and ${cnt} document(s) inside?`))return;deleteFolderDeep(active.id,folder.id);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:'#D8D5CE',padding:2}} onMouseEnter={e=>e.currentTarget.style.color='#E85D3F'} onMouseLeave={e=>e.currentTarget.style.color='#D8D5CE'}><Icon e="🗑" /></button>
                            </div>
                            <div style={{fontSize:40,marginBottom:8}}><Icon e="📁" /></div>
                            {editingFolder===folder.id
                              ?<input autoFocus value={editingFolder===folder.id?folder.name:''} defaultValue={folder.name}
                                onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter')renameFolder(active.id,folder.id,e.target.value);if(e.key==='Escape')setEditingFolder(null);}}
                                onBlur={e=>renameFolder(active.id,folder.id,e.target.value)}
                                style={{width:'100%',padding:'3px 6px',borderRadius:5,border:`1.5px solid ${active.color}`,fontSize:13,fontWeight:700,color:'#1A1814',outline:'none',background:'#fff',boxSizing:'border-box',marginBottom:4}}/>
                              :<div style={{fontSize:13,fontWeight:700,color:'#1A1814',marginBottom:4,lineHeight:1.3}} onDoubleClick={()=>setEditingFolder(folder.id)}>{folder.name}</div>}
                            <div style={{fontSize:11,color:'#A8A59E'}}>{(active.documents||[]).filter(d=>d.folderId===folder.id).length} docs</div>
                          </div>
                        ))}
                        <div onClick={()=>{setFolderForm({name:'',parentId:null});setShowFolderModal(true);}}
                          style={{background:'transparent',border:'1.5px dashed #ECEAE4',borderRadius:14,padding:'20px 16px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,minHeight:130,transition:'all 0.15s'}}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor=active.color;}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor='#ECEAE4';}}>
                          <div style={{fontSize:28,color:'#C8C4BE'}}>+</div>
                          <div style={{fontSize:12,color:'#A8A59E',fontWeight:600}}>New Folder</div>
                        </div>
                      </div>
                    </>
                  )}
                  {(active.documents||[]).filter(d=>!d.folderId).length>0&&(
                    <>
                      <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#A8A59E',marginBottom:12}}>Unfiled Documents</div>
                      <div style={{background:'#fff',border:'1px solid #ECEAE4',borderRadius:14,overflow:'hidden'}}>
                        {(active.documents||[]).filter(d=>!d.folderId).map((d,i,arr)=>(
                          <div key={d.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:i<arr.length-1?'1px solid #F0EDE8':'none',transition:'background 0.15s'}}
                            onMouseEnter={e=>e.currentTarget.style.background='#F7F6F2'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                            <div style={{width:36,height:36,borderRadius:9,background:'#F0EDE8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}><Icon e="📄" /></div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:'flex',alignItems:'center',gap:6}}>
                                {editingDoc===d.id
                                  ?<input autoFocus defaultValue={d.name}
                                    onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter'){renameDoc(active.id,d.id,e.target.value);setEditingDoc(null);}if(e.key==='Escape')setEditingDoc(null);}}
                                    onBlur={e=>{renameDoc(active.id,d.id,e.target.value);setEditingDoc(null);}}
                                    style={{flex:1,padding:'3px 8px',borderRadius:6,border:`1.5px solid ${active.color}`,fontSize:13,fontWeight:600,color:'#1A1814',outline:'none',background:'#fff',boxSizing:'border-box'}}/>
                                  :<div style={{fontSize:13,fontWeight:600,color:'#1A1814',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}} onDoubleClick={()=>setEditingDoc(d.id)} title="Double-click to rename">{d.name}</div>}
                                <button onClick={()=>setEditingDoc(id=>id===d.id?null:d.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'#C8C4BE',padding:'0 2px',flexShrink:0}} title="Rename"><Icon e="✏️" /></button>
                              </div>
                              <div style={{fontSize:11,color:'#A8A59E'}}>{(d.content||'').split(/\s+/).filter(Boolean).length} words</div>
                            </div>
                            {(active.folders||[]).length>0&&<select onChange={e=>{if(e.target.value)assignDocToFolder(active.id,d.id,e.target.value);}} defaultValue="" style={{padding:'4px 8px',borderRadius:6,border:'1px solid #ECEAE4',background:'#fff',fontSize:11,color:'#6B6860',cursor:'pointer'}}><option value="">Move to folder…</option>{(active.folders||[]).filter(f=>!f.parentId).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>}
                            <button onClick={()=>updateCourse(active.id,{documents:(active.documents||[]).filter(x=>x.id!==d.id)})} style={{background:'none',border:'none',cursor:'pointer',fontSize:14,color:'#D8D5CE',flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.color='#E85D3F'} onMouseLeave={e=>e.currentTarget.style.color='#D8D5CE'}>✕</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {activeFolderId!==null&&(()=>{
            const folder=(active.folders||[]).find(f=>f.id===activeFolderId);
            const folderDocs=(active.documents||[]).filter(d=>d.folderId===activeFolderId);
            const subFolders=(active.folders||[]).filter(f=>f.parentId===activeFolderId);
            return(
              <div style={{animation:'ch-fade 0.2s ease'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
                  <button onClick={()=>setActiveFolderId(null)} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:7,padding:'5px 12px',fontSize:12,cursor:'pointer',color:'#8C8880'}} onMouseEnter={e=>e.currentTarget.style.borderColor='#1A1814'} onMouseLeave={e=>e.currentTarget.style.borderColor='#ECEAE4'}>← All Folders</button>
                  <div style={{width:32,height:32,borderRadius:8,background:active.color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}><Icon e="📁" /></div>
                  {editingFolder===activeFolderId
                    ?<input autoFocus defaultValue={folder?.name}
                        onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter'){renameFolder(active.id,activeFolderId,e.target.value);setEditingFolder(null);}if(e.key==='Escape')setEditingFolder(null);}}
                        onBlur={e=>{renameFolder(active.id,activeFolderId,e.target.value);setEditingFolder(null);}}
                        style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:'#1A1814',border:'none',borderBottom:`2px solid ${active.color}`,outline:'none',background:'transparent',minWidth:120}}/>
                    :<span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:'#1A1814',cursor:'pointer'}} onDoubleClick={()=>setEditingFolder(activeFolderId)} title="Double-click to rename">{folder?.name}</span>}
                  <button onClick={()=>setEditingFolder(ef=>ef===activeFolderId?null:activeFolderId)} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'#A8A59E',padding:'2px 4px'}} title="Rename folder"><Icon e="✏️" /></button>
                </div>
                {subFolders.length===0&&folderDocs.length===0?(
                  <div style={{textAlign:'center',padding:'50px 20px',background:'#fff',borderRadius:16,border:'1px solid #ECEAE4'}}>
                    <div style={{fontSize:40,marginBottom:10}}><Icon e="📂" /></div>
                    <div style={{fontSize:15,fontWeight:700,color:'#1A1814',marginBottom:6}}>This folder is empty</div>
                    <p style={{fontSize:13,color:'#8C8880',marginBottom:16}}>Use the <strong>New Folder</strong> tile or <strong>+ Add Document</strong> button above to add content.</p>
                  </div>
                ):(
                  <>
                    {subFolders.length>0&&(<>
                      <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#A8A59E',marginBottom:12}}>Subfolders</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:12,marginBottom:24}}>
                        {subFolders.map(sub=>(
                          <div key={sub.id} style={{background:'#fff',border:'1px solid #ECEAE4',borderRadius:14,padding:'18px 16px',textAlign:'center',transition:'all 0.15s',position:'relative'}}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor=active.color;e.currentTarget.style.background=active.color+'08';}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor='#ECEAE4';e.currentTarget.style.background='#fff';}}>
                            <div onClick={()=>setActiveFolderId(sub.id)} style={{cursor:'pointer'}}>
                              <div style={{fontSize:32,marginBottom:8}}><Icon e="📁" /></div>
                              <div style={{fontSize:13,fontWeight:700,color:'#1A1814',marginBottom:3}}>{sub.name}</div>
                              <div style={{fontSize:11,color:'#A8A59E'}}>{getDocCount(active.folders||[],active.documents||[],sub.id)} docs</div>
                            </div>
                            <div style={{display:'flex',gap:6,justifyContent:'center',marginTop:8,position:'relative'}}>
                              <button onClick={e=>{e.stopPropagation();setSendToMenu(sm=>sm?.id===sub.id?null:{type:'folder',id:sub.id});}} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:6,padding:'3px 8px',cursor:'pointer',fontSize:10,fontWeight:600,color:'#6B6860'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=active.color;}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#ECEAE4';}}>Send ↗</button>
                              <button onClick={e=>{e.stopPropagation();if(window.confirm('Delete "'+sub.name+'" and all its contents?'))deleteFolderDeep(active.id,sub.id);}} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:6,padding:'3px 8px',cursor:'pointer',fontSize:10,fontWeight:600,color:'#D8D5CE'}} onMouseEnter={e=>e.currentTarget.style.color='#E85D3F'} onMouseLeave={e=>e.currentTarget.style.color='#D8D5CE'}><Icon e="🗑" /></button>
                              {sendToMenu?.id===sub.id&&renderSendToDropdown("folder",sub.id)}
                            </div>
                          </div>
                        ))}
                        {/* New Subfolder tile */}
                        <div onClick={()=>{setFolderForm({name:'',parentId:activeFolderId});setShowFolderModal(true);}}
                          style={{background:'transparent',border:'2px dashed #ECEAE4',borderRadius:14,padding:'18px 16px',textAlign:'center',cursor:'pointer',transition:'all 0.15s',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:110}}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor=active.color;e.currentTarget.style.background=active.color+'08';}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor='#ECEAE4';e.currentTarget.style.background='transparent';}}>
                          <div style={{fontSize:28,marginBottom:8,color:'#C8C4BE'}}>+</div>
                          <div style={{fontSize:12,fontWeight:600,color:'#A8A59E'}}>New Folder</div>
                        </div>
                      </div>
                    </>)}
                    {folderDocs.length>0&&(<>
                      <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#A8A59E',marginBottom:12}}>Documents</div>
                      <div style={{background:'#fff',border:'1px solid #ECEAE4',borderRadius:14,overflow:'hidden',marginBottom:24}}>
                        {folderDocs.map((d,i)=>(
                          <div key={d.id} style={{borderBottom:i<folderDocs.length-1?'1px solid #F0EDE8':'none'}}>
                            <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',transition:'background 0.15s'}}
                              onMouseEnter={e=>e.currentTarget.style.background='#F7F6F2'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                              <div style={{width:36,height:36,borderRadius:9,background:active.color+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}><Icon e="📄" /></div>
                              <div style={{flex:1,minWidth:0}}>
                                {editingDoc===d.id
                                  ?<input autoFocus defaultValue={d.name} id={`doc-rename-${d.id}`}
                                      onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter'){renameDoc(active.id,d.id,e.target.value||d.name);setEditingDoc(null);}if(e.key==='Escape')setEditingDoc(null);}}
                                      style={{width:'100%',padding:'2px 6px',borderRadius:6,border:`1.5px solid ${active.color}`,fontSize:13,fontWeight:600,color:'#1A1814',outline:'none',background:'#fff',boxSizing:'border-box'}}/>
                                  :<div style={{fontSize:13,fontWeight:600,color:'#1A1814',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:'pointer'}} onDoubleClick={()=>setEditingDoc(d.id)} title="Double-click to rename">{d.name}</div>}
                                <div style={{fontSize:11,color:'#A8A59E'}}>{(d.content||'').split(/\s+/).filter(Boolean).length} words</div>
                              </div>
                              {editingDoc===d.id
                                ?<button onMouseDown={e=>{e.preventDefault();const inp=document.getElementById(`doc-rename-${d.id}`);if(inp)renameDoc(active.id,d.id,inp.value||d.name);setEditingDoc(null);}} style={{background:active.color,border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:11,fontWeight:700,color:'#1A1814',flexShrink:0}}>Save</button>
                                :<button onClick={()=>setEditingDoc(d.id)} style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:'#C8C4BE',flexShrink:0,padding:'0 2px'}} title="Rename"><Icon e="✏️" /></button>}
                              <button onClick={()=>setExpandedDoc(expandedDoc===d.id?null:d.id)} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:6,padding:'4px 10px',cursor:'pointer',color:'#8C8880',fontSize:11,fontWeight:600,whiteSpace:'nowrap',flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.borderColor=active.color;e.currentTarget.style.color=active.color;}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#ECEAE4';e.currentTarget.style.color='#8C8880';}}>{expandedDoc===d.id?'▲ Hide':'▼ View'}</button>
                              <div style={{position:'relative',flexShrink:0}}>
                                <button onClick={()=>setSendToMenu(sm=>sm?.id===d.id?null:{type:'doc',id:d.id})} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:11,fontWeight:600,color:'#6B6860'}} onMouseEnter={e=>{e.currentTarget.style.borderColor=active.color;e.currentTarget.style.color=active.color;}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#ECEAE4';e.currentTarget.style.color='#6B6860';}}>Send ↗</button>
                                {sendToMenu?.id===d.id&&renderSendToDropdown("doc",d.id)}
                              </div>
                              <button onClick={()=>updateCourse(active.id,{documents:(active.documents||[]).filter(x=>x.id!==d.id)})} style={{background:'none',border:'none',cursor:'pointer',fontSize:14,color:'#D8D5CE',flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.color='#E85D3F'} onMouseLeave={e=>e.currentTarget.style.color='#D8D5CE'}>✕</button>
                            </div>
                            {expandedDoc===d.id&&(
                              <div style={{padding:'0 16px 16px',borderTop:'1px solid #F0EDE8',background:'#FAFAF8'}}>
                                <textarea value={d.content||''} onChange={e=>{const updated=(active.documents||[]).map(x=>x.id===d.id?{...x,content:e.target.value}:x);updateCourse(active.id,{documents:updated});}} onKeyDown={e=>e.stopPropagation()} style={{width:'100%',minHeight:200,padding:'12px',border:'1px solid #ECEAE4',borderRadius:8,fontSize:12,color:'#1A1814',resize:'vertical',outline:'none',background:'#fff',lineHeight:1.6,boxSizing:'border-box',fontFamily:"'DM Sans',sans-serif",marginTop:12}} onFocus={e=>e.target.style.borderColor=active.color} onBlur={e=>e.target.style.borderColor='#ECEAE4'}/>
                                <div style={{fontSize:11,color:'#A8A59E',marginTop:6,textAlign:'right'}}>Changes save automatically</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>)}
                  </>
                )}
              </div>
            );
          })()}

          <div style={{marginTop:32,background:'#fff',border:'1px solid #ECEAE4',borderRadius:16,padding:'22px'}}>
            <div style={{fontSize:13,fontWeight:700,color:'#1A1814',marginBottom:14}}>Generate study tools</div>
            {errMsg&&<div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12,color:'#E85D3F',display:'flex',justifyContent:'space-between'}}>{errMsg}<button onClick={()=>setErrMsg('')} style={{background:'none',border:'none',cursor:'pointer',color:'#E85D3F',fontSize:14}}>✕</button></div>}
            {genProgress&&<div style={{fontSize:12,color:active.color,marginBottom:10,fontWeight:600}}>{genProgress}</div>}
            {genResult?.type==='cards'&&<div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#166534'}}>✓ Created {genResult.count} decks · {genResult.total} cards! <button onClick={()=>launchApp('flashcards')} style={{marginLeft:6,background:'none',border:'none',cursor:'pointer',color:'#166534',fontWeight:700,textDecoration:'underline',fontSize:12}}>Open Flash Cards →</button></div>}
            {genResult?.type==='send-cards'&&<div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#166534',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>✓ "{genResult.name}" → {genResult.count} flashcards created!</span><button onClick={()=>launchApp('flashcards')} style={{background:'none',border:'none',cursor:'pointer',color:'#166534',fontWeight:700,textDecoration:'underline',fontSize:12}}>Open →</button></div>}
            {genResult?.type==='send-notes'&&<div style={{background:'#FFF9E6',border:'1px solid #F0D080',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#8B6914',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>✓ "{genResult.name}" sent to Notes!</span><button onClick={()=>launchApp('notes')} style={{background:'none',border:'none',cursor:'pointer',color:'#8B6914',fontWeight:700,textDecoration:'underline',fontSize:12}}>Open →</button></div>}
            {genResult?.type==='error'&&<div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#E85D3F'}}>{genResult.msg}</div>}
            {sendingTo&&<div style={{background:'#EEF2FF',border:'1px solid #C7D2FE',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#4338CA'}}><Icon e="⏳" /> Sending to {sendingTo}…</div>}
            {genResult?.type==='map'&&<div style={{background:'#FFF5F7',border:'1px solid #F0A8C0',borderRadius:8,padding:'8px 12px',marginBottom:10,fontSize:12,color:'#9B1446'}}>✓ Brain map created! <button onClick={()=>launchApp('brainmap')} style={{marginLeft:6,background:'none',border:'none',cursor:'pointer',color:'#9B1446',fontWeight:700,textDecoration:'underline',fontSize:12}}>Open Brain Map →</button></div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <button onClick={generateFlashCards} disabled={generating==='cards'} style={{padding:'12px',borderRadius:10,border:'none',background:active.color,fontSize:13,fontWeight:700,cursor:'pointer',color:'#1A1814',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                {generating==='cards'?<><span style={{width:12,height:12,border:'2px solid rgba(26,24,20,0.3)',borderTopColor:'#1A1814',borderRadius:'50%',animation:'qbSpin 0.6s linear infinite',display:'inline-block'}}/>{genProgress||'Generating…'}</>:<>🃏 Generate Flash Cards</>}
              </button>
              <button onClick={generateBrainMap} disabled={generating==='map'||!(active.documents||[]).length} style={{padding:'12px',borderRadius:10,border:'none',background:(active.documents||[]).length?'#F0A8C0':'#ECEAE4',fontSize:13,fontWeight:700,cursor:(active.documents||[]).length?'pointer':'default',color:(active.documents||[]).length?'#9B1446':'#A8A59E',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                {generating==='map'?<><span style={{width:12,height:12,border:'2px solid rgba(155,20,70,0.3)',borderTopColor:'#9B1446',borderRadius:'50%',animation:'qbSpin 0.6s linear infinite',display:'inline-block'}}/>{genProgress||'Generating…'}</>:<><Icon e="🧠" /> Generate Brain Map</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",background:'#F7F6F2',minHeight:'100vh',color:'#1A1814'}}>
      <style>{`@keyframes ch-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {chMenuOpen&&<div onClick={()=>setChMenuOpen(false)} style={{position:'fixed',inset:0,zIndex:150,background:'rgba(0,0,0,0.3)',backdropFilter:'blur(4px)'}}/>}
      <div style={{position:'fixed',left:0,top:0,bottom:0,width:264,zIndex:151,background:'#fff',borderRight:'1px solid #ECEAE4',transform:chMenuOpen?'translateX(0)':'translateX(-100%)',transition:'transform 0.3s cubic-bezier(0.16,1,0.3,1)',padding:'18px 14px',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,paddingBottom:10,borderBottom:'1px solid #ECEAE4'}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:800,color:'#166534'}}>Course Hub</span>
          <button onClick={()=>setChMenuOpen(false)} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:5,width:26,height:26,cursor:'pointer',fontSize:12,color:'#8C8880',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <button onClick={()=>{setView('home');setActive(null);setChMenuOpen(false);setExpandedFolders({});}}
          style={{display:'block',width:'100%',padding:'9px 12px',borderRadius:9,border:`1.5px solid ${view==='home'?CH:'#ECEAE4'}`,background:view==='home'?CH+'20':'#fff',fontSize:13,fontWeight:700,cursor:'pointer',color:'#166534',textAlign:'left',marginBottom:10}}>
          ◎ All Courses {courses.length>0&&`(${courses.length})`}
        </button>
        {courses.length>0&&(<>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#A8A59E',marginBottom:6}}>My Courses</div>
          {courses.map(course=>(
            <div key={course.id} style={{marginBottom:4}}>
              <button onClick={()=>{setActive(course);setView('course');setChMenuOpen(false);setExpandedFolders(ef=>({...ef,[course.id]:!ef[course.id]}));}}
                style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'9px 12px',borderRadius:9,border:`1.5px solid ${active?.id===course.id?course.color:'#ECEAE4'}`,background:active?.id===course.id?course.color+'15':'#fff',fontSize:12,fontWeight:700,cursor:'pointer',color:'#1A1814',textAlign:'left',transition:'all 0.15s'}}>
                <div style={{width:10,height:10,borderRadius:'50%',background:course.color,flexShrink:0}}/>
                <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{course.name}</span>
                <span style={{fontSize:10,color:'#A8A59E',flexShrink:0}}>{expandedFolders[course.id]?'▲':'▼'}</span>
              </button>
              {expandedFolders[course.id]&&(
                <div style={{marginLeft:14,marginTop:3,borderLeft:'2px solid #ECEAE4',paddingLeft:10}}>
                  {(course.folders||[]).filter(f=>!f.parentId).map(folder=>(
                    <div key={folder.id}>
                      <div style={{fontSize:11,fontWeight:700,color:'#3A3530',padding:'4px 6px',borderRadius:6,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}
                        onClick={()=>navigateTo(course,'course')}>
                        <Icon e="📁" /> {folder.name}
                      </div>
                      {(course.folders||[]).filter(sf=>sf.parentId===folder.id).map(sub=>(
                        <div key={sub.id} style={{fontSize:11,color:'#6B6860',padding:'3px 6px 3px 18px',cursor:'pointer'}}
                          onClick={()=>navigateTo(course,'course')}>
                          <Icon e="📁" /> {sub.name}
                        </div>
                      ))}
                      {(course.documents||[]).filter(d=>d.folderId===folder.id).map(doc=>(
                        <div key={doc.id} style={{fontSize:11,color:'#6B6860',padding:'3px 6px 3px 18px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          <Icon e="📄" /> {doc.name}
                        </div>
                      ))}
                    </div>
                  ))}
                  {(course.documents||[]).filter(d=>!d.folderId).length>0&&(
                    <div>
                      <div style={{fontSize:10,color:'#A8A59E',padding:'4px 6px',fontWeight:600}}>Uncategorized</div>
                      {(course.documents||[]).filter(d=>!d.folderId).map(doc=>(
                        <div key={doc.id} style={{fontSize:11,color:'#6B6860',padding:'3px 6px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          <Icon e="📄" /> {doc.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </>)}
        <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid #ECEAE4'}}>
          <button onClick={()=>{setShowCreate(true);setChMenuOpen(false);}}
            style={{display:'block',width:'100%',padding:'9px 12px',borderRadius:9,border:'none',background:'#1A1814',fontSize:13,fontWeight:700,cursor:'pointer',color:'#F7F6F2',textAlign:'center'}}>
            + New Course
          </button>
        </div>
      </div>
      <nav style={{position:'sticky',top:0,zIndex:100,height:56,background:'#fff',borderBottom:'1px solid #ECEAE4',display:'flex',alignItems:'center',padding:'0 16px',gap:10}}>
        <button onClick={()=>setChMenuOpen(o=>!o)} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:7,width:34,height:34,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.borderColor=CH} onMouseLeave={e=>e.currentTarget.style.borderColor='#ECEAE4'}>
          <div style={{width:13,height:1.5,background:'#6B6860',borderRadius:1}}/><div style={{width:9,height:1.5,background:'#6B6860',borderRadius:1,alignSelf:'flex-start',marginLeft:2}}/><div style={{width:13,height:1.5,background:'#6B6860',borderRadius:1}}/>
        </button>
        <button onClick={onBack} style={{background:'none',border:'1px solid #ECEAE4',borderRadius:7,padding:'5px 12px',fontSize:12,cursor:'pointer',color:'#8C8880'}}>← Galaxy</button>
        <div style={{width:1,height:16,background:'#ECEAE4',flexShrink:0}}/>
        <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:28,height:28,borderRadius:7,background:CH,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>◎</div><span style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:800,color:'#1A1814'}}><span style={{color:'#166534'}}>Ace It</span> Course Hub</span></div>
        <div style={{marginLeft:'auto'}}>{!user&&<button onClick={()=>openAuth('login')} style={{background:CH,border:'none',borderRadius:7,padding:'7px 16px',fontSize:12,fontWeight:700,cursor:'pointer',color:'#1A1814'}}>Log In</button>}</div>
      </nav>
      {/* ── HERO ── */}
      <div style={{background:'#1A1814',padding:'64px 24px 48px',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,opacity:0.04,backgroundImage:'radial-gradient(circle at 20% 50%, #6ED9B8 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6ED9B8 0%, transparent 40%)'}}/>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(110,217,184,0.15)',border:'1px solid rgba(110,217,184,0.3)',borderRadius:20,padding:'5px 16px',fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:CH,marginBottom:20}}>◎ ACE IT COURSE HUB</div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:'clamp(32px,5vw,52px)',fontWeight:900,color:'#F7F6F2',lineHeight:1.1,marginBottom:16,letterSpacing:-1}}>
            <span style={{color:CH}}>Ace It</span> Course Hub
          </h1>
          <p style={{fontSize:15,color:'#9A9690',maxWidth:480,margin:'0 auto 32px',lineHeight:1.7}}>Upload your course materials once — get flash cards, brain maps, and study tools organized automatically.</p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={()=>setShowCreate(true)} style={{background:CH,border:'none',borderRadius:9,padding:'12px 28px',fontSize:14,fontWeight:700,cursor:'pointer',color:'#1A1814'}}>+ Create a Course</button>
            {courses.length>0&&<button onClick={()=>{if(courses.length===1){setActive(courses[0]);setView('course');}else setChMenuOpen(true);}} style={{background:'none',border:'1px solid rgba(255,255,255,0.2)',borderRadius:9,padding:'12px 28px',fontSize:14,fontWeight:600,cursor:'pointer',color:'#F7F6F2'}}>Browse My Courses</button>}
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{background:'#222',borderBottom:'1px solid #333',display:'grid',gridTemplateColumns:'repeat(4,1fr)'}}>
        {[['Courses',courses.length],['Documents',courses.reduce((a,c)=>a+(c.documents?.length||0),0)],['Flash Decks',courses.reduce((a,c)=>a+(c.flashDeckIds?.length||0),0)],['Brain Maps',courses.reduce((a,c)=>a+(c.brainMapIds?.length||0),0)]].map(([label,val])=>(
          <div key={label} style={{padding:'18px 24px',textAlign:'center',borderRight:'1px solid #333'}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,color:'#F7F6F2'}}>{val}</div>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#6B6860',marginTop:2}}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── COURSES ── */}
      <div style={{maxWidth:960,margin:'0 auto',padding:'40px 24px 80px',animation:'ch-fade 0.3s ease'}}>
        {courses.length===0?(
          <div style={{textAlign:'center',padding:'60px 20px'}}>
            <div style={{fontSize:52,marginBottom:16}}><Icon e="📚" /></div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,color:'#1A1814',marginBottom:8}}>No courses yet</h2>
            <p style={{fontSize:14,color:'#8C8880',marginBottom:24,maxWidth:340,margin:'0 auto 24px',lineHeight:1.6}}>Create your first course to start organizing your study materials.</p>
            <button onClick={()=>setShowCreate(true)} style={{background:'#1A1814',border:'none',borderRadius:9,padding:'12px 28px',fontSize:14,fontWeight:700,cursor:'pointer',color:'#F7F6F2'}}>+ Create a Course</button>
          </div>
        ):(
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:'#1A1814'}}>My Courses</h2>
              <button onClick={()=>setShowCreate(true)} style={{background:CH,border:'none',borderRadius:8,padding:'8px 18px',fontSize:12,fontWeight:700,cursor:'pointer',color:'#1A1814'}}>+ New Course</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
              {courses.map(course=>(
                <div key={course.id} onClick={()=>{setActive(course);setView('course');}}
                  style={{background:'#fff',borderRadius:14,border:'1px solid #ECEAE4',borderTop:`4px solid ${course.color}`,cursor:'pointer',transition:'all 0.2s',padding:'20px 22px'}}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.08)';e.currentTarget.style.transform='translateY(-2px)';}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='none';}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:12}}>
                    <div style={{width:40,height:40,borderRadius:10,background:course.color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}><Icon e="📚" /></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:15,fontWeight:800,fontFamily:"'Playfair Display',serif",color:'#1A1814',lineHeight:1.3,marginBottom:2}}>{course.name}</div>
                      {course.subject&&<div style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:course.color}}>{course.subject}</div>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:12,paddingTop:12,borderTop:'1px solid #F0EDE8'}}>
                    <span style={{fontSize:12,color:'#8C8880'}}><Icon e="📄" /> {(course.documents||[]).length} docs</span>
                    <span style={{fontSize:12,color:'#8C8880'}}>🃏 {(course.flashDeckIds||[]).length} decks</span>
                    <span style={{fontSize:12,color:'#8C8880'}}><Icon e="🧠" /> {(course.brainMapIds||[]).length} maps</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {courses.length===0&&(<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:40}}>{[['1','Upload','Paste notes, syllabus, or textbook chapters.',<Icon e="📄" />],['2','Generate','AI creates flash cards and brain maps from your content.','✦'],['3','Study','Use your generated content across all apps.',<Icon e="🚀" />]].map(([n,title,desc,icon])=>(<div key={n} style={{background:'#fff',border:'1.5px solid #ECEAE4',borderRadius:14,padding:'20px',textAlign:'center'}}><div style={{width:40,height:40,borderRadius:'50%',background:CH+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,margin:'0 auto 12px'}}>{icon}</div><div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#166534',marginBottom:6}}>Step {n}</div><div style={{fontSize:14,fontWeight:700,color:'#1A1814',marginBottom:6}}>{title}</div><div style={{fontSize:12,color:'#6B6860',lineHeight:1.6}}>{desc}</div></div>))}</div>)}

      </div>
      {showCreate&&(<div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(8px)'}} onClick={()=>setShowCreate(false)}><div style={{background:'#fff',borderRadius:18,padding:'36px',width:440,maxWidth:'94vw',animation:'ch-fade 0.2s ease'}} onClick={e=>e.stopPropagation()}><div style={{fontSize:28,marginBottom:14}}>◎</div><h3 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:'#1A1814',marginBottom:6}}>Create a Course</h3><p style={{fontSize:13,color:'#8C8880',marginBottom:24,lineHeight:1.6}}>Give your course a name. You will add documents after.</p><input value={createForm.name} onChange={e=>setCreateForm(f=>({...f,name:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter')createCourse();e.stopPropagation();}} placeholder="Course name e.g. Biology 101" style={{width:'100%',padding:'12px 14px',border:'1.5px solid #ECEAE4',borderRadius:9,fontSize:14,color:'#1A1814',background:'#fff',fontFamily:"'DM Sans',sans-serif",outline:'none',marginBottom:12,boxSizing:'border-box'}} onFocus={e=>e.target.style.borderColor='#1A1814'} onBlur={e=>e.target.style.borderColor='#ECEAE4'}/><input value={createForm.subject} onChange={e=>setCreateForm(f=>({...f,subject:e.target.value}))} placeholder="Subject e.g. Biology, Math, History" style={{width:'100%',padding:'12px 14px',border:'1.5px solid #ECEAE4',borderRadius:9,fontSize:14,color:'#1A1814',background:'#fff',fontFamily:"'DM Sans',sans-serif",outline:'none',marginBottom:12,boxSizing:'border-box'}} onFocus={e=>e.target.style.borderColor='#1A1814'} onBlur={e=>e.target.style.borderColor='#ECEAE4'}/><textarea value={createForm.description} onChange={e=>setCreateForm(f=>({...f,description:e.target.value}))} placeholder="Description (optional)" style={{width:'100%',padding:'12px 14px',border:'1.5px solid #ECEAE4',borderRadius:9,fontSize:13,color:'#1A1814',background:'#fff',fontFamily:"'DM Sans',sans-serif",outline:'none',resize:'none',minHeight:72,marginBottom:16,boxSizing:'border-box'}} onFocus={e=>e.target.style.borderColor='#1A1814'} onBlur={e=>e.target.style.borderColor='#ECEAE4'}/><div style={{marginBottom:20}}><div style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#8C8880',marginBottom:8}}>Color</div><div style={{display:'flex',gap:8}}>{PALETTE.map(col=>(<button key={col} onClick={()=>setCreateForm(f=>({...f,color:col}))} style={{width:28,height:28,borderRadius:'50%',background:col,border:`3px solid ${createForm.color===col?'#1A1814':'transparent'}`,cursor:'pointer'}}/>))}</div></div><div style={{display:'flex',gap:10}}><button onClick={()=>setShowCreate(false)} style={{flex:1,padding:'11px',borderRadius:9,border:'1px solid #ECEAE4',background:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',color:'#8C8880'}}>Cancel</button><button onClick={createCourse} disabled={!createForm.name.trim()} style={{flex:2,padding:'11px',borderRadius:9,border:'none',background:createForm.name.trim()?'#1A1814':'#ECEAE4',fontSize:13,fontWeight:700,cursor:createForm.name.trim()?'pointer':'default',color:createForm.name.trim()?'#F7F6F2':'#A8A59E'}}>Create Course →</button></div></div></div>)}
    </div>
  );
}

export default CourseHubApp;
