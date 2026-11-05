# Renderiza dos carpetas de PDFs con pdftoppm y compara pixel por pixel cada página.
import sys, os, subprocess, glob
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]; ok = True
if not glob.glob(os.path.join(a, '*.pdf')) or not glob.glob(os.path.join(b, '*.pdf')): print('SIN PDFs PARA COMPARAR'); sys.exit(1)
for fa in sorted(glob.glob(os.path.join(a, '*.pdf'))):
    fb = os.path.join(b, os.path.basename(fa))
    for d, f in ((a + '/png', fa), (b + '/png', fb)):
        os.makedirs(d, exist_ok=True); subprocess.run(['pdftoppm', '-r', '110', '-png', f, os.path.join(d, os.path.basename(f)[:-4])], check=True)
    pa = sorted(glob.glob(os.path.join(a, 'png', os.path.basename(fa)[:-4] + '*.png')))
    pb = sorted(glob.glob(os.path.join(b, 'png', os.path.basename(fa)[:-4] + '*.png')))
    if len(pa) != len(pb): print(os.path.basename(fa), 'páginas distintas', len(pa), len(pb)); ok = False; continue
    worst = 0
    for x, y in zip(pa, pb):
        ia, ib = Image.open(x).convert('RGB'), Image.open(y).convert('RGB')
        if ia.size != ib.size: print('tamaño distinto', x); ok = False; continue
        diff = ImageChops.difference(ia, ib).convert('L').point(lambda v: 255 if v > 0 else 0)
        n = diff.histogram()[255]; worst = max(worst, n / (ia.size[0] * ia.size[1]))
    print(f"{os.path.basename(fa)}: {len(pa)} pág., pixeles distintos (peor página) = {worst*100:.4f}%")
    if worst > 0: ok = False
print('IDÉNTICOS' if ok else 'HAY DIFERENCIAS')
