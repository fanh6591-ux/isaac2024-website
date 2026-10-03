export function fitCaseGallery(gallery,camera,mobile,stage){
  const width=stage.clientWidth,height=stage.clientHeight;
  const z=mobile?-1.4:-.4;
  const viewHeight=2*Math.tan(camera.fov*Math.PI/360)*(camera.position.z-z);
  const viewWidth=viewHeight*camera.aspect;
  // Keep photos in the space beside desktop copy, or below the mobile model.
  const available=Math.min(mobile?width*.90:width*.49,650);
  const pixelsPerWorld=height/viewHeight;
  gallery.root.scale.setScalar(available/(5.9*pixelsPerWorld*(mobile?.65:1)));
  gallery.root.position.set(camera.position.x+(mobile?0:viewWidth*.235),camera.position.y+(mobile?viewHeight*.12:0),z);
}
