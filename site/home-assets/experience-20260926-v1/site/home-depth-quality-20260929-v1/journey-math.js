const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const ease=(t,a,b)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p)};
export const mix=(a,b,p)=>a+(b-a)*p;

// One unwrapped trajectory. The page boundaries never restart the rotation.
export function sampleProductJourney(t,{mobile=false,reduced=false,landscape=false,aspect=1.7}={}) {
  const p=clamp((t-30)/6.8), contact=ease(t,35.15,35.8), departure=ease(t,36.3,37.4);
  const weight=ease(t,29.5,30.5)*(1-ease(t,38.65,39));
  const depth=9*p+departure*2;
  const yaw=reduced?0:Math.PI*2*ease(t,30.25,35.55)+.025*departure;
  const pitch=reduced?0:Math.sin(p*Math.PI*3)*.08*(1-contact)+.06*departure;
  const roll=reduced?0:Math.sin(p*Math.PI*2)*.025*(1-contact)-.02*departure;
  const x=landscape?mix(2.8,3.0,contact):mobile?mix(.16,.35,contact):mix(0,.42,contact)+Math.sin(p*Math.PI*2)*.16*(1-contact);
  // The camera follows the fall, while a small screen-space descent stays visible.
  const screenY=landscape?mix(.25,-.1,p):mobile?mix(2.0,1.75,p):mix(1.40,.84,p);
  return {weight,progress:p,depth,contact,departure,
    camera:[0,.25-depth,mobile?10.3:10.8],target:[0,.1-depth,0],
    head:[x,screenY-depth,.15],scale:landscape?2.65:mobile?1.40:Math.min(3.2,Math.max(1.65,aspect*2.4)),
    rotation:[pitch,yaw,roll]};
}

export function sampleJourneyCopy(t,{mobile=false,reduced=false,landscape=false}={}) {
  const rows=clamp((t-31)/4.5), shift=ease(t,34.75,35.5), leave=ease(t,36.5,37.25);
  return {
    visible:t>=29.6&&t<37.55,
    titleY:mix(mobile?50:29,mobile?-45:-50,ease(t,30.1,31.15)),
    listY:(landscape?21:mobile?33:24)-shift*(mobile?105:98),
    contactY:(landscape?119:mobile?153:123)-shift*(mobile?105:98)-leave*105,
    rowProgress:Array.from({length:7},(_,i)=>reduced||i===0?1:ease(rows,i*.1-.08,i*.1+.04)),
    listVisible:t>=30.6&&t<35.5,
    contactVisible:t>=34.85&&t<37.3,
    gameHint:ease(t,36.25,36.65)*(1-ease(t,37.15,37.5))
  };
}
