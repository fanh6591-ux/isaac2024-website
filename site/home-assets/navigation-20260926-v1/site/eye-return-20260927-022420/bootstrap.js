(()=>{
 const key='isaac:return-home';
 try{
  const raw=sessionStorage.getItem(key);sessionStorage.removeItem(key);
  if(!raw||window.parent!==window||location.pathname!=='/'||(location.hash&&location.hash!=='#hello'))return;
  const intent=JSON.parse(raw);if(Date.now()-intent.at>30000||intent.at>Date.now())return;
  window.isaacReturnHome=true;document.documentElement.classList.add('isaac-return-preparing');
  window.isaacReturnGuard=setTimeout(()=>{window.isaacReturnHome=false;document.documentElement.classList.remove('isaac-return-preparing')},15000);
 }catch{}
})();
