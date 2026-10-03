from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'source-manifest.json').read_text())
for route,entry in m['routes'].items():
 p=root/entry['file']
 assert p.is_file(),entry['file']
 assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256'],entry['file']
print(f"Verified {len(m['routes'])} captured public files")
