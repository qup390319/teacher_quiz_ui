"""
解析「知識節點關聯圖」docx 並輸出 JSON。

座標系統：
- 每個 <wp:anchor> 是一張圖（drawing），它的 wp:positionH/V 是該圖在頁面上的位置
- anchor 內可能是：
  (a) 單一 <wps:wsp>：shape 位置就是 anchor 的位置（local off 通常為 0,0）
  (b) <wpg:wgp> 群組：包多個 <wps:wsp>，子 shape 用群組的 transform 換算

連接線（直線單箭頭）的箭頭方向由 a:xfrm 的 flipH / flipV 決定：
- 預設：tail at (ox, oy)，head at (ox+cx, oy+cy)
- flipH=1：水平反轉
- flipV=1：垂直反轉

判斷 source/target：tail 端最近的文字框是 source（prereq），
head 端最近的文字框是 target。
"""
import argparse
import json
import os
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'wps': 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape',
    'wpg': 'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
}

ID_RE = re.compile(
    r'(IN[a-zA-Z]-(?:I|II|III|IV|V|VI|VII|VIII|IX|X|Ⅰ|Ⅱ|Ⅲ|Ⅳ|Ⅴ|Ⅵ|Ⅶ|Ⅷ|Ⅸ|Ⅹ)'
    r'-\d+(?:-\d+)?)'
)


def is_leaf_id(node_id: str) -> bool:
    return node_id.count('-') >= 3


def normalize_id(node_id: str) -> str:
    """把 ASCII II/III 標準化成羅馬數字字元（與 DB 一致），保留 INa/INb/INe 字首與末段。"""
    # 只在中段做轉換
    return (node_id
            .replace('-VIII-', '-Ⅷ-')
            .replace('-VII-', '-Ⅶ-')
            .replace('-VI-', '-Ⅵ-')
            .replace('-IX-', '-Ⅸ-')
            .replace('-IV-', '-Ⅳ-')
            .replace('-III-', '-Ⅲ-')
            .replace('-II-', '-Ⅱ-')
            .replace('-V-', '-Ⅴ-')
            .replace('-X-', '-Ⅹ-')
            .replace('-I-', '-Ⅰ-'))


def parse_wsp(wsp_elem) -> dict | None:
    """解析一個 <wps:wsp>，回傳 local 座標、是否為連接線、文字、flip 屬性。"""
    is_conn = wsp_elem.find('wps:cNvCnPr', NS) is not None
    sp_pr = wsp_elem.find('wps:spPr', NS)
    if sp_pr is None:
        return None
    xfrm = sp_pr.find('a:xfrm', NS)
    if xfrm is None:
        return None
    off = xfrm.find('a:off', NS)
    ext = xfrm.find('a:ext', NS)
    ox = int(off.get('x')) if off is not None else 0
    oy = int(off.get('y')) if off is not None else 0
    cx = int(ext.get('cx')) if ext is not None else 0
    cy = int(ext.get('cy')) if ext is not None else 0
    flipH = xfrm.get('flipH') == '1'
    flipV = xfrm.get('flipV') == '1'
    texts = [t.text for t in wsp_elem.findall('.//w:t', NS) if t.text]
    text = ''.join(texts).strip()
    return dict(local_ox=ox, local_oy=oy, cx=cx, cy=cy,
                flipH=flipH, flipV=flipV,
                is_conn=is_conn, text=text)


def get_group_transform(grp_elem) -> dict | None:
    """從 wpg:wgp/wpg:grpSpPr/a:xfrm 取群組的 off/ext/chOff/chExt，用來換算子 shape 座標。"""
    grp_sp_pr = grp_elem.find('wpg:grpSpPr', NS)
    if grp_sp_pr is None:
        return None
    xfrm = grp_sp_pr.find('a:xfrm', NS)
    if xfrm is None:
        return None
    off = xfrm.find('a:off', NS)
    ext = xfrm.find('a:ext', NS)
    ch_off = xfrm.find('a:chOff', NS)
    ch_ext = xfrm.find('a:chExt', NS)
    return {
        'gx': int(off.get('x')) if off is not None else 0,
        'gy': int(off.get('y')) if off is not None else 0,
        'gcx': int(ext.get('cx')) if ext is not None else 0,
        'gcy': int(ext.get('cy')) if ext is not None else 0,
        'chx': int(ch_off.get('x')) if ch_off is not None else 0,
        'chy': int(ch_off.get('y')) if ch_off is not None else 0,
        'chcx': int(ch_ext.get('cx')) if ch_ext is not None else 1,
        'chcy': int(ch_ext.get('cy')) if ch_ext is not None else 1,
    }


def apply_group_transform(shape: dict, gt: dict, anchor_pos: tuple[int, int]) -> dict:
    """把 shape 的 local 座標換算成相對於 anchor 的座標。
    Word 群組座標：actual = group_origin + (local - chOff) * group_ext / chExt
    我們最後再加上 anchor 的頁面位置，得到一致的全域座標。
    """
    if gt['chcx'] == 0 or gt['chcy'] == 0:
        # 沒有 chExt 時無法縮放，當作 1:1
        sx = gt['gx'] + (shape['local_ox'] - gt['chx'])
        sy = gt['gy'] + (shape['local_oy'] - gt['chy'])
        scaled_cx = shape['cx']
        scaled_cy = shape['cy']
    else:
        sx = gt['gx'] + (shape['local_ox'] - gt['chx']) * gt['gcx'] / gt['chcx']
        sy = gt['gy'] + (shape['local_oy'] - gt['chy']) * gt['gcy'] / gt['chcy']
        scaled_cx = shape['cx'] * gt['gcx'] / gt['chcx']
        scaled_cy = shape['cy'] * gt['gcy'] / gt['chcy']
    return {
        **shape,
        'ox': int(sx + anchor_pos[0]),
        'oy': int(sy + anchor_pos[1]),
        'scaled_cx': int(scaled_cx),
        'scaled_cy': int(scaled_cy),
    }


def walk_anchor(anchor) -> list[dict]:
    """處理一個 <wp:anchor>，回傳裡面所有 shapes 的全域座標。"""
    pH = anchor.find('wp:positionH/wp:posOffset', NS)
    pV = anchor.find('wp:positionV/wp:posOffset', NS)
    page_x = int(pH.text) if pH is not None and pH.text else 0
    page_y = int(pV.text) if pV is not None and pV.text else 0

    # 嘗試找群組
    grp = anchor.find('.//wpg:wgp', NS)
    if grp is not None:
        gt = get_group_transform(grp)
        shapes = []
        for wsp in grp.findall('.//wps:wsp', NS):
            s = parse_wsp(wsp)
            if s is None:
                continue
            if gt is not None:
                s = apply_group_transform(s, gt, (page_x, page_y))
            else:
                s = {**s, 'ox': page_x + s['local_ox'], 'oy': page_y + s['local_oy'],
                     'scaled_cx': s['cx'], 'scaled_cy': s['cy']}
            shapes.append(s)
        return shapes
    else:
        # 單一 shape
        wsp = anchor.find('.//wps:wsp', NS)
        if wsp is None:
            return []
        s = parse_wsp(wsp)
        if s is None:
            return []
        s = {**s,
             'ox': page_x + s['local_ox'],
             'oy': page_y + s['local_oy'],
             'scaled_cx': s['cx'],
             'scaled_cy': s['cy']}
        return [s]


def arrow_endpoints(c: dict) -> tuple[tuple[int, int], tuple[int, int]]:
    """根據 flipH/flipV 算 tail（無箭頭端）→ head（箭頭端）的座標。
    使用 scaled 後的 ext。"""
    cx = c.get('scaled_cx', c['cx'])
    cy = c.get('scaled_cy', c['cy'])
    sx, sy = c['ox'], c['oy']
    ex, ey = c['ox'] + cx, c['oy'] + cy
    if c['flipH']:
        sx, ex = ex, sx
    if c['flipV']:
        sy, ey = ey, sy
    return (sx, sy), (ex, ey)


def box_anchors(b: dict) -> tuple[tuple[int, int], tuple[int, int]]:
    cx = b.get('scaled_cx', b['cx'])
    cy = b.get('scaled_cy', b['cy'])
    cx_mid = b['ox'] + cx // 2
    top = (cx_mid, b['oy'])
    bottom = (cx_mid, b['oy'] + cy)
    return top, bottom


def find_nearest_box(point, boxes):
    best = None
    best_d = float('inf')
    best_side = None
    px, py = point
    for b in boxes:
        top, bot = box_anchors(b)
        for side_name, (ax, ay) in [('top', top), ('bottom', bot)]:
            d = (ax - px) ** 2 + (ay - py) ** 2
            if d < best_d:
                best_d = d
                best = b
                best_side = side_name
    return best, best_side, best_d ** 0.5


def cluster_by_proximity(shapes: list[dict], max_dist_emu: int = 2_000_000) -> list[list[dict]]:
    """用 union-find 把空間上相近的 shapes 分群。
    若兩個 shape 的 bounding box 中心距離 < max_dist，就在同一群。
    """
    n = len(shapes)
    parent = list(range(n))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i, j):
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[ri] = rj

    def center(s):
        cx = s.get('scaled_cx', s['cx'])
        cy = s.get('scaled_cy', s['cy'])
        return s['ox'] + cx // 2, s['oy'] + cy // 2

    centers = [center(s) for s in shapes]
    for i in range(n):
        for j in range(i + 1, n):
            dx = centers[i][0] - centers[j][0]
            dy = centers[i][1] - centers[j][1]
            if dx * dx + dy * dy < max_dist_emu ** 2:
                union(i, j)

    groups: dict[int, list[dict]] = {}
    for i, s in enumerate(shapes):
        root = find(i)
        groups.setdefault(root, []).append(s)
    return list(groups.values())


def parse_docx(path: str) -> dict:
    with zipfile.ZipFile(path) as z:
        xml_bytes = z.read('word/document.xml')

    # 解 XML
    root = ET.fromstring(xml_bytes)

    # 找出所有 <wp:anchor>（從 mc:Choice 內的也算）
    anchors = root.findall('.//wp:anchor', NS)

    all_shapes = []
    for a in anchors:
        all_shapes.extend(walk_anchor(a))

    # 空間聚類，找出最大的群（主關聯圖）
    clusters = cluster_by_proximity(all_shapes)
    if not clusters:
        return {'file': os.path.basename(path), 'main': None}

    diagrams = []
    for shapes in clusters:
        text_boxes = []
        for s in shapes:
            if s['is_conn']:
                continue
            m = ID_RE.search(s['text'])
            if not m:
                continue
            node_id = m.group(1)
            name = s['text'][m.end():].strip()
            text_boxes.append({**s, 'node_id': normalize_id(node_id),
                               'node_name': name})

        connectors = [s for s in shapes if s['is_conn']]
        edges_raw = []
        for c in connectors:
            tail, head = arrow_endpoints(c)
            src_box, src_side, src_d = find_nearest_box(tail, text_boxes)
            tgt_box, tgt_side, tgt_d = find_nearest_box(head, text_boxes)
            if src_box and tgt_box and src_box is not tgt_box:
                edges_raw.append({
                    'source': src_box['node_id'],
                    'target': tgt_box['node_id'],
                    'src_dist_emu': int(src_d),
                    'tgt_dist_emu': int(tgt_d),
                })

        # 只留 leaf → leaf 的邊
        leaf_edges = [e for e in edges_raw
                      if is_leaf_id(e['source']) and is_leaf_id(e['target'])]
        # 去重
        seen = set()
        deduped = []
        for e in leaf_edges:
            key = (e['source'], e['target'])
            if key in seen:
                continue
            seen.add(key)
            deduped.append(e)

        leaf_nodes = [b for b in text_boxes if is_leaf_id(b['node_id'])]
        # 去重 leaf nodes（同 ID 可能有重覆 box）
        seen_ids = set()
        unique_leaves = []
        for b in leaf_nodes:
            if b['node_id'] in seen_ids:
                continue
            seen_ids.add(b['node_id'])
            unique_leaves.append(b)
        parent_codes = sorted({b['node_id'] for b in text_boxes
                               if not is_leaf_id(b['node_id'])})

        if unique_leaves:
            diagrams.append({
                'nodes': [{'id': b['node_id'], 'name': b['node_name']}
                          for b in unique_leaves],
                'edges': deduped,
                'parent_codes': parent_codes,
                'shape_count': len(shapes),
            })

    main = max(diagrams, key=lambda d: len(d['nodes'])) if diagrams else None
    return {
        'file': os.path.basename(path),
        'main': main,
        'all_diagrams_count': len(diagrams),
    }


def parse_filename(name: str) -> dict:
    base = re.sub(r'\.docx$', '', name)
    parts = base.split('_')
    code = parts[0] if parts else ''
    title = parts[1] if len(parts) > 1 else ''
    return {'code': code, 'title': title}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()

    files = sorted([f for f in os.listdir(args.src) if f.endswith('.docx')])
    print(f'Found {len(files)} docx files', file=sys.stderr)

    results = []
    for fn in files:
        path = os.path.join(args.src, fn)
        try:
            r = parse_docx(path)
            fn_meta = parse_filename(fn)
            r['code'] = fn_meta['code']
            r['title'] = fn_meta['title']
            results.append(r)
            n_nodes = len(r['main']['nodes']) if r['main'] else 0
            n_edges = len(r['main']['edges']) if r['main'] else 0
            print(f'  {fn_meta["code"]:4s} -> {n_nodes:3d} nodes, '
                  f'{n_edges:3d} edges  ({r.get("all_diagrams_count", 0)} clusters)',
                  file=sys.stderr)
        except Exception as e:
            print(f'  ERROR parsing {fn}: {e}', file=sys.stderr)
            results.append({'file': fn, 'error': str(e)})

    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f'\nWrote {args.out}', file=sys.stderr)
    total_nodes = sum(len(r['main']['nodes']) for r in results if r.get('main'))
    total_edges = sum(len(r['main']['edges']) for r in results if r.get('main'))
    print(f'Total: {total_nodes} nodes, {total_edges} edges', file=sys.stderr)


if __name__ == '__main__':
    main()
