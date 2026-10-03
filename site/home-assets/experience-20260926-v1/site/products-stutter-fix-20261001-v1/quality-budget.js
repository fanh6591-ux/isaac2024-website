export function pixelBudget({width,height,dpr=1,coarse=false,saveData=false,level=1}){
  const pixels=saveData?900000:coarse?1700000:3200000;
  const cap=saveData?1:coarse?1.75:2;
  return Math.max(.35,Math.min(dpr,cap,Math.sqrt(pixels/Math.max(1,width*height)))*level);
}

// A pixel cap prevents Retina/4K devices from multiplying GPU work without bound.
// Sustained slow frames lower quality; recovery requires a longer stable interval.
export function createQualityBudget({renderer,stage}){
  const coarse=matchMedia('(pointer:coarse)'),saveData=!!navigator.connection?.saveData;
  let level=1,last=null,total=0,count=0,slow=0,fast=0,disposed=false,ratio=0,maxFrame=0,longFrames=0;
  function apply(){
    const next=pixelBudget({width:stage.clientWidth,height:stage.clientHeight,dpr:devicePixelRatio,coarse:coarse.matches||stage.clientWidth<=700,saveData,level});
    if(Math.abs(next-ratio)>.025){ratio=next;renderer.setPixelRatio(ratio);stage.dataset.renderDpr=ratio.toFixed(2);}
  }
  const resize=new ResizeObserver(apply);resize.observe(stage);addEventListener('resize',apply);coarse.addEventListener('change',apply);apply();
  function resetTiming(){last=null;total=0;count=0;slow=0;fast=0}
  document.addEventListener('visibilitychange',resetTiming);
  function update(ms,{busy=false}={}){
    if(disposed)return;
    if(busy||document.hidden){resetTiming();return}
    if(last===null){last=ms;return}
    const elapsed=Math.max(0,ms-last);last=ms;
    // A slow foreground frame is evidence, not a reason to discard the sample.
    if(elapsed>maxFrame){maxFrame=elapsed;stage.dataset.frameMaxMs=maxFrame.toFixed(1)}
    if(elapsed>50)stage.dataset.frameLongCount=String(++longFrames);
    total+=elapsed;count++;
    if(total<1800)return;
    const average=total/count;stage.dataset.frameMeanMs=average.toFixed(1);
    slow=average>25?slow+1:0;fast=average<18.5?fast+1:0;
    if(slow>=2&&level>.68){level=Math.max(.68,level-.12);slow=0;fast=0;apply()}
    else if(fast>=6&&level<1){level=Math.min(1,level+.06);fast=0;apply()}
    total=0;count=0;
  }
  return {update,dispose(){disposed=true;resize.disconnect();removeEventListener('resize',apply);coarse.removeEventListener('change',apply);document.removeEventListener('visibilitychange',resetTiming)}};
}
