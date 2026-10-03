"""Read-only local preview. No accounts, API forwarding or production writes."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit, unquote
import urllib.request, mimetypes
ROOT=Path(__file__).resolve().parents[1]/'site'
ORIGIN='https://isaac2024.online'
PREFIXES=('/home-assets/','/icons/','/about/css/','/about/js/','/about/img/','/assets/','/models/','/images/','/fonts/')
EXTS={'.js','.mjs','.css','.ico','.png','.jpg','.jpeg','.webp','.svg','.gif','.avif','.woff','.woff2','.ttf','.glb','.gltf','.bin','.mp4','.webm','.ogg','.mp3','.hdr','.ktx2'}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass
 def end_headers(self):
  self.send_header('Content-Security-Policy', "connect-src 'self' blob:; form-action 'none'")
  self.send_header('Referrer-Policy','no-referrer')
  super().end_headers()
 def do_GET(self):
  path=unquote(urlsplit(self.path).path)
  if '..' in path.split('/') or '\\' in path or path.startswith(('/api/','/auth/','/admin/','/feedback/')):
   self.send_error(403,'Backend features are excluded from this frontend preview');return
  local=(ROOT/path.lstrip('/')).resolve()
  if not local.is_relative_to(ROOT):self.send_error(403);return
  if local.exists():super().do_GET();return
  if path.startswith(PREFIXES) and Path(path).suffix.lower() in EXTS:
   try:
    request=urllib.request.Request(ORIGIN+path,headers={'User-Agent':'Isaac-read-only-preview/1.0'})
    response=urllib.request.urlopen(request,timeout=25)
    if urlsplit(response.geturl()).netloc!='isaac2024.online':response.close();self.send_error(502);return
    self.send_response(200);self.send_header('Content-Type',response.headers.get('Content-Type',mimetypes.guess_type(path)[0] or 'application/octet-stream'));self.end_headers()
    with response:
     while chunk:=response.read(256*1024):self.wfile.write(chunk)
   except (BrokenPipeError,ConnectionResetError):pass
   except Exception:self.send_error(502,'Origin asset unavailable')
   return
  self.send_error(404,'Page is outside the captured public frontend')
 def do_POST(self):self.send_error(405,'Read-only preview')
 def do_PUT(self):self.send_error(405,'Read-only preview')
 def do_DELETE(self):self.send_error(405,'Read-only preview')
if __name__=='__main__':
 print('Open http://127.0.0.1:8967 — origin assets require internet')
 ThreadingHTTPServer(('127.0.0.1',8967),Handler).serve_forever()
