"""Bundle src/anaume.template.html + assets into one self-contained page: dist/anaume.html.

The page runs from a single file (models and skins are embedded as base64),
so it can be opened locally, published as an artifact, or served by GitHub Pages.
Usage:  python3 tools/build.py            -> dist/anaume.html
        python3 tools/build.py --test     -> also dist/anaume.test.html (debug hooks for tools/sim-test.js)
"""
import base64, json, glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'src', 'anaume.template.html'), encoding='utf-8').read()

models = {}
for f in sorted(glob.glob(os.path.join(ROOT, 'assets', 'models', '*'))):
    name = os.path.basename(f).rsplit('.', 1)[0]
    models[name] = base64.b64encode(open(f, 'rb').read()).decode()
skins = {}
for f in sorted(glob.glob(os.path.join(ROOT, 'assets', 'skins', 'skin_*.png'))):
    name = os.path.basename(f)[5:-4]
    skins[name] = 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode()

bgm_path = os.path.join(ROOT, 'assets', 'audio', 'bgm.mp3')
audio = json.dumps(base64.b64encode(open(bgm_path, 'rb').read()).decode()) if os.path.exists(bgm_path) else '""'

page = src.replace('__ASSETS__', json.dumps(models)).replace('__SKINS__', json.dumps(skins)).replace('__AUDIO__', audio)
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
out = os.path.join(ROOT, 'dist', 'anaume.html')
open(out, 'w', encoding='utf-8').write(page)
print(f'{out}  {len(page)//1024} KB  models={len(models)} skins={len(skins)} bgm={"yes" if audio!=chr(34)*2 else "no"}')

if '--test' in sys.argv:
    # debug hooks: fast-forward the fixed-step simulation and poke at state from a headless browser
    hook = ("window.__dbg=()=>({S,agents,cells,plots,err:totalSoil()-S.soil0});"
            "window.__reg=()=>{sites[1].reg=true;};"
            "window.__ff=(sec)=>{for(let k=0;k<sec/0.05;k++){if(!simStep(0.05))break;}};"
            "window.__start=(i)=>start(STAGES[i]);")
    test = page.replace('let S=null,agents=[]', hook + 'let S=null,agents=[]', 1)
    # load three.js from node_modules (npm install) so the test runs offline
    test = test.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', '../node_modules/three/build/three.min.js')
    test = re.sub(r'https://cdn.jsdelivr.net/npm/three@0.128.0/(examples/js/[^"]+)', r'../node_modules/three/\1', test)
    test = '<!doctype html><html><head><meta charset="utf-8"></head><body>' + test + '</body></html>'
    open(os.path.join(ROOT, 'dist', 'anaume.test.html'), 'w', encoding='utf-8').write(test)
    print('dist/anaume.test.html (debug hooks)')
