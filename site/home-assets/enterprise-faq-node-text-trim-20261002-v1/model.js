(function(scope){
  'use strict';
  // The market quote varies by entry condition; all projected paths meet one future review cutoff.
  const colors={fde:'#ee8077',return:'#e6c777',investment:'#79b5df',total:'#79b5df',technical:'#8ac3c0',delivery:'#b8afa0',premium:'#bf9ebd',safety:'#ef8c83',existing:'#a5abb6',newteam:'#b29cbd'};
  const theme={background:'#050505',grid:'#242424',rule:'#454545',muted:'#a0a0a0',ink:'#e7e6e2'};
  const labels={fde:'自建 FDE 累计成本',return:'累计产能价值',investment:'各时点入场报价',total:'累计总投入',technical:'技术基础',delivery:'专业交付',premium:'供需溢价',existing:'现有 IT 团队',newteam:'另组 IT 团队'};
  const defaults={technical:35,delivery:40,premium:25,decline:12,technicalWave:1.5,premiumRise:60,premiumEase:12,maintenanceMonthly:4,benefit:10,reuse:40,fdeSetup:160,fdeMonthly:8,fdeAdapt:12,existingSetup:110,existingMonthly:7,newteamSetup:180,newteamMonthly:9,salaryRise:25,capacityRise:15,adoptionGain:30,wageDrift:2,iterationLoad:10,modelGain:15};
  const scenarioFactors={conservative:.55,base:1,optimistic:1.45},scenarioLabels={conservative:'保守',base:'基准',optimistic:'乐观'};
  const font='"Isaac FAQ Han", "PingFang SC", sans-serif';
  // Each finite viewport is only a window onto three continuable curves.
  const quoteWidth=130,projectionWidth=80,initialView=[0,100],minSpan=2;
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(Number(n))?Number(n):lo));
  // Fractional view extensions let a wheel reveal the same continuous paths smoothly.
  const continuation=state=>clamp(state?.extend??0,-1.25,20);
  const durationOf=state=>36*(horizontalMaximum(state)-anchorX(state))/(quoteWidth+projectionWidth);
  const horizontalMaximum=state=>quoteWidth+projectionWidth+continuation(state)*40;
  const maxSelectableX=state=>horizontalMaximum(state)-24;
  const maxSelection=state=>maxSelectableX(state)/quoteWidth*100;
  const stageUnit=selection=>selection<=100?clamp(selection,0,100)/100:1+.5*(-Math.expm1(-(selection-100)/100));
  const anchorOf=state=>clamp(state?.pinned?state.time:Number.isFinite(state?.hoverTime)?state.hoverTime:state?.time??0,0,maxSelection(state));
  const anchorX=state=>anchorOf(state)/100*quoteWidth;
  const selectionAt=(x,state={})=>clamp(x/quoteWidth*100,0,maxSelection(state));
  function assumptions(state={}) {
    const raw=state.assumptions||{};
    const a=Object.fromEntries(Object.entries(defaults).map(([k,d])=>[k,raw[k]===undefined||raw[k]===null||raw[k]===''||!Number.isFinite(Number(raw[k]))?d:Math.max(0,Number(raw[k]))]));
    a.decline=clamp(a.decline,0,100);a.salaryRise=clamp(a.salaryRise,0,80);a.capacityRise=clamp(a.capacityRise,0,100);a.adoptionGain=clamp(a.adoptionGain,0,80);
    a.wageDrift=clamp(a.wageDrift,0,10);a.iterationLoad=clamp(a.iterationLoad,0,50);a.modelGain=clamp(a.modelGain,0,60);return a;
  }
  function quoteAt(selection,state={}) {
    const a=assumptions(state),u=state.quoteShape==='fixed'?0:stageUnit(selection);
    const technical=Math.max(0,a.technical*(1-a.decline/100*u)+a.technicalWave*Math.sin(2*Math.PI*u)*Math.sin(Math.PI*u));
    const variation=state.marketScenario==='easing'?-a.premiumEase*(.6*u+.4*u*u):state.marketScenario==='balanced'?0:a.premiumRise*(.55*u+.45*u*u);
    const premium=Math.max(0,a.premium+variation);
    return {investment:technical+a.delivery+premium,technical,delivery:a.delivery,premium};
  }
  function conditions(state={}) {
    const a=assumptions(state),u=stageUnit(anchorOf(state));
    const demand=clamp(state.marketScenario==='easing'?-a.premiumEase/35*(.6*u+.4*u*u):state.marketScenario==='balanced'?0:a.premiumRise/35*(.55*u+.45*u*u),-1,1);
    const labourFactor=1+a.salaryRise/100*demand,tempo=1-a.adoptionGain/100*u;
    return {a,u,demand,tempo,lag:2*tempo,rampTau:9*tempo,reuseTau:36*tempo,
      quote:quoteAt(anchorOf(state),state).investment,maintenanceMonthly:a.maintenanceMonthly,
      setup:a.fdeSetup*labourFactor,monthly:a.fdeMonthly*labourFactor,
      adapt:a.fdeAdapt*(1-a.decline/100*u)*tempo,adaptTau:6*tempo,
      benefit:a.benefit*(1+a.capacityRise/100*u)*(scenarioFactors[state.scenario]??1),
      existingSetup:a.existingSetup*labourFactor,existingMonthly:a.existingMonthly*labourFactor,
      newteamSetup:a.newteamSetup*labourFactor,newteamMonthly:a.newteamMonthly*labourFactor};
  }
  // The screen edge is a viewport boundary, never a fixed economic endpoint.
  const spanOf=state=>horizontalMaximum(state)-anchorX(state);
  const projectionEnd=state=>horizontalMaximum(state);
  function ramp(u,tau){const t=Math.max(0,u);return Math.max(0,t+tau*Math.expm1(-t/tau));}
  const elapsed=state=>state.month===undefined||state.month===null?durationOf(state):clamp(state.month,0,durationOf(state));
  function rateAt(months,state={},c=conditions(state)){
    const t=Math.max(0,months),a=c.a;
    const adopted=t<=c.lag?0:-Math.expm1(-(t-c.lag)/c.rampTau);
    const improvement=1+a.modelGain/100*(-Math.expm1(-Math.max(0,t-6)/36));
    const reuse=1+a.reuse/100*(-Math.expm1(-Math.max(0,t-24)/c.reuseTau));
    return {total:c.maintenanceMonthly,
      fde:c.monthly*(1+a.wageDrift/100*t/12)+(t>24?c.monthly*a.iterationLoad/100*(-Math.expm1(-(t-24)/24)):0)+c.adapt/c.adaptTau*Math.exp(-t/c.adaptTau),
      return:c.benefit*adopted*improvement*reuse-(state.risk?incidentLossRate(t,state,c):0)};
  }
  // Piecewise Simpson integration keeps the delayed adoption and 24-month reuse boundary explicit.
  function capacityAt(months,c){
    const start=c.lag,end=Math.max(start,months);
    if(end<=start)return 0;
    let total=0;
    const cuts=[start,6,24,end].filter(x=>x>=start&&x<=end).sort((a,b)=>a-b);
    if(cuts[0]!==start)cuts.unshift(start);
    if(cuts.at(-1)!==end)cuts.push(end);
    for(let j=1;j<cuts.length;j++){
      const lo=cuts[j-1],hi=cuts[j];
      if(hi<=lo)continue;
      const n=Math.max(2,Math.ceil((hi-lo)/2)*2),h=(hi-lo)/n;
      let sum=rateAt(lo,{},c).return+rateAt(hi,{},c).return;
      for(let i=1;i<n;i++)sum+=(i%2?4:2)*rateAt(lo+i*h,{},c).return;
      total+=sum*h/3;
    }
    return total;
  }
  function sampleProject(progress,state,c,event=state.risk?accidentEvent(state,c):null) {
    const months=clamp(progress,0,1)*durationOf(state);
    const payroll=c.monthly*(months+c.a.wageDrift/100*months*months/24);
    const iteration=c.monthly*c.a.iterationLoad/100*ramp(months-24,24);
    return {total:c.quote+c.maintenanceMonthly*months,fde:c.setup+payroll+iteration+c.adapt*-Math.expm1(-months/c.adaptTau),return:capacityAt(months,c)-(event?incidentLossAt(months,event):0),
      existing:c.existingSetup+c.existingMonthly*months,newteam:c.newteamSetup+c.newteamMonthly*months,months};
  }
  const projectAt=(progress,state={})=>sampleProject(progress,state,conditions(state));
  function endValues(state={}) {return {...quoteAt(anchorOf(state),state),...projectAt(1,state)};}
  function values(x,state={}) {
    const validQuote=x>=-1e-10&&x<=horizontalMaximum(state)+1e-10,q=quoteAt(x/quoteWidth*100,state),progress=(x-anchorX(state))/spanOf(state);
    const validProjection=progress>=-1e-10&&progress<=1+1e-10,p=projectAt(progress,state);
    return {...Object.fromEntries(Object.entries(q).map(([k,v])=>[k,validQuote?v:null])),...Object.fromEntries(Object.entries(p).map(([k,v])=>[k,validProjection?v:null]))};
  }
  const quoteData=(id,state={})=>Array.from({length:241},(_,i)=>{
    const x=horizontalMaximum(state)*i/240;return [x,quoteAt(x/quoteWidth*100,state)[id]];
  });
  // A bounded value-keyed cache survives the immutable snapshots used for hover.
  // Compute each sample once for every curve; idle preloading never changes state.
  const pathCache=new Map(),pathIds=['total','fde','return','existing','newteam'];
  function projectionPaths(state={}) {
    const key=[continuation(state),state.scenario,state.marketScenario,state.quoteShape,anchorOf(state),!!state.risk,state.risk?lossMultiple(state):0,...Object.values(assumptions(state))].join('|');
    if(pathCache.has(key)){
      const cached=pathCache.get(key);pathCache.delete(key);pathCache.set(key,cached);return cached;
    }
    const start=anchorX(state),c=conditions(state),span=spanOf(state),event=state.risk?accidentEvent(state,c):null,paths=Object.fromEntries(pathIds.map(id=>[id,[]]));
    for(let i=0;i<=180;i++){
      const x=start+span*i/180,values=sampleProject(i/180,state,c,event);
      for(const id of pathIds)paths[id].push([x,values[id]]);
    }
    // Only the gold path needs additional samples. Keep quote and cost sampling intact.
    // The short loss interval must survive even the widest supported X viewport.
    if(event){
      const samples=new Map(paths.return.map(point=>[point[0],point]));
      for(const point of accidentPath(state,event,c))samples.set(point[0],point);
      paths.return=Array.from(samples.values()).sort((a,b)=>a[0]-b[0]);
    }
    pathCache.set(key,paths);
    if(pathCache.size>16)pathCache.delete(pathCache.keys().next().value);
    return paths;
  }
  function projectedData(id,state={}) {
    return projectionPaths(state)[id]||[];
  }
  function preloadProjection(selection,state={}) {
    const time=Number(clamp(selection,0,maxSelection(state)).toFixed(2));
    projectionPaths({...state,time,hoverTime:null,pinned:true});
  }
  function projectedDataUntil(id,state={}){
    const p=elapsed(state)/durationOf(state),all=projectedData(id,state);
    if(p>=1)return [];
    const x=anchorX(state)+spanOf(state)*p;
    const data=all.filter(point=>point[0]<=x);
    if(!data.length||data.at(-1)[0]<x)data.push([x,projectAt(p,state)[id]]);
    return data;
  }
  const projectedIds=state=>['total','fde','return'].concat(state.teams?['existing','newteam']:[]);
  const fixedIds=state=>['investment'].concat(state.components?['technical','delivery','premium']:[]);
  const lossMultiple=state=>[10,20,30].includes(Number(state?.loss))?Number(state.loss):20;
  const axisCache=new WeakMap();
  function dimensions(state={}) {
    const key=[continuation(state),state.scenario,state.marketScenario,state.quoteShape,state.teams,...Object.values(assumptions(state))].join('|');
    if(axisCache.get(state)?.key===key)return axisCache.get(state);
    const x=horizontalMaximum(state);let y=quoteAt(x/quoteWidth*100,state).investment;
    // Include the full blue curve, not just selected entry points, so an accident
    // never resizes the Y axis as the cursor previews different entry conditions.
    let quoteMaximum=0;
    for(let step=0;step<=240;step++)quoteMaximum=Math.max(quoteMaximum,quoteAt(x*step/240/quoteWidth*100,state).investment);
    // Stable bounds include all possible selected conditions, never only the current mouse position.
    for(let step=0;step<=100;step++){
      const time=maxSelection(state)*step/100;
      const s={...state,pinned:false,time,hoverTime:null,risk:false},end=projectAt(1,s);
      y=Math.max(y,quoteAt(time,state).investment,...projectedIds(state).map(id=>end[id]));
    }
    const result={key,x,y:y>0?y*1.16:1,quoteMaximum};axisCache.set(state,result);return result;
  }
  const baseMaximum=state=>dimensions(state).y;
  const amountMaximum=state=>baseMaximum(state)*clamp(state?.scale??1,.25,8);
  const amountMinimum=state=>state?.risk?-Math.max(1,dimensions(state).quoteMaximum*lossMultiple(state))*1.12:0;
  function accidentEvent(state={},c=conditions(state)) {
    // The incident starts within the first two project years; a bounded short
    // interval represents the rapid loss rather than an impossible vertical time step.
    const duration=durationOf(state),month=Math.min(.66*duration,24);
    const transitionMonths=Math.min(6,duration*.2),endMonth=month+transitionMonths;
    const x=anchorX(state)+spanOf(state)*month/duration,endX=anchorX(state)+spanOf(state)*endMonth/duration;
    const fromY=capacityAt(month,c),baselineEndY=capacityAt(endMonth,c),quote=c.quote;
    const loss=lossMultiple(state),lossAmount=loss*quote;
    return {x,endX,month,endMonth,transitionMonths,fromY,baselineEndY,toY:baselineEndY-lossAmount,quote,loss,lossAmount};
  }
  function incidentLossAt(months,event){
    const u=clamp((months-event.month)/event.transitionMonths,0,1);
    return event.lossAmount*u*u*(3-2*u);
  }
  function incidentLossRate(months,state,c){
    const event=accidentEvent(state,c),u=(months-event.month)/event.transitionMonths;
    return u>0&&u<1?event.lossAmount*6*u*(1-u)/event.transitionMonths:0;
  }
  function accidentPath(state={},event=accidentEvent(state),c=conditions(state)){
    return Array.from({length:33},(_,i)=>{
      const fraction=i/32,month=event.month+event.transitionMonths*fraction;
      return [event.x+(event.endX-event.x)*fraction,capacityAt(month,c)-incidentLossAt(month,event)];
    });
  }
  function accidentSeries(state={}) {
    const event=accidentEvent(state);
    // The cumulative gold series carries the loss. This series supplies its two
    // readable nodes only; there is no independent red damage path or vertical arrow.
    return {id:'safety-incident',name:'安全事故',type:'line',data:[],showSymbol:false,clip:true,
      triggerLineEvent:true,z:11,animation:false,lineStyle:{color:colors.return},itemStyle:{color:colors.return},emphasis:{disabled:true,focus:'none'},
      markPoint:{silent:false,animation:false,symbol:'circle',symbolSize:9,itemStyle:{color:colors.return,borderColor:theme.background,borderWidth:2},
        label:{show:true,color:colors.return,fontFamily:font,fontSize:11},
        data:[{coord:[event.x,event.fromY],label:{formatter:'安全事故',position:'top',distance:10}},
          {coord:[event.endX,event.toY],label:{formatter:`事故后净值 ${Number(event.toY.toFixed(0)).toLocaleString('zh-CN')}`,position:'bottom',distance:9}}]}};
  }
  const timelineNodeCache=new Map();
  function timelineNodes(state={}){
    const key=[continuation(state),anchorOf(state),state.scenario,state.marketScenario,state.quoteShape,!!state.risk,state.risk?lossMultiple(state):0,...Object.values(assumptions(state))].join('|');
    if(timelineNodeCache.has(key))return timelineNodeCache.get(key);
    const duration=durationOf(state),start=anchorX(state),span=spanOf(state);
    const months=[0,6,12,24,36,60,120,180,duration].filter(t=>t<=duration+1e-8).sort((a,b)=>a-b);
    const nodes=months.filter((t,i)=>i===0||Math.abs(t-months[i-1])>1e-8).map(month=>{
      const x=month===duration?projectionEnd(state):start+span*month/duration;
      return {month,x,
        values:{...projectAt(month/duration,state),investment:quoteAt(x/quoteWidth*100,state).investment}};
    });
    timelineNodeCache.set(key,nodes);
    if(timelineNodeCache.size>16)timelineNodeCache.delete(timelineNodeCache.keys().next().value);
    return nodes;
  }
  function timelineSeries(state={}){
    const nodes=timelineNodes(state),month=elapsed(state),minimum=amountMinimum(state),maximum=amountMaximum(state);
    return [{id:'time-node-guides',type:'line',data:[],silent:true,z:2,animation:false,
      markLine:{silent:true,animation:false,symbol:['none','none'],label:{show:false},lineStyle:{color:theme.muted,width:1,type:'dotted',opacity:.16},
        data:nodes.map(n=>[{coord:[n.x,minimum]},{coord:[n.x,maximum]}])}},
      {id:'time-node-points',name:'关键时间节点',type:'scatter',z:12,animation:false,symbol:'circle',symbolSize:6,
        label:{show:false},tooltip:{show:false},emphasis:{scale:1.5},
        data:nodes.flatMap(n=>['investment','total','fde','return'].map(id=>({name:labels[id],month:n.month,curveId:id,value:[n.x,n.values[id]],
          symbolSize:Math.abs(n.month-month)<.1?9:6,
          itemStyle:{color:colors[id],borderColor:theme.background,borderWidth:1.5,opacity:n.month<=month+.1?.9:.25}})))}];
  }
  function currentValuesSeries(state={},compact=false){
    const month=elapsed(state),duration=durationOf(state),x=anchorX(state)+spanOf(state)*month/duration;
    const values={...projectAt(month/duration,state),investment:quoteAt(x/quoteWidth*100,state).investment};
    return {id:'current-node-values',type:'scatter',data:['investment','total','fde','return'].map(id=>({value:[x,values[id]],curveId:id,itemStyle:{color:colors[id]},label:{color:colors[id]}})),
      silent:true,z:13,animation:false,symbol:'circle',symbolSize:5,
      label:{show:true,position:month/duration>.75?'left':'right',distance:10,fontFamily:font,fontSize:compact?11:12,formatter:p=>Number(p.value[1].toFixed(1)).toLocaleString('zh-CN')},
      labelLayout:p=>{
        const ids=['investment','total','fde','return'],maximum=amountMaximum(state),minimum=amountMinimum(state);
        const value=values[ids[p.dataIndex]],relative=(maximum-value)/(maximum-minimum);
        const height=relative>1e-6?(p.rect.y+p.rect.height/2-35)/relative:(compact?238:297);
        const positions=ids.map((id,index)=>({index,y:35+(maximum-values[id])/(maximum-minimum)*height})).sort((a,b)=>a.y-b.y);
        let previous=-Infinity;
        for(const point of positions){point.y=Math.max(point.y,previous+16);previous=point.y;}
        const overflow=Math.max(0,positions.at(-1).y-(35+height));
        return {y:positions.find(point=>point.index===p.dataIndex).y-overflow,verticalAlign:'middle'};
      },labelLine:{show:true,length2:8,lineStyle:{color:theme.muted,opacity:.5}},tooltip:{show:false}};
  }
  function comparison(state={}) {
    const progress=elapsed(state)/durationOf(state);
    return {from:[anchorX(state),quoteAt(anchorOf(state),state).investment],to:[anchorX(state)+spanOf(state)*progress,projectAt(progress,state).return]};
  }
  function comparisonSeries(state={},compact=false) {
    const c=comparison(state);
    return {id:'investment-forward',type:'line',data:[],silent:true,z:8,animation:false,
      markPoint:{silent:true,animation:false,symbol:'circle',symbolSize:state.pinned?8:0,
        itemStyle:{color:'#e1d6bb',borderColor:theme.background,borderWidth:2},
        data:state.pinned?[{coord:c.from,label:{show:!compact,formatter:'本次投入',position:'bottom',distance:8,color:'#cfc2a5',fontSize:10}},
          {coord:c.to,label:{show:false,formatter:'当前产能价值',position:'top',distance:8,color:colors.return,fontSize:10}}]:[]}};
  }
  function differenceRegions(state={}) {
    const complete=elapsed(state)>=durationOf(state)||state.revealFullProjection;
    const gold=complete?projectedData('return',state):projectedDataUntil('return',state);
    const blue=projectedData('total',state),regions=[];
    let blueIndex=1;
    const samples=gold.map(([x,y])=>{
      while(blueIndex<blue.length-1&&blue[blueIndex][0]<x)blueIndex++;
      const a=blue[blueIndex-1],b=blue[blueIndex],t=(x-a[0])/(b[0]-a[0]);
      return [x,y,a[1]+(b[1]-a[1])*t];
    });
    function append(a,b){
      const delta=(a[1]-a[2])+(b[1]-b[2]);
      if(Math.abs(delta)<1e-9)return;
      const side=delta>0?'gold-above':'blue-above';
      let region=regions.at(-1);
      if(!region||region.side!==side||region.gold.at(-1)[0]!==a[0]){
        region={side,gold:[[a[0],a[1]]],blue:[[a[0],a[2]]]};regions.push(region);
      }
      region.gold.push([b[0],b[1]]);region.blue.push([b[0],b[2]]);
    }
    for(let i=1;i<samples.length;i++){
      const a=samples[i-1],b=samples[i],da=a[1]-a[2],db=b[1]-b[2];
      if(da*db<0){
        // Split both boundaries at the same intersection, without overlaps or seams.
        const t=da/(da-db),x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,cross=[x,y,y];
        append(a,cross);append(cross,b);
      }else append(a,b);
    }
    return regions.map(region=>({...region,points:region.gold.concat([...region.blue].reverse())}));
  }
  function differenceAreaSeries(state={}) {
    const regions=differenceRegions(state);
    return {id:'curve-difference',name:'产能价值与总投入之间的区域',type:'custom',coordinateSystem:'cartesian2d',
      z:1,silent:true,clip:true,animation:false,animationDurationUpdate:0,tooltip:{show:false},emphasis:{disabled:true},
      dimensions:['start','end','low','high'],encode:{x:[0,1],y:[2,3]},
      data:regions.map(region=>[region.gold[0][0],region.gold.at(-1)[0],Math.min(...region.points.map(p=>p[1])),Math.max(...region.points.map(p=>p[1]))]),
      renderItem(params,api){
        const region=regions[params.dataIndex];
        return {type:'polygon',silent:true,shape:{points:region.points.map(point=>api.coord(point))},
          style:{fill:region.side==='gold-above'?'#f2a0a0':'#a9d8bb',opacity:.24}};
      }};
  }
  function quotePreviewSeries(state={}) {
    return {id:'quote-preview',type:'scatter',data:[],silent:true,z:10,
      symbol:'circle',symbolSize:8,itemStyle:{color:colors.investment,borderColor:theme.background,borderWidth:2},animation:false};
  }
  function guideSeries(state={},maximum=amountMaximum(state),minimum=amountMinimum(state)) {
    const x=anchorX(state),end=projectionEnd(state);
    return {id:'entry-cursor',type:'line',data:[[x,minimum],[x,maximum]],showSymbol:false,silent:true,z:4,clip:true,animation:false,lineStyle:{color:state.dragging?colors.investment:theme.muted,width:state.dragging?1.4:1,type:'dashed',opacity:state.dragging?.9:.58},
      markPoint:{silent:true,animation:false,symbol:'circle',symbolSize:1,itemStyle:{opacity:0},label:{show:true,color:theme.muted,fontSize:10,fontFamily:font,position:'top',distance:8,formatter:'入场'},data:[{coord:[x,0]}]},
      markLine:{silent:true,animation:false,symbol:['none','none'],lineStyle:{opacity:0},label:{show:false,formatter:`距共同观察点 ${Number(durationOf(state).toFixed(1))} 个月`,fontFamily:font,fontSize:10,color:theme.muted,position:'middle'},data:[[{coord:[x,0]},{coord:[end,0]}]]}};
  }
  function endPoints(id,state) {
    const main=id==='total'||id==='fde'||id==='return';
    return {silent:true,animation:false,symbol:'circle',symbolSize:main?7:4,itemStyle:{color:colors[id],borderColor:theme.background,borderWidth:2},label:{show:false},data:[{coord:[anchorX(state),projectAt(0,state)[id]],symbolSize:4}]};
  }
  const selectedCurve=state=>state.highlightedCurve??({investment:'total',fde:'fde',return:'return',safety:'return'}[state.story]);
  function playheadSeries(state={}){
    const progress=elapsed(state)/durationOf(state),x=anchorX(state)+spanOf(state)*progress;
    const v={...projectAt(progress,state),investment:quoteAt(x/quoteWidth*100,state).investment},active=selectedCurve(state);
    return {id:'simulation-cursor',type:'line',data:[[x,Math.min(v.total,v.fde,v.return)],[x,Math.max(v.total,v.fde,v.return)]],showSymbol:false,symbolSize:8,silent:true,z:9,animation:false,
      lineStyle:{color:'#aaa49a',width:1,type:'dotted',opacity:.7},itemStyle:{color:colors.return,borderColor:theme.background,borderWidth:2},
      markPoint:{silent:true,animation:false,symbol:'circle',symbolSize:9,label:{show:false},data:['investment','total','fde','return'].map(id=>({coord:[x,v[id]],itemStyle:{color:colors[id],opacity:active && active!==id ? .24 : 1,shadowBlur:active===id?12:0,shadowColor:active===id?colors[id]:'transparent'}}))}};
  }
  function applyCurveHighlight(series,state={}){
    const active=selectedCurve(state);
    const bright={investment:'#c5ecff',total:'#c5ecff',fde:'#ffd0c8',return:'#fff2bb'};
    const complete=elapsed(state)>=durationOf(state)||state.revealFullProjection;
    return series.map(item=>{
      const id=item.id.replace(/-elapsed$/,''),played=item.id.endsWith('-elapsed');
      if(!Object.hasOwn(bright,id))return item;
      const selected=id===active,quote=id==='investment',focus=active?(selected?1:.24):1;
      const marker=item.markPoint?{markPoint:{...item.markPoint,itemStyle:{...item.markPoint.itemStyle,opacity:focus,shadowBlur:selected?12:0,shadowColor:selected?colors[id]:'transparent'}}}:{};
      return {...item,...marker,z:selected?(played?9:8):played?7:quote?5:6,
        lineStyle:{...item.lineStyle,color:selected?bright[id]:colors[id],
          width:selected?(quote?2.6:3.2):played?3.1:quote?1.7:id==='total'?3.2:2.6,
          cap:'round',join:'round',type:quote?'dotted':played||complete?'solid':'dashed',
          opacity:(quote?(selected?1:.62):played||complete?1:.22)*focus,
          shadowBlur:selected?18:0,shadowColor:selected?colors[id]:'transparent',shadowOffsetX:0,shadowOffsetY:0}};
    });
  }
  function highlightSeries(state={}){
    return applyCurveHighlight(['investment','total','fde','return','total-elapsed','fde-elapsed','return-elapsed'].map(id=>({id})),state);
  }
  function progressSeries(state={}){
    const complete=elapsed(state)>=durationOf(state)||state.revealFullProjection;
    return applyCurveHighlight(['total','fde','return'].flatMap(id=>[
      {id,lineStyle:{opacity:complete?1:.22,type:complete?'solid':'dashed'},endLabel:{show:false}},
      {id:id+'-elapsed',data:state.revealFullProjection?[]:projectedDataUntil(id,state),animation:false,animationDurationUpdate:0}
    ]),state);
  }
  function timeSeries(selection,maximum,state={}) {
    const s={...state,hoverTime:state.pinned?state.hoverTime:selection},selected=anchorOf(s),x=anchorX(s),q=quoteAt(selected,s);
    const progress=progressSeries(s);
    return applyCurveHighlight(projectedIds(s).map(id=>({id,data:projectedData(id,s),markPoint:endPoints(id,s),lineStyle:progress.find(p=>p.id===id)?.lineStyle??{opacity:1},endLabel:progress.find(p=>p.id===id)?.endLabel,animation:false,animationDurationUpdate:0})).concat([
      ...progress.filter(p=>p.id.endsWith('-elapsed')),differenceAreaSeries(s),
      {id:'investment',markPoint:{silent:true,animation:false,symbol:'circle',symbolSize:8,itemStyle:{color:colors.investment,borderColor:theme.background,borderWidth:2},label:{show:false},data:[{coord:[x,q.investment]}]}},guideSeries(s,maximum,amountMinimum(state)),playheadSeries(s),...timelineSeries(s),currentValuesSeries(s),quotePreviewSeries(s),...(s.risk?[accidentSeries(s)]:[])]),s);
  }
  function normalOption(state={},compact=false) {
    const fixed=fixedIds(state),moving=projectedIds(state),ids=[...fixed,...moving];
    const series=ids.map(id=>{
      const quote=id==='investment',minor=!['investment','total','fde','return'].includes(id),isMoving=moving.includes(id);
      return {id,name:labels[id],type:'line',data:isMoving?projectedData(id,state):quoteData(id,state),showSymbol:false,smooth:.38,smoothMonotone:'x',clip:true,triggerLineEvent:true,z:minor?2:id==='investment'?5:6,
        animation:false,animationDurationUpdate:0,lineStyle:{color:colors[id],width:minor?1.15:quote?1.7:id==='total'?3.2:2.6,cap:'round',join:'round',type:minor?'dashed':quote?'dotted':'solid',opacity:minor?.75:quote?.62:1},itemStyle:{color:colors[id]},emphasis:{disabled:true,focus:'none'},
        endLabel:{show:false},labelLayout:{moveOverlap:'shiftY'}};
    });
    for(const id of ['total','fde','return'])series.push({id:id+'-elapsed',type:'line',data:[],silent:true,showSymbol:false,smooth:.38,smoothMonotone:'x',z:7,animation:false,
      lineStyle:{color:colors[id],width:3.1,cap:'round',join:'round',opacity:1}});
    series.push(guideSeries(state),playheadSeries(state),comparisonSeries(state,compact),quotePreviewSeries(state));
    if(state.risk)series.push(accidentSeries(state));
    for(const patch of timeSeries(anchorOf(state),amountMaximum(state),state)){
      const target=series.find(s=>s.id===patch.id);
      if(!target){series.push(patch);continue;}
      const merged={...target,...patch};
      if(target.lineStyle&&patch.lineStyle)merged.lineStyle={...target.lineStyle,...patch.lineStyle};
      if(target.endLabel&&patch.endLabel)merged.endLabel={...target.endLabel,...patch.endLabel};
      Object.assign(target,merged);
    }
    return {animation:false,animationDurationUpdate:0,backgroundColor:theme.background,textStyle:{fontFamily:font},
      grid:{left:compact?43:52,right:compact?22:138,top:35,bottom:compact?56:88},
      xAxis:{type:'value',min:0,max:horizontalMaximum(state),axisLine:{onZero:true,lineStyle:{color:theme.rule}},axisTick:{show:false},axisLabel:{show:false},splitLine:{show:false}},
      yAxis:{type:'value',min:amountMinimum(state),max:amountMaximum(state),splitNumber:4,name:'',nameGap:18,nameTextStyle:{color:theme.muted,fontSize:10,align:'left'},axisLine:{show:false},axisTick:{show:false},axisLabel:{fontSize:11,showMaxLabel:false,color:theme.muted,formatter:n=>Number(n.toFixed(0)).toLocaleString('en-US')},splitLine:{lineStyle:{color:theme.grid,type:[2,6]}}},tooltip:{show:false},series};
  }
  const api={colors,theme,labels,defaults,scenarioLabels,scenarioFactors,quoteWidth,projectionWidth,continuation,durationOf,horizontalMaximum,maxSelectableX,maxSelection,projectionEnd,spanOf,initialView,minSpan,clamp,assumptions,elapsed,anchorOf,anchorX,selectionAt,quoteAt,conditions,rateAt,projectAt,endValues,values,quoteData,projectedData,preloadProjection,projectedDataUntil,projectedIds,fixedIds,baseMaximum,amountMaximum,amountMinimum,accidentEvent,accidentPath,accidentSeries,timelineNodes,timelineSeries,currentValuesSeries,comparison,comparisonSeries,differenceRegions,differenceAreaSeries,quotePreviewSeries,guideSeries,playheadSeries,highlightSeries,progressSeries,timeSeries,normalOption};
  scope.IsaacExplorerModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
