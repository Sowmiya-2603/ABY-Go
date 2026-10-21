from PIL import Image, ImageFilter
import numpy as np, json
m = np.asarray(Image.open('subject-mask.png').convert('L')) > 128
H, W = m.shape

def dilate(mask, r):
    a = Image.fromarray((mask * 255).astype(np.uint8))
    for i in range(r):  # alternate square/cross -> roughly round
        a = a.filter(ImageFilter.MaxFilter(3)) if i % 2 else a.filter(ImageFilter.Kernel((3,3),[0,1,0,1,1,1,0,1,0],1))
    return np.asarray(a) > 0

def trace(mask):
    # Moore-neighbour boundary trace of the largest blob, returns ordered (x, y)
    ys, xs = np.where(mask)
    i = np.lexsort((xs, ys))[0]; start = (xs[i], ys[i])
    nb = [(-1,0),(-1,-1),(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1)]
    def on(x, y): return 0 <= x < W and 0 <= y < H and mask[y, x]
    pts = [start]; cur = start; back = 0
    for _ in range(200000):
        for k in range(8):
            d = (back + 1 + k) % 8
            nx, ny = cur[0] + nb[d][0], cur[1] + nb[d][1]
            if on(nx, ny):
                back = (d + 4) % 8; cur = (nx, ny); break
        if cur == start: break
        pts.append(cur)
    return pts

def loop(r, step):
    pts = trace(dilate(m, r))
    pts = pts[::step]
    # clamp into the canvas
    out = []
    for x, y in list(pts) + [pts[0]]:
        p = [int(min(max(x, 1), W - 2)), int(min(max(y, 1), H - 2))]
        if not out or p != out[-1]: out.append(p)
    return out

# (offset from the bottle, brush radius); the protective selection keeps them off the bottle
rings = [(44, 40), (34, 30), (26, 22), (18, 16), (10, 10), (5, 6)]
out = {"rings": [{"r": r, "pts": loop(d, 3)} for d, r in rings],
       "edge": loop(5, 2), "edge2": loop(4, 2)}
json.dump(out, open('paths.json', 'w'))
far = dilate(m, 34)
Image.fromarray(((~far) * 255).astype(np.uint8)).convert('RGB').save('far-mask.png')
print('rings', [len(r['pts']) for r in out['rings']], len(out['edge']))
