import {HAND_ENVELOPE} from './hand-envelope.js';

// The collider is in normalized hero coordinates and includes the phoenix tips.
// Sharing the hero transform keeps contact invariant through scale and rotation.
export function fitReferenceHand(hand,hero,stage){
  if(!hand.fit){
    const mesh=hand.mesh||hand.root.children[0].children[0];
    const uniforms={handToHead:{value:hero.matrixWorld.clone()},headToHand:{value:hero.matrixWorld.clone()},headPlanes:{value:new Float32Array(HAND_ENVELOPE.flat())}};
    const compile=mesh.material.onBeforeCompile;
    mesh.material.onBeforeCompile=shader=>{
      compile(shader);Object.assign(shader.uniforms,uniforms);
      shader.vertexShader=`uniform mat4 handToHead;uniform mat4 headToHand;uniform vec4 headPlanes[26];
      vec3 clearHead(vec3 p){
        vec3 h=(handToHead*vec4(p,1.)).xyz;float distance=-100.;vec3 normal=vec3(0.,0.,1.);
        for(int k=0;k<26;k++){float d=dot(headPlanes[k].xyz,h)+headPlanes[k].w;if(d>distance){distance=d;normal=headPlanes[k].xyz;}}
        h+=normal*max(0.,.025-distance);
        return (headToHand*vec4(h,1.)).xyz;
      }
      `+shader.vertexShader.replace('vec3 transformed=handVertex(position);','vec3 transformed=clearHead(handVertex(position));');
    };
    mesh.material.customProgramCacheKey=()=> 'reference-hand-clearance-2';mesh.material.needsUpdate=true;
    hand.fit={mesh,uniforms,offset:hero.position.clone()};
  }
  const {mesh,uniforms,offset}=hand.fit;
  hand.root.quaternion.copy(hero.quaternion);
  const scale=hero.scale.x*10.62;
  hand.root.scale.set(scale*1.12,scale,scale);
  offset.set(.035,-.025,.055).multiplyScalar(hero.scale.x).applyQuaternion(hero.quaternion);
  hand.root.position.copy(hero.position).add(offset);
  hero.updateWorldMatrix(true,false);hand.root.updateWorldMatrix(true,true);
  uniforms.handToHead.value.copy(hero.matrixWorld).invert().multiply(mesh.matrixWorld);
  uniforms.headToHand.value.copy(uniforms.handToHead.value).invert();
  stage.dataset.handFit='volume-clearance';
}
