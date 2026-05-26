"""Docx parser for 108 課綱知識節點關聯圖 (W7b).

解析「次主題 → 內容細目（大節點）→ 知識節點（小節點）」三層階層。

文件結構（35 份檔案統一模板）：
  Table 0（總表）— 列出所有大節點
    row 1: ["次主題名稱", unit_name]
    row 2: ["課綱內容細目指標編號", "內容細目指標名稱"]  ← header
    row 3+: [parent_code, parent_name]

  Table 1, 2, ...（每個大節點一個表）
    row 1: ["次主題名稱", unit_name]
    row 2: ["課綱內容細目指標編號", "內容細目指標名稱"]
    row 3: [parent_code, parent_name]                  ← 該大節點
    row 4: ["知識節點編號", "知識節點名稱"]              ← header
    row 5+: [child_code, child_name]
"""
from __future__ import annotations

import re
import zipfile
from typing import BinaryIO
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


class DocxParseError(ValueError):
    """Raised when the uploaded docx does not match the expected template."""


def _cell_text(c: ET.Element) -> str:
    return "".join(t.text or "" for t in c.iter(W + "t")).strip()


def parse_docx(file: BinaryIO) -> dict:
    """Parse a 知識節點關聯圖 docx and return:

        { unitCode, unitName, parents: [
            { code, name, children: [{ code, name }, ...] },
            ...
        ]}

    Raises ``DocxParseError`` on missing/unrecognized structure.
    """
    try:
        with zipfile.ZipFile(file) as z, z.open("word/document.xml") as f:
            tree = ET.parse(f)
    except (zipfile.BadZipFile, KeyError) as exc:
        raise DocxParseError(f"INVALID_DOCX: {exc}") from exc
    except ET.ParseError as exc:
        raise DocxParseError(f"INVALID_XML: {exc}") from exc

    root = tree.getroot()
    body = root.find(W + "body")
    if body is None:
        raise DocxParseError("EMPTY_DOCUMENT")

    tables = list(body.iter(W + "tbl"))
    if not tables:
        raise DocxParseError("NO_TABLES")

    unit_code: str | None = None
    unit_name: str | None = None
    parents_dict: dict[str, dict] = {}
    parents_order: list[str] = []

    for tbl in tables:
        rows = []
        for tr in tbl.iter(W + "tr"):
            cells = [_cell_text(tc) for tc in tr.iter(W + "tc")]
            rows.append(cells)

        # 次主題名稱（每個表都重複出現一次，取第一次抓到的）
        for row in rows:
            if len(row) >= 2 and row[0] == "次主題名稱" and row[1]:
                unit_name = unit_name or row[1].strip()
                m = re.search(r"[（(]([A-Za-z]+)[)）]", unit_name)
                if m and not unit_code:
                    unit_code = m.group(1)
                break

        cur_parent_code: str | None = None
        i = 0
        while i < len(rows):
            row = rows[i]
            joined = "|".join(row)

            # 大節點 header
            if "課綱內容細目指標編號" in joined and "知識節點" not in joined:
                j = i + 1
                while j < len(rows):
                    nxt = rows[j]
                    nxt_joined = "|".join(nxt)
                    if "知識節點編號" in nxt_joined or "課綱內容細目指標編號" in nxt_joined:
                        break
                    if len(nxt) >= 2 and nxt[0]:
                        code = nxt[0].strip()
                        name = nxt[1].strip() if len(nxt) > 1 else ""
                        if code and code != "課綱內容細目指標編號":
                            if code not in parents_dict:
                                parents_dict[code] = {
                                    "code": code, "name": name, "children": [],
                                }
                                parents_order.append(code)
                            elif not parents_dict[code]["name"] and name:
                                parents_dict[code]["name"] = name
                            cur_parent_code = code
                    j += 1
                i = j
                continue

            # 小節點 header
            if "知識節點編號" in joined:
                j = i + 1
                while j < len(rows):
                    nxt = rows[j]
                    nxt_joined = "|".join(nxt)
                    if "課綱內容細目指標編號" in nxt_joined or "知識節點編號" in nxt_joined:
                        break
                    if len(nxt) >= 2 and nxt[0]:
                        code = nxt[0].strip()
                        name = nxt[1].strip() if len(nxt) > 1 else ""
                        if code and code != "知識節點編號":
                            pcode = cur_parent_code
                            if not pcode:
                                m = re.match(r"^(.+)-\d+$", code)
                                pcode = m.group(1) if m else None
                            if pcode:
                                if pcode not in parents_dict:
                                    parents_dict[pcode] = {
                                        "code": pcode, "name": "", "children": [],
                                    }
                                    parents_order.append(pcode)
                                if not any(c["code"] == code
                                           for c in parents_dict[pcode]["children"]):
                                    parents_dict[pcode]["children"].append(
                                        {"code": code, "name": name},
                                    )
                    j += 1
                i = j
                continue

            i += 1

    if not unit_name:
        raise DocxParseError("UNIT_NAME_NOT_FOUND")
    if not parents_order:
        raise DocxParseError("NO_PARENT_NODES_FOUND")

    return {
        "unitCode": unit_code,
        "unitName": unit_name,
        "parents": [parents_dict[c] for c in parents_order],
    }


def parse_docx_zip(file: BinaryIO) -> list[dict]:
    """解析 zip 中所有 .docx，回傳每個檔案的 parse 結果。
    某檔解析失敗時收集為 errors 而不中斷整批。
    """
    results: list[dict] = []
    try:
        zf = zipfile.ZipFile(file)
    except zipfile.BadZipFile as exc:
        raise DocxParseError(f"INVALID_ZIP: {exc}") from exc

    with zf:
        for name in zf.namelist():
            if not name.lower().endswith(".docx") or name.startswith("__MACOSX"):
                continue
            # Skip Word lock files like ~$xxx.docx
            base = name.rsplit("/", 1)[-1]
            if base.startswith("~$"):
                continue
            try:
                with zf.open(name) as inner:
                    data = inner.read()
                from io import BytesIO
                parsed = parse_docx(BytesIO(data))
                parsed["fileName"] = base
                results.append(parsed)
            except DocxParseError as exc:
                results.append({
                    "fileName": base,
                    "error": str(exc),
                })
    return results
