from PIL import Image, ImageDraw
import numpy as np

READER_VERSION = '2026.11.09.1'

# Corners TL, TR, BR, BL in the native 1920x1080 camera frame.
QUADS = {
    'm1': [(1482,413),(1498,416),(1493,446),(1477,443)],
    'm2': [(1499,416),(1514,419),(1510,448),(1495,445)],
    's1': [(1520,421),(1535,424),(1532,454),(1517,451)],
    's2': [(1537,425),(1552,428),(1548,458),(1533,455)],
    'h1': [(1456,465),(1476,469),(1470,500),(1450,495)],
    'h2': [(1474,470),(1494,475),(1487,505),(1467,500)],
    'a1': [(1533,484),(1555,489),(1548,523),(1526,517)],
    'a2': [(1552,491),(1574,496),(1566,530),(1544,523)],
    'p': [(1499,490),(1517,494),(1512,518),(1494,514)],
}

def warp(im, pts):
    # PIL QUAD expects TL, BL, BR, TR.
    return im.transform((48,80),Image.Transform.QUAD,tuple(c for i in [0,3,2,1] for c in pts[i]),Image.Resampling.BICUBIC)

def mask(im):
    a=np.asarray(im.convert('RGB')).astype(float)
    r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    return (r>180)&(r>g*1.03)&(r>b*1.08)


def board_power_state(im,digits=None):
    """A visible board with all LEDs dark differs from an unreadable/black feed."""
    if im.size!=(1920,1080):return 'unknown'
    if digits and any(value is not None for value in digits.values()):return 'on'
    if any(int(mask(warp(im,points)).sum())>=50 for points in QUADS.values()):return 'on'
    board=np.asarray(im.crop((1360,350,1700,610)).convert('L'))
    if float(board.mean())<10 or float(board.std())<8:return 'unknown'
    return 'off'

PROBES = {
    'a': (.43,.04,.60,.17),
    'b': (.72,.19,.94,.42),
    'c': (.72,.59,.94,.83),
    'd': (.43,.85,.60,.97),
    'e': (.18,.59,.36,.83),
    'f': (.18,.19,.36,.42),
    'g': (.40,.44,.60,.56),
}

def probes(m):
    ys,xs=np.where(m)
    if len(xs):
        m=m[ys.min():ys.max()+1,xs.min():xs.max()+1]
    h,w=m.shape
    return {k:round(float(m[int(y*h):int(v*h),int(x*w):int(u*w)].mean()),3) for k,(x,y,u,v) in PROBES.items()}

PATTERNS = {'ab cdef'.replace(' ',''):'0','bc':'1','abdeg':'2','abcdg':'3','bcfg':'4','acdfg':'5','acdefg':'6','abc':'7','abcdefg':'8','abcdfg':'9','cdefg':'6','abcfg':'9'}

def recognize(im,key):
    m=mask(warp(im,QUADS[key]));ys,xs=np.where(m)
    if len(xs)<50: return None,{}
    if xs.max()-xs.min()+1 < m.shape[1]*.40:
        return '1',{'narrow':True}
    scores=probes(m)
    active=''.join(k for k in sorted(scores) if scores[k]>(.45 if k=='g' else .30))
    if active in PATTERNS:return PATTERNS[active],scores
    return nearest(scores),scores

def nearest(scores):
    # A segment near the threshold (angle or glare) must not discard a clear digit.
    costs={}
    for pattern,digit in PATTERNS.items():
        cost=sum((1-scores[k]) if k in pattern else scores[k] for k in 'abcdefg')
        costs[digit]=min(cost,costs.get(digit,cost))
    ranked=sorted(costs.items(),key=lambda item:item[1])
    best,second=ranked[0],ranked[1]
    if best[1]<=2.2 and second[1]-best[1]>=.5:return best[0]
    return None
