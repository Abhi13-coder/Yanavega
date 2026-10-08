#!/usr/bin/env python3
"""Builds content/manifest.json (size + SHA-256 of every file in content/).

  python3 tools/make_manifest.py [--version 1.0.3] [--min-app 1] [--entry game/index.html]

Optional packs (downloaded only when the game asks for them): create content/packs.json
  {"packs": {"core": {"required": true}, "cars": {"required": false}},
   "rules": [["cars/", "cars"]]}          # files under content/cars/ belong to pack "cars"
Big files can live in GitHub Releases: add  "url": "https://github.com/.../releases/download/..."  to a file entry by hand
or pass --base to point every file at another folder.
"""
import argparse, hashlib, json, os, time

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--version'); ap.add_argument('--min-app', type=int); ap.add_argument('--entry'); ap.add_argument('--base', default='')
    a = ap.parse_args()
    root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'content'))
    mp = os.path.join(root, 'manifest.json'); pp = os.path.join(root, 'packs.json')
    old = json.load(open(mp)) if os.path.exists(mp) else {}
    cfg = json.load(open(pp)) if os.path.exists(pp) else {}
    packs = cfg.get('packs', {'core': {'required': True}}); rules = cfg.get('rules', [])
    files = []
    for d, _, names in os.walk(root):
        for n in names:
            full = os.path.join(d, n); rel = os.path.relpath(full, root).replace(os.sep, '/')
            if rel in ('manifest.json', 'packs.json') or n.startswith('.') or n.endswith('.part'):
                continue
            h = hashlib.sha256()
            with open(full, 'rb') as f:
                for chunk in iter(lambda: f.read(1 << 20), b''):
                    h.update(chunk)
            pack = 'core'
            for prefix, p in rules:
                if rel.startswith(prefix):
                    pack = p; break
            files.append({'path': rel, 'sha256': h.hexdigest(), 'size': os.path.getsize(full), 'pack': pack})
    files.sort(key=lambda x: x['path'])
    m = {'schema': 1,
         'version': a.version or old.get('version') or time.strftime('%Y.%m.%d'),
         'minApp': a.min_app if a.min_app is not None else old.get('minApp', 1),
         'entry': a.entry or old.get('entry', 'game/index.html'),
         'packs': packs, 'files': files}
    if a.base: m['base'] = a.base
    with open(mp, 'w') as f:
        json.dump(m, f, indent=1)
    print('manifest:', m['version'], len(files), 'files,', sum(x['size'] for x in files), 'bytes')

if __name__ == '__main__':
    main()
