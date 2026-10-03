// Shared by the maintenance source and the narrow production patch.
export async function createConsultingContent(D, {signal}={}) {
  const {Group,Mesh,RoundedBoxGeometry,MeshStandardMaterial,TextureLoader,SRGBColorSpace,board,type,rule,smooth}=D;
  const rows=[
    [{file:'needs',title:'找到真实需求',lines:['想改变哪项工作？','现在怎样完成？','真正卡在哪里？']},{file:'results',title:'对齐目标结果',lines:['改善什么？','怎样衡量？','谁会使用？']}],
    [{file:'market',title:'拆解同行产品',lines:['AI 客服','AI 知识库','出海合规']},{file:'business',title:'理解商业模型',lines:['解决的问题','创造的价值','交付与维护成本']}],
    [{file:'plan',title:'把需求变成方案',lines:['需求澄清','方案取舍','可行性判断']},{file:'implementation',title:'让方案进入现场',lines:['系统接入','团队使用','效果验证']}]
  ];
  const loader=new TextureLoader(),textureDemand=Math.min(innerWidth*(innerWidth<=700?.43:.30),460)*Math.min(devicePixelRatio,2),compact=!!navigator.connection?.saveData||textureDemand<=600;
  const textures=await Promise.all(rows.flat().map(async entry=>{
    try {
      const t=await loader.loadAsync('/home-assets/homepage-page8-20260927-v1/images/'+entry.file+(compact?'-small.webp':'.webp'));
      t.colorSpace=SRGBColorSpace;t.anisotropy=8;return t;
    } catch {return null;}
  }));
  if(signal?.aborted){textures.forEach(t=>t?.dispose());signal.throwIfAborted();}
  const root=new Group();root.name='ISAAC-Consulting-Content';
  const width=2.3,height=width*4/3;
  const frameMaterial=new MeshStandardMaterial({color:'#3f4941',roughness:.36,metalness:.6});
  const lipMaterial=new MeshStandardMaterial({color:'#a88b55',roughness:.4,metalness:.65});
  const cards=[0,1].map(side=>{
    const card=board(width,height,(c,w,h,phase=0)=>{
      const entry=rows[phase][side];c.fillStyle='#eee8d8';c.fillRect(0,0,w,h);
      type(c,entry.title,90,250,115,'#203f38',600);
      entry.lines.forEach((line,i)=>{rule(c,90,480+i*400,w-180,'#294a3e35');type(c,line,90,600+i*400,85,'#294a3e',500);});
      type(c,'ISAAC',90,h-110,42,'#6b7869');
    });
    card.root.name=side?'ISAAC-Content-Right':'ISAAC-Content-Left';
    // Keep the solid backing clear of the picture's depth samples.
    const backing=card.root.children.find(child=>child.isMesh&&!child.material?.map);
    backing.position.z-=.1;
    const rail=(w,h,x,y,z,depth,material)=>{
      const mesh=new Mesh(new RoundedBoxGeometry(w,h,depth,2,.012),material);
      mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;card.root.add(mesh);
    };
    for(const sign of [-1,1]){
      rail(width+.18,.095,0,sign*(height/2+.0475),.035,.22,frameMaterial);
      rail(.095,height,sign*(width/2+.0475),0,.035,.22,frameMaterial);
      rail(width+.055,.025,0,sign*(height/2+.0125),.07,.07,lipMaterial);
      rail(.025,height,sign*(width/2+.0125),0,.07,.07,lipMaterial);
    }
    root.add(card.root);return card;
  });
  let previous=-1;
  function paint(phase){
    if(phase===previous)return;previous=phase;root.userData.phase=phase;
    cards.forEach((card,side)=>{
      card.paint(phase);const texture=textures[phase*2+side]||card.texture;
      const face=card.root.children.find(child=>child.material?.map);
      face.material.map=texture;face.material.emissiveMap=texture;face.material.emissiveIntensity=.32;face.material.needsUpdate=true;
      card.root.userData.content=rows[phase][side].title;
    });
  }
  paint(0);
  return {root,contentTextures:textures.filter(Boolean),sample(position,phase){
    root.visible=position>4.4&&position<18.5;paint(phase??(position<11?0:position<14?1:2));
    cards.forEach(({root:card},side)=>{
      const slot=side===0?-1:1,unfold=smooth(position,5,8);
      card.position.set(1.8+slot*(1.9+unfold*(side===0?.4:1.1)),-.3,-2.25);
      card.rotation.set(-.04,-.2+slot*-.13+(1-unfold)*.4,.04*slot);
      card.scale.setScalar(.8+unfold*.1);
      if(innerWidth<=700){card.position.set(side===0?-1.35:1.35,0,0);card.rotation.set(0,side===0?.035:-.035,0);}
    });
    root.position.y=-smooth(position,16.5,18.5)*2.5;root.rotation.y=Math.sin(position*.25)*.045;
  }};
}
