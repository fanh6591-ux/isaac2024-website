(() => {
  'use strict';
  const root = document.querySelector('[data-value-explorer]');
  if (!root || root.dataset.ready) return;
  const M = window.IsaacExplorerModel, stories = window.IsaacExplorerStories;
  if (!M || !stories) return;
  root.dataset.ready = 'true';
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  // Open with a draggable entry near 15% of the plot, at the reference X/Y scales.
  const initialExtension=7.875;
  const state={story:'investment',highlightedCurve:'total',time:60,hoverTime:null,pinned:true,dragging:false,month:null,playing:false,playbackStatus:'idle',observationOrigin:null,revealFullProjection:false,extend:initialExtension,teams:false,risk:false,loss:20,scale:1/.92,scenario:'base',marketScenario:'tight',quoteShape:'market',components:false,reduced:media.matches,assumptions:{...M.defaults}};
  const curveForStory={investment:'total',fde:'fde',return:'return',safety:'return'};
  const targets = { fde:'fde-pricing', return:'return-acceptance', investment:'project-investment', safety:'risk-safety' };
  const preferred = { fde:'technical', return:'process', investment:'entry-method', safety:'reliability' };
  const resolveFragment = (id,fid) => {
    const resolved=stories[id].aliases?.[fid] || fid;
    return stories[id].fragments.some(f=>f.id===resolved)?resolved:stories[id].fragments[0].id;
  };
  const fragment = Object.fromEntries(Object.keys(targets).map(id=>[id,resolveFragment(id,preferred[id])]));
  let chart = null, resizeObserver = null, hoverFrame = 0, pendingHover = null;
  let curveClickFrame=0, pendingCurveClick=null, pointerGesture=null, dragFrame=0, suppressChartClickUntil=0, readerSpyFrame=0;
  let wideFrame=0, playbackFrame=0, playbackLast=null, previousOverflow='', previousFocus=null;
  let wheelFrame=0, wheelX=1, wheelY=1, wheelAnchorX=null;
  let preloadHandle=null,preloadKind=null,pendingPreload=null;
  const create = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };
  const button = (label, fn, cls) => { const b = create('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const compact = () => $('[data-chart]').clientWidth < 500;
  function announce(text) { $('[data-live]').textContent = text; }

  function buildReadingSection(id,f){
    const section=create('section','ve-fragment-section');
    section.dataset.fragmentSection=f.id;
    section.id=`ve-section-${id}-${f.id}`;
    section.setAttribute('aria-labelledby',`${section.id}-title`);
    const heading=create('h4','',f.title);heading.id=`${section.id}-title`;heading.tabIndex=-1;
    section.append(heading);
    section.dataset.readingSource=`${id}/${f.id}`;
    let list=null;
    f.paragraphs.forEach(paragraph=>{
      if(paragraph.startsWith('- ')){
        if(!list){list=create('ul');section.append(list);}
        list.append(create('li','',paragraph.slice(2)));
      }else{list=null;section.append(create('p','',paragraph));}
    });
    return section;
  }

  function buildPanels() {
    Object.keys(targets).forEach(id => {
      const p = $(`[data-panel="${id}"]`), data = stories[id];
      const title = create('h3', '', data.title); title.tabIndex = -1;
      const nav = create('nav', 've-fragment-nav'); nav.setAttribute('aria-label', `${data.title}的段落目录`);
      const dots=create('div','ve-dot-list');
      data.fragments.forEach((f,i)=>{
        const summary=f.preview||f.paragraphs?.find(Boolean)?.slice(0,58)||f.title;
        const dot=button('',()=>selectFragment(id,f.id),'ve-section-dot');
        dot.dataset.fragmentDot=f.id;
        dot.setAttribute('aria-label',`${String(i+1).padStart(2,'0')} / ${String(data.fragments.length).padStart(2,'0')} ${f.title}。${summary}`);
        dot.append(create('span','ve-dot-core'),create('span','ve-dot-short',f.label||f.title));
        const peek=create('span','ve-dot-preview');peek.setAttribute('aria-hidden','true');
        peek.append(create('strong','',f.title),create('span','',summary));dot.append(peek);dots.append(dot);
      });
      nav.append(dots);
      const body = create('div','ve-fragment'); body.dataset.fragmentBody = id;
      body.tabIndex=0;body.setAttribute('role','region');body.setAttribute('aria-label','完整文章');
      data.fragments.forEach(f=>body.append(buildReadingSection(id,f)));
      p.append(title);
      if(data.lead)p.append(create('p','ve-lead',data.lead));
      p.append(nav, body);
      updateFragment(id);
    });
    $('.ve-inspector').addEventListener('scroll',scheduleReaderSpy,{passive:true});
    window.addEventListener('scroll',scheduleReaderSpy,{passive:true});
  }
  function updateFragment(id) {
    const data = stories[id], i = data.fragments.findIndex(f => f.id === fragment[id]);
    const f = data.fragments[i], body = $(`[data-fragment-body="${id}"]`);
    body.dataset.readingSource=$(`[data-panel="${id}"] [data-fragment-section="${f.id}"]`)?.dataset.readingSource||`${id}/${f.id}`;
    $$(`[data-panel="${id}"] [data-fragment-dot]`).forEach(b=>{
      const active=b.dataset.fragmentDot===f.id;
      b.setAttribute('aria-current',active?'step':'false');
    });
  }
  function selectFragment(id, fid, hash=true) {
    cancelCurveClick();
    if(!Object.hasOwn(targets,id))return;
    if(id==='return'&&['waiting','waiting-method','timing-method'].includes(fid)){id='investment';fid='waiting-method';}
    const moved=id==='return'?{depreciation:'entry-method',assets:'assets',models:'assets',strategic:'assets'}[fid]:null;
    if(moved){id='investment';fid=moved;}
    fid=resolveFragment(id,fid);
    if (state.story !== id) choose(id, false);
    fragment[id] = fid;
    updateFragment(id); updateDecomposition();
    $(`[data-panel="${id}"] [data-fragment-section="${fid}"]`)?.scrollIntoView({block:'start',behavior:'auto'});
    if(hash)history.replaceState(null,'',`#${targets[id]}/${fid}`);
    announce(stories[id].fragments.find(f => f.id === fid).title);
  }
  function scheduleReaderSpy(){
    if(readerSpyFrame)return;
    readerSpyFrame=requestAnimationFrame(()=>{readerSpyFrame=0;syncReadingPosition();});
  }
  function syncReadingPosition(){
    const id=state.story,panel=$(`[data-panel="${id}"]`);
    if(!panel||panel.hidden)return;
    const sections=$$(`[data-panel="${id}"] [data-fragment-section]`);
    if(!sections.length)return;
    const inspector=$('.ve-inspector');
    const localScroll=window.innerWidth>960&&!root.classList.contains('is-wide');
    const cutoff=(localScroll?inspector.getBoundingClientRect().top:0)+105;
    let current=sections[0].dataset.fragmentSection;
    for(const section of sections){
      if(section.getBoundingClientRect().top<=cutoff)current=section.dataset.fragmentSection;
      else break;
    }
    if(localScroll&&inspector.scrollTop+inspector.clientHeight>=inspector.scrollHeight-4)current=sections.at(-1).dataset.fragmentSection;
    if(current!==fragment[id]){fragment[id]=current;updateFragment(id);updateDecomposition();}
  }
  function updateDecomposition() {
    const wrap=$('[data-decomposition]');
    if(!wrap.children.length)wrap.append(button('阅读 ↓',()=>revealReader(state.story),'ve-read-on-mobile'));
  }
  function revealReader(id) {
    const panel=$(`[data-panel="${id}"]`);
    if(window.innerWidth<=960||root.classList.contains('is-wide'))panel.scrollIntoView({block:'start',behavior:state.reduced?'auto':'smooth'});
    panel.querySelector('h3').focus({preventScroll:true});
  }
  function revealWideReader(id){if(root.classList.contains('is-wide'))revealReader(id);}
  const fmt=n=>Number(n.toFixed(1)).toLocaleString('zh-CN');
  function setWide(on){
    if(on===root.classList.contains('is-wide'))return;
    if(!on){finishPointerGesture();cancelPreload();stopPlayback();}
    clearHover(false);
    const control=$('[data-wide]');
    if(on){previousOverflow=document.body.style.overflow;previousFocus=document.activeElement;document.body.style.overflow='hidden';}
    root.classList.toggle('is-wide',on);control.setAttribute('aria-pressed',String(on));
    control.title=on?'收起大图':'展开大图';
    control.setAttribute('aria-label',on?'收起大图':'大图模式');
    if(on){root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');control.focus({preventScroll:true});}
    else{root.removeAttribute('role');root.removeAttribute('aria-modal');document.body.style.overflow=previousOverflow;(previousFocus?.isConnected?previousFocus:control).focus({preventScroll:true});}
    if(wideFrame)cancelAnimationFrame(wideFrame);
    wideFrame=requestAnimationFrame(()=>{wideFrame=0;chart?.resize();renderNormal();});
  }
  function updateMonthControls(){
    const duration=M.durationOf(state),month=M.elapsed(state),slider=$('[data-month]');
    slider.max=String(duration);slider.value=String(month);
    slider.setAttribute('aria-valuetext',`入场后第 ${Number(month.toFixed(1))} / ${Number(duration.toFixed(1))} 个月`);
    $('[data-month-label]').textContent=`第 ${Number(month.toFixed(1))} / ${Number(duration.toFixed(1))} 个月`;
    $('[data-phase]').textContent=month>=duration?'观察点':month<6?'初期磨合':month<24?'员工采用':'复用假设';
    const label={idle:'开始推演',running:'暂停推演',paused:'继续推演',completed:'重新推演'}[state.playbackStatus];
    const play=$('[data-play]');play.textContent=label;play.setAttribute('aria-label',label);play.setAttribute('aria-pressed',String(state.playing));
    root.dataset.playback=state.playbackStatus;
  }
  function updateTime(){
    root.dataset.selectedTime=String(state.time);
    root.dataset.pinned=String(state.pinned);
    root.dataset.dragging=String(state.dragging);
    root.dataset.previewTime=Number.isFinite(state.hoverTime)?String(state.hoverTime):'';
    root.dataset.windowExtensions=String(state.extend);
    updateMonthControls();
  }
  function selectMonth(month){
    cancelCurveClick();
    if(!state.pinned)setTime(Number.isFinite(pendingHover)?pendingHover:Number.isFinite(state.hoverTime)?state.hoverTime:state.time);
    stopPlayback();state.revealFullProjection=false;state.month=M.clamp(month,0,M.durationOf(state));
    state.observationOrigin='manual';state.playbackStatus=state.month>=M.durationOf(state)?'completed':'paused';renderMonth();
  }
  let timeNodeLayout='';
  function updateTimeNodes(){
    if(!chart)return;
    const layer=$('[data-time-nodes]'),width=$('[data-chart]').clientWidth||900,height=$('[data-chart]').clientHeight||420;
    const nodes=M.timelineNodes(state),small=compact(),gap=small?48:64;
    const positioned=nodes.map(n=>({...n,pixel:Math.max(28,Math.min(width-28,chart.convertToPixel({xAxisIndex:0},n.x)))})).filter(n=>Number.isFinite(n.pixel));
    const last=positioned.at(-1),shown=[];
    for(const n of positioned){
      if(n===last)continue;
      if((!shown.length||n.pixel-shown.at(-1).pixel>=gap)&&(!last||last.pixel-n.pixel>=gap))shown.push(n);
    }
    if(last)shown.push(last);
    const key=shown.map(n=>`${n.month}:${n.pixel.toFixed(1)}`).join('|')+`|${height}|${small}`;
    if(key!==timeNodeLayout){
      timeNodeLayout=key;layer.replaceChildren();
      for(const n of shown){
        const label=n.month===0?'入场':`${Number(n.month.toFixed(1))}月`;
        const b=button(label,()=>selectMonth(n.month),'ve-time-node');b.dataset.nodeMonth=String(n.month);
        b.title=`入场后 ${Number(n.month.toFixed(1))} 个月`;
        b.setAttribute('aria-label',`查看${b.title}各条曲线的状态`);
        b.style.left=`${n.pixel}px`;b.style.top=`${height-(small?56:88)+7}px`;layer.append(b);
      }
    }
    for(const b of layer.children)b.setAttribute('aria-pressed',String(Math.abs(Number(b.dataset.nodeMonth)-M.elapsed(state))<.1));
  }
  function updateMetrics(){
    const month=M.elapsed(state),duration=M.durationOf(state),v=M.projectAt(month/duration,state);
    $('[data-capacity-label]').textContent=state.risk?'事故后产能价值':'周期产能价值';
    $('[data-metric-investment]').textContent=fmt(v.total);
    for(const id of ['fde','return'])$(`[data-metric-${id}]`).textContent=fmt(v[id]);
    $('[data-metric-period]').textContent=`入场后第 ${Number(month.toFixed(1))} / ${Number(duration.toFixed(1))} 个月 · ${month>=duration-1e-6?'共同观察点':'当前推演位置'}${state.extend>initialExtension+1e-6?' · 延长外推':''}`;
    $('[data-metrics]').dataset.anchor=String(M.anchorOf(state));
    const profit=v.return-v.total,displayProfit=Number(profit.toFixed(1));
    const sign=displayProfit>0?'+':displayProfit<0?'−':'';
    $('[data-comparison-status]').dataset.profitState=displayProfit>0?'positive':displayProfit<0?'negative':'zero';
    $('[data-profit-value]').textContent=`${sign}${fmt(Math.abs(displayProfit))}`;
    $('[data-profit-value]').setAttribute('aria-label',`利润 ${displayProfit<0?'负':''}${fmt(Math.abs(displayProfit))}，按累计产能产值折算`);
  }
  function updateZoomLabel(){
    const x=M.horizontalMaximum(state);
    $('[data-x-scale]').textContent=`X轴 ${Number((210/x).toFixed(2))}×`;
    $('[data-view-scale]').textContent=`Y轴 ${Number((1/state.scale).toFixed(2))}×`;
    $('[data-xzoom="out"]').disabled=x>=1010-1e-6;
    $('[data-xzoom="in"]').disabled=x<=minimumHorizontalMaximum()+1e-6;
    $('[data-zoom="out"]').disabled=state.scale>=8-1e-6;
    $('[data-zoom="in"]').disabled=state.scale<=.25+1e-6;
  }
  function minimumHorizontalMaximum(){
    const selected=M.anchorX({...state,hoverTime:null}),preview=M.anchorX(state);
    // An endpoint at the current edge must not prevent zooming back in.
    // A playhead created solely by zooming out must not become a zoom-in limit.
    const month=M.elapsed(state),duration=M.durationOf(state);
    const observed=state.observationOrigin==='zoom'||state.month===null||month>=duration-1e-6?0:preview+M.spanOf(state)*month/duration;
    return Math.max(160,selected+24,preview+24,observed);
  }
  function zoomAxis(axis,factor,cursorPixel=null){
    if(!Number.isFinite(factor)||factor<=0)return;
    finishPointerGesture();
    cancelPreload();
    if(axis==='x'){
      if(hoverFrame){cancelAnimationFrame(hoverFrame);hoverFrame=0;state.hoverTime=pendingHover;pendingHover=null;}
      const current=M.horizontalMaximum(state);
      const minimum=minimumHorizontalMaximum();
      const next=M.clamp(current*factor,minimum,1010);
      if(Math.abs(next-current)<1e-4)return;
      // Preserve the preview beneath a stationary Shift-wheel pointer.
      const left=chart?.convertToPixel({xAxisIndex:0},0),right=chart?.convertToPixel({xAxisIndex:0},current);
      const fraction=Number.isFinite(cursorPixel)&&Number.isFinite(left)&&Number.isFinite(right)&&right>left&&cursorPixel>=left&&cursorPixel<=right?(cursorPixel-left)/(right-left):null;
      const observed=M.elapsed(state),observedX=M.comparison(state).to[0];
      stopPlayback();cancelCurveClick();
      // Expanding the viewport must not move the observation to its new edge.
      if(!state.pinned&&state.month===null&&next>current){state.month=observed;state.observationOrigin='zoom';state.revealFullProjection=true;}
      state.extend=(next-210)/40;
      if(state.observationOrigin==='zoom'&&next<=observedX+1e-6){state.month=null;state.observationOrigin=null;state.revealFullProjection=false;}
      if(state.playbackStatus==='completed'&&state.month!==null&&M.elapsed(state)<M.durationOf(state)-1e-6)state.playbackStatus='paused';
      if(fraction!==null&&!state.pinned)state.hoverTime=M.selectionAt(next*fraction,state);
      renderAxisZoom();
    }else{
      const next=M.clamp(state.scale*factor,.25,8);
      if(Math.abs(next-state.scale)<1e-5)return;
      state.scale=next;updateZoomLabel();
      const min=M.amountMinimum(state),max=M.amountMaximum(state);
      chart?.setOption({yAxis:{min,max},series:[M.guideSeries(state,max,min)]},{lazyUpdate:false});
      updateEndLinks();
    }
  }
  function chartWheel(event){
    if(event.ctrlKey||event.metaKey)return;
    const raw=event.deltaY||(event.shiftKey?event.deltaX:0);
    if(!Number.isFinite(raw)||raw===0)return;
    event.preventDefault();
    const delta=M.clamp(raw*(event.deltaMode===1?16:event.deltaMode===2?300:1),-240,240);
    if(event.shiftKey){
      wheelX*=Math.exp(delta*.0015);
      const pixel=event.clientX-$('[data-chart]').getBoundingClientRect().left;
      if(Number.isFinite(pixel)&&event.clientX>0)wheelAnchorX=pixel;
    }
    else wheelY*=Math.exp(delta*.0015);
    if(!wheelFrame)wheelFrame=requestAnimationFrame(()=>{
      wheelFrame=0;const x=wheelX,y=wheelY,cursorPixel=wheelAnchorX;wheelX=wheelY=1;wheelAnchorX=null;
      if(x!==1)zoomAxis('x',x,cursorPixel);
      if(y!==1)zoomAxis('y',y);
    });
  }
  function updateAccidentReadout(){
    if(!state.risk)return;
    const event=M.accidentEvent(state);
    $('[data-loss-output]').textContent=`${fmt(event.lossAmount)}（${event.loss}×初始报价）`;
    $('[data-incident-net]').textContent=`${event.toY<0?'−':'+'}${fmt(Math.abs(event.toY))}`;
  }
  const endLinkSpecs=[
    ['investment','各时点报价','investment','entry-method'],
    ['total','累计总投入','investment','entry-method'],
    ['fde','自建 FDE 成本','fde','technical'],
    ['return','累计产能价值','return','process']
  ];
  function updateEndLinks(){
    if(!chart)return;
    updateTimeNodes();
    const layer=$('[data-end-links]'),height=$('[data-chart]').clientHeight||420,width=$('[data-chart]').clientWidth||900;
    if(!layer.children.length){
      for(const [seriesId,label,story,fid] of endLinkSpecs){
        const b=button(`${label} →`,()=>openStory(story,fid));b.dataset.endStory=seriesId;
        b.setAttribute('aria-label',`阅读${label}说明`);
        Object.assign(b.style,{position:'absolute',pointerEvents:'auto',transform:'translateY(-50%)',border:'0',borderRadius:'2px',background:'#050505',padding:'5px 4px',font:'12px "Isaac FAQ Han", "PingFang SC", sans-serif',whiteSpace:'nowrap',cursor:'pointer',textAlign:'left'});
        b.style.color=M.colors[seriesId];layer.append(b);
      }
    }
    const end=M.projectionEnd(state),v=M.projectAt(1,state),market=M.quoteAt(end/M.quoteWidth*100,state);
    const positions=[];
    for(const [seriesId] of endLinkSpecs){
      const b=layer.querySelector(`[data-end-story="${seriesId}"]`);
      const visible=!compact();
      const yValue=seriesId==='investment'?market.investment:v[seriesId];
      const x=chart.convertToPixel({xAxisIndex:0},end),y=chart.convertToPixel({yAxisIndex:0},yValue);
      b.hidden=!visible||!Number.isFinite(x)||!Number.isFinite(y)||!chart.containPixel({gridIndex:0},[x-1,y]);
      if(!b.hidden)positions.push({b,x,y});
    }
    positions.sort((a,b)=>a.y-b.y);
    let previous=-Infinity;
    for(const item of positions){item.top=Math.max(16,item.y,previous+25);previous=item.top;}
    const overflow=(positions.at(-1)?.top||0)-(height-16);
    for(const item of positions){
      item.b.style.left=`${Math.max(4,Math.min(item.x+8,width-(item.b.offsetWidth||100)-4))}px`;
      item.b.style.top=`${Math.max(16,item.top-Math.max(0,overflow))}px`;
    }
  }
  function renderNormal(){updateTime();updateMetrics();updateZoomLabel();updateAccidentReadout();if(chart){chart.setOption(M.normalOption(state,compact()),{notMerge:true});updateEndLinks();}}
  function renderAxisZoom(){updateTime();updateMetrics();updateZoomLabel();updateAccidentReadout();if(chart){chart.setOption(M.normalOption(state,compact()),{lazyUpdate:false});updateEndLinks();}}
  function updatePlotDetails(){
    updateTime();updateMetrics();updateAccidentReadout();
    if(chart){chart.setOption({series:[...M.timeSeries(Number.isFinite(state.hoverTime)?state.hoverTime:M.anchorOf(state),M.amountMaximum(state),state),M.comparisonSeries(state,compact())]},{lazyUpdate:false});updateEndLinks();}
  }
  function stopPlayback(nextStatus=null){
    if(playbackFrame)cancelAnimationFrame(playbackFrame);playbackFrame=0;playbackLast=null;
    const wasPlaying=state.playing;state.playing=false;
    if(nextStatus)state.playbackStatus=nextStatus;
    else if(wasPlaying)state.playbackStatus='paused';
    updateMonthControls();
  }
  function renderMonth(){
    updateMonthControls();updateMetrics();
    if(chart){chart.setOption({series:[...M.progressSeries(state),M.playheadSeries(state),...M.timelineSeries(state),M.currentValuesSeries(state,compact()),M.comparisonSeries(state,compact()),M.differenceAreaSeries(state)]},{lazyUpdate:false});updateEndLinks();}
  }
  function playbackStep(now){
    if(!state.playing)return stopPlayback();
    if(playbackLast!==null){
      let remaining=Math.min(80,Math.max(0,now-playbackLast)),month=M.elapsed(state),duration=M.durationOf(state);
      while(remaining>0&&month<duration){
        const boundary=month<6?Math.min(6,duration):month<24?Math.min(24,duration):duration;
        const speed=month<6?6/2400:month<24?18/3400:Math.max(1,duration-24)/5000;
        const consumed=Math.min(remaining,(boundary-month)/speed);
        if(consumed<1e-6){if(remaining<1e-6)break;month=boundary;continue;}
        month=Math.min(duration,month+consumed*speed);remaining-=consumed;
      }
      state.month=month;
    }
    playbackLast=now;renderMonth();
    if(state.month>=M.durationOf(state)){stopPlayback('completed');announce('推演完成，可拖动月份重新查看。');return;}
    playbackFrame=requestAnimationFrame(playbackStep);
  }
  function clearHover(render=true){
    if(hoverFrame)cancelAnimationFrame(hoverFrame);hoverFrame=0;pendingHover=null;
    const had=Number.isFinite(state.hoverTime);state.hoverTime=null;if(had&&render)updatePlotDetails();
  }
  function setTime(value,render=true){
    const selected=Number(M.clamp(value,0,M.maxSelection(state)).toFixed(2));
    const changed=!state.pinned||selected!==state.time;
    stopPlayback(changed?'idle':null);cancelCurveClick();clearHover(false);
    if(changed){state.month=null;state.observationOrigin=null;state.revealFullProjection=false;}
    const wasPinned=state.pinned;state.time=selected;state.pinned=true;
    if(render){if(wasPinned)updatePlotDetails();else renderNormal();}
  }
  function scheduleHover(value){
    if(state.pinned||pointerGesture)return;
    const next=M.clamp(value,0,M.maxSelection(state));
    if(Number.isFinite(pendingHover)&&Math.abs(next-pendingHover)<.01)return;
    if(!hoverFrame&&Number.isFinite(state.hoverTime)&&Math.abs(next-state.hoverTime)<.01)return;
    pendingHover=next;
    if(!hoverFrame)hoverFrame=requestAnimationFrame(()=>{hoverFrame=0;state.hoverTime=pendingHover;updatePlotDetails();});
  }
  function cancelPreload(){
    if(preloadHandle!==null){
      if(preloadKind==='idle')window.cancelIdleCallback(preloadHandle);
      else window.clearTimeout(preloadHandle);
    }
    preloadHandle=null;preloadKind=null;pendingPreload=null;
  }
  function schedulePreload(value){
    if(!state.pinned||pointerGesture||state.playing||document.hidden)return;
    pendingPreload=value;
    if(preloadHandle!==null)return;
    const run=()=>{
      const selection=pendingPreload;preloadHandle=null;preloadKind=null;pendingPreload=null;
      if(selection!==null&&state.pinned&&!pointerGesture&&!state.playing&&!document.hidden)M.preloadProjection(selection,state);
    };
    if(typeof window.requestIdleCallback==='function'&&typeof window.cancelIdleCallback==='function'){
      preloadKind='idle';preloadHandle=window.requestIdleCallback(run);
    }else{preloadKind='timeout';preloadHandle=window.setTimeout(run,40);}
  }
  function setRisk(on){
    cancelCurveClick();finishPointerGesture();
    state.risk=on;root.dataset.scenario=on?'incident':'normal';
    const control=$('[data-risk]');control.setAttribute('aria-pressed',String(on));
    control.title=on?'取消安全事故':'开启安全事故';$('[data-risk-state]').textContent=on?'取消':'开启';
    $('[data-risk-controls]').hidden=!on;
    updateAccidentReadout();
  }
  // Use the curved segment's screen distance; there is no separate vertical loss line.
  function accidentHit(px,py){
    if(!state.risk||!Number.isFinite(px)||!Number.isFinite(py))return false;
    const path=M.accidentPath(state).map(([x,y])=>[chart.convertToPixel({xAxisIndex:0},x),chart.convertToPixel({yAxisIndex:0},y)]);
    for(let i=1;i<path.length;i++){
      const [ax,ay]=path[i-1],[bx,by]=path[i],dx=bx-ax,dy=by-ay;
      const u=M.clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);
      if(Math.hypot(px-ax-u*dx,py-ay-u*dy)<=30)return true;
    }
    return false;
  }
  function choose(id,hash=true){
    if(!Object.hasOwn(targets,id))return;cancelCurveClick();clearHover(false);
    const wasRisk=state.risk,changed=state.story!==id;state.story=id;root.dataset.story=id;
    state.highlightedCurve=curveForStory[id];root.dataset.highlightedCurve=state.highlightedCurve;
    $$('[data-story]').forEach(b=>{const active=b.dataset.story===id;b.dataset.current=String(active);if(!b.hasAttribute('data-risk'))b.setAttribute('aria-pressed',String(active));});
    $$('[data-panel]').forEach(p=>{p.hidden=p.dataset.panel!==id;});
    if(changed)$('.ve-inspector').scrollTop=0;
    if(id==='safety'&&!wasRisk){setRisk(true);renderNormal();}
    else updatePlotDetails();
    updateDecomposition();
    if(hash)history.replaceState(null,'',`#${targets[id]}`);announce(stories[id].title);
  }
  function highlightCurve(id){
    if(state.highlightedCurve===id)return;
    state.highlightedCurve=id;root.dataset.highlightedCurve=id;
    updatePlotDetails();
  }
  function openStory(id,fid,curve){selectFragment(id,fid);highlightCurve(curve||curveForStory[state.story]);revealWideReader(id);}
  function cancelCurveClick(){if(curveClickFrame)cancelAnimationFrame(curveClickFrame);curveClickFrame=0;pendingCurveClick=null;}
  function commitCurve(id,selection){
    if(!state.pinned){setTime(selection);announce(`已固定本次入场报价 ${fmt(M.quoteAt(state.time,state).investment)}。金线在蓝线上方的区域为浅红色，蓝线在上方的区域为浅绿色。`);}
    if(id==='plot')return;
    if(id==='safety-incident')openStory('safety','reliability');
    else if(['technical','delivery','premium'].includes(id))openStory('investment','market-method');
    else if(id==='existing'||id==='newteam')openStory('fde','reuse');
    else if(id==='investment'||id==='total')openStory('investment','entry-method',id);
    else if(id==='fde')openStory('fde','technical');
    else if(id==='return')openStory('return','process');
  }
  function queueCurve(id,selection,exact=false){
    if(Date.now()<suppressChartClickUntil)return;
    if(!pendingCurveClick||exact||!pendingCurveClick.exact)pendingCurveClick={id,selection,exact};
    if(!curveClickFrame)curveClickFrame=requestAnimationFrame(()=>{curveClickFrame=0;const pick=pendingCurveClick;pendingCurveClick=null;if(pick)commitCurve(pick.id,pick.selection);});
  }
  function chartSelectionAtPointer(event){
    const rect=$('[data-chart]').getBoundingClientRect();
    const x=event.clientX-rect.left;
    return M.selectionAt(chart.convertFromPixel({xAxisIndex:0},x),state);
  }
  function finishPointerGesture({revert=false,selection=null}={}){
    if(!pointerGesture)return;
    const gesture=pointerGesture;
    const latest=Number.isFinite(selection)?selection:gesture.latestSelection;
    // End the gesture before rendering or releasing capture: either can emit events.
    pointerGesture=null;state.dragging=false;
    if(dragFrame)cancelAnimationFrame(dragFrame);dragFrame=0;
    if(gesture.active){
      suppressChartClickUntil=Date.now()+650;
      const selected=Number.isFinite(latest)?Number(M.clamp(latest,0,M.maxSelection(state)).toFixed(2)):state.time;
      if(revert||selected===gesture.time)restorePointerSnapshot(gesture);
      else setTime(selected);
    }
    try{$('[data-chart]').releasePointerCapture?.(gesture.id);}catch{}
  }
  function restorePointerSnapshot(gesture){
    state.time=gesture.time;state.month=gesture.month;state.observationOrigin=gesture.observationOrigin;
    state.revealFullProjection=gesture.reveal;state.playbackStatus=gesture.playbackStatus==='running'?'paused':gesture.playbackStatus;
    renderNormal();
  }
  function beginPointerGesture(event){
    if(event.button>0||event.isPrimary===false)return;
    finishPointerGesture();
    suppressChartClickUntil=0;
    if(!state.pinned)return;
    const rect=$('[data-chart]').getBoundingClientRect(),point=[event.clientX-rect.left,event.clientY-rect.top];
    if(!chart.containPixel({gridIndex:0},point))return;
    cancelPreload();
    pointerGesture={id:event.pointerId,x:event.clientX,y:event.clientY,startedAt:event.timeStamp,active:false,latestSelection:null,time:state.time,month:state.month,playbackStatus:state.playbackStatus,observationOrigin:state.observationOrigin,reveal:state.revealFullProjection};
  }
  function hasDragIntent(gesture,event){
    const dx=Math.abs(event.clientX-gesture.x),dy=Math.abs(event.clientY-gesture.y);
    // A touch can still pan the page vertically; mouse and pen have no hold delay.
    return event.pointerType==='touch'?dx>=4&&dx>dy:dx>0;
  }
  function activatePointerGesture(gesture){
    gesture.active=true;state.dragging=true;
    stopPlayback();cancelCurveClick();clearHover(false);cancelPreload();
    try{$('[data-chart]').setPointerCapture?.(gesture.id);}catch{}
  }
  function movePointerGesture(event){
    const gesture=pointerGesture;if(!gesture||event.pointerId!==gesture.id)return;
    if(event.timeStamp<gesture.startedAt)return;
    // A release can be observed before pointerup (for example after leaving the window).
    // Keep the last position received while held, not this subsequent hover coordinate.
    if(event.pointerType!=='touch'&&event.buttons===0){finishPointerGesture();return;}
    if(!gesture.active){
      if(!hasDragIntent(gesture,event))return;
      gesture.latestSelection=chartSelectionAtPointer(event);
      activatePointerGesture(gesture);
    }
    if(pointerGesture!==gesture)return;
    event.preventDefault();gesture.latestSelection=chartSelectionAtPointer(event);
    // Input is recorded synchronously; only painting is coalesced into the next frame.
    if(!dragFrame)dragFrame=requestAnimationFrame(()=>{dragFrame=0;if(pointerGesture===gesture&&gesture.active)setTime(gesture.latestSelection);});
  }
  function endPointerGesture(event){
    const gesture=pointerGesture;if(!gesture||event.pointerId!==gesture.id)return;
    if(event.timeStamp<gesture.startedAt)return;
    if(!gesture.active&&hasDragIntent(gesture,event))activatePointerGesture(gesture);
    finishPointerGesture({selection:gesture.active?chartSelectionAtPointer(event):null});
  }
  function initCharts(){
    if(!window.echarts){$('[data-load-error]').hidden=false;return;}
    try{
      chart=echarts.init($('[data-chart]'),null,{renderer:'svg'});
      $('[data-chart]').addEventListener('wheel',chartWheel,{passive:false,capture:true});
      $('[data-chart]').addEventListener('pointerdown',beginPointerGesture,{capture:true});
      window.addEventListener('pointermove',movePointerGesture,{capture:true,passive:false});
      window.addEventListener('pointerup',endPointerGesture,{capture:true});
      window.addEventListener('pointercancel',event=>{if(event.pointerId===pointerGesture?.id)finishPointerGesture();},{capture:true});
      $('[data-chart]').addEventListener('lostpointercapture',event=>{if(event.target===$('[data-chart]')&&event.pointerId===pointerGesture?.id)finishPointerGesture();});
      window.addEventListener('blur',()=>{finishPointerGesture();cancelPreload();});
      window.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&pointerGesture){event.preventDefault();event.stopPropagation();finishPointerGesture({revert:true});}
      },{capture:true});
      renderNormal();
      chart.on('click',p=>{
        if(p.seriesId==='time-node-points'&&Number.isFinite(p.data?.month)){suppressChartClickUntil=Date.now()+120;selectMonth(p.data.month);return;}
        const event=p.event;
        const id=accidentHit(event?.offsetX,event?.offsetY)?'safety-incident':p.seriesId||chart.getOption().series[p.seriesIndex]?.id;
        if(![...M.fixedIds(state),...M.projectedIds(state),...(state.risk?['safety-incident']:[])].includes(id))return;
        if(id==='safety-incident'){queueCurve(id,state.time,true);return;}
        const e=p.event,x=Number.isFinite(e?.offsetX)?chart.convertFromPixel({xAxisIndex:0},e.offsetX):p.value?.[0]??p.data?.[0]??M.anchorX(state);
        queueCurve(id,M.selectionAt(x,state),true);
      });
      chart.getZr().on('mousemove',e=>{
        if(e.event?.pointerType==='touch'||e.event?.type?.startsWith('touch'))return;
        const px=[e.offsetX,e.offsetY];if(!chart.containPixel({gridIndex:0},px))return;
        const x=chart.convertFromPixel({xAxisIndex:0},e.offsetX);
        const selection=M.selectionAt(x,state);
        if(state.pinned)schedulePreload(selection);
        else scheduleHover(selection);
      });
      // Keep the unpinned preview when the pointer heads to the Play control.
      chart.getZr().on('globalout',()=>{if(state.pinned)clearHover();});
      chart.getZr().on('click',e=>{
        if(!chart.containPixel({gridIndex:0},[e.offsetX,e.offsetY]))return;
        const x=chart.convertFromPixel({xAxisIndex:0},e.offsetX),v=M.values(x,state);
        if(accidentHit(e.offsetX,e.offsetY)){queueCurve('safety-incident',state.time,true);return;}
        const candidates=[...M.fixedIds(state),...M.projectedIds(state)].filter(id=>Number.isFinite(v[id]));
        const nearest=candidates.map(id=>({id,d:Math.abs(chart.convertToPixel({yAxisIndex:0},v[id])-e.offsetY)})).sort((a,b)=>a.d-b.d)[0];
        if(nearest?.d<=38)queueCurve(nearest.id,M.selectionAt(x,state));
        else queueCurve('plot',M.selectionAt(x,state));
      });
      let queued=false;const resize=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(!root.isConnected||$('[data-chart]').clientWidth<1)return;chart.resize();renderNormal();});};
      if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe($('[data-chart]'));}window.addEventListener('resize',resize);
    }catch(error){$('[data-load-error]').hidden=false;console.error('Value explorer chart initialization failed',error);}
  }
  $$('[data-story]').forEach(b=>{
    if(!b.hasAttribute('data-risk'))b.addEventListener('click',()=>{choose(b.dataset.story);revealWideReader(b.dataset.story);});
    b.addEventListener('keydown',e=>{const tabs=$$('[data-story]'),i=tabs.indexOf(b);let n;
      if(e.key==='ArrowRight')n=(i+1)%tabs.length;else if(e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=tabs.length-1;else return;
      e.preventDefault();choose(tabs[n].dataset.story);tabs[n].focus();});
  });
  $$('[data-open-story]').forEach(b=>b.addEventListener('click',()=>openStory(b.dataset.openStory,b.dataset.openFragment)));
  $('[data-chart]').addEventListener('keydown',e=>{
    const current=Number.isFinite(pendingHover)?pendingHover:Number.isFinite(state.hoverTime)?state.hoverTime:state.time;
    if((e.key==='Enter'||e.key===' ')&&!state.pinned){
      e.preventDefault();commitCurve('plot',current);return;
    }
    let next;
    if(e.key==='ArrowRight')next=current+2;
    else if(e.key==='ArrowLeft')next=current-2;
    else if(e.key==='PageDown')next=current+10;
    else if(e.key==='PageUp')next=current-10;
    else if(e.key==='Home')next=0;
    else if(e.key==='End')next=M.maxSelection(state);
    else return;
    e.preventDefault();next=M.clamp(next,0,M.maxSelection(state));
    if(Math.abs(next-current)<1e-6)return;
    if(state.pinned)setTime(next);
    else scheduleHover(next);
    announce(`${state.pinned?'已调整':'预览'}入场时点，报价 ${fmt(M.quoteAt(next,state).investment)}。${state.pinned?'':'按回车固定。'}`);
  });
  $('[data-month]').addEventListener('input',e=>{
    const next=Number(e.target.value);
    selectMonth(next);
  });
  $('[data-play]').addEventListener('click',()=>{
    if(state.playing){stopPlayback('paused');return;}
    if(!state.pinned)setTime(Number.isFinite(pendingHover)?pendingHover:Number.isFinite(state.hoverTime)?state.hoverTime:state.time);
    const restart=state.playbackStatus==='idle'||state.playbackStatus==='completed'||M.elapsed(state)>=M.durationOf(state);
    state.revealFullProjection=false;
    if(restart)state.month=0;
    state.observationOrigin='manual';
    if(state.reduced){state.month=M.durationOf(state);state.playbackStatus='completed';renderMonth();announce('已显示当前视窗的完整假设推演。');return;}
    state.playing=true;state.playbackStatus='running';playbackLast=null;
    renderMonth();playbackFrame=requestAnimationFrame(playbackStep);
  });
  $('[data-risk]').addEventListener('click',()=>{
    if(!state.risk){choose('safety');return;}
    setRisk(false);renderNormal();
    announce('已取消安全事故，累计产能价值与利润恢复正常推演。');
  });
  $$('[data-zoom]').forEach(b=>b.addEventListener('click',()=>zoomAxis('y',b.dataset.zoom==='out'?1.4:1/1.4)));
  $$('[data-xzoom]').forEach(b=>b.addEventListener('click',()=>{
    const current=M.horizontalMaximum(state),next=current+(b.dataset.xzoom==='out'?40:-40);
    zoomAxis('x',next/current);
    announce(`横轴可见范围：入场后约 ${Number(M.durationOf(state).toFixed(1))} 个月；超出默认范围的部分按假设外推。`);
  }));
  $('[data-wide]').addEventListener('click',()=>setWide(!root.classList.contains('is-wide')));
  function visibleControls(){
    return [...root.querySelectorAll('button,input,select,summary,a[href],[tabindex="0"]')].filter(el=>{
      if(el.disabled||el.closest('[hidden],.ve-decomposition,.ve-topic-groups'))return false;
      for(let parent=el;parent&&root.contains(parent);parent=parent.parentElement){
        const style=getComputedStyle(parent);
        if(style.display==='none'||style.visibility==='hidden')return false;
        if(parent.tagName==='DETAILS'&&!parent.open){
          const summary=[...parent.children].find(child=>child.tagName==='SUMMARY');
          if(el!==summary&&!summary?.contains(el))return false;
        }
      }
      return true;
    });
  }
  root.addEventListener('keydown',e=>{
    if(!root.classList.contains('is-wide'))return;if(e.key==='Escape'){e.preventDefault();setWide(false);return;}if(e.key!=='Tab')return;
    const controls=visibleControls();
    const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  });
  function readHash(initial){
    const [base,fid]=location.hash.slice(1).split('/');const legacy={'lasting-value':['investment','waiting-method'],people:['return','learning'],'internal-it':['fde','reuse'],reliability:['safety','reliability'],roi:['return','process']};
    const entry=Object.entries(targets).find(([,target])=>base===target),route=entry?[entry[0],fid]:legacy[base];
    if(route){choose(route[0],false);if(route[1])selectFragment(route[0],route[1],false);if(initial)requestAnimationFrame(()=>root.scrollIntoView({block:'start',behavior:'auto'}));}
  }
  window.addEventListener('hashchange',()=>readHash(false));window.addEventListener('popstate',()=>readHash(false));
  media.addEventListener?.('change',e=>{state.reduced=e.matches;if(state.reduced)stopPlayback();renderNormal();});
  // Earlier links used a process-view query. Both views now share this chart.
  if(new URLSearchParams(location.search).has('view')){
    const url=new URL(location.href);url.searchParams.delete('view');history.replaceState(null,'',url.pathname+url.search+url.hash);
  }
  buildPanels();initCharts();choose('investment',false);readHash(true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){finishPointerGesture();cancelPreload();stopPlayback();}});
  window.addEventListener('pagehide',e=>{finishPointerGesture();cancelPreload();stopPlayback();if(!e.persisted){resizeObserver?.disconnect();cancelAnimationFrame(hoverFrame);cancelAnimationFrame(curveClickFrame);cancelAnimationFrame(wheelFrame);chart?.dispose();}},{once:true});
})();
