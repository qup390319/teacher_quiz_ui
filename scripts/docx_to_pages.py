"""把 108 課綱知識節點關聯圖 docx 渲染成 PNG 頁面。

Windows + Microsoft Word 環境用。流程：
  docx ──Word COM──▶ PDF ──pypdfium2──▶ PNG（每頁一張）

依賴：
  - Windows + Microsoft Word（用 COM 把 docx 轉 PDF；LibreOffice 不一定能完整保留 SmartArt/連接線）
  - Python 3.10+，套件 `pypdfium2 Pillow`
  - 若無 Word 可改用 LibreOffice：把下方 `_docx_to_pdf` 內的 Word COM 換成 `soffice --headless --convert-to pdf`

用法：
  python scripts/docx_to_pages.py "C:\\path\\to\\Ab.docx" --out "C:\\tmp\\Ab_pages"

輸出：
  out/page01.png, page02.png, ...
  out/page01_diagram.png, page02_diagram.png, ...（每頁裁切下半 55% 給 LLM 解讀箭頭用）

實務上之後在會話裡直接 Read out/pageNN_diagram.png 即可看清楚箭頭方向。
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

try:
    import pypdfium2 as pdfium
    from PIL import Image
except ImportError as e:  # pragma: no cover
    print(f"缺少套件：{e}\n請先 `pip install pypdfium2 Pillow`", file=sys.stderr)
    sys.exit(2)


def _docx_to_pdf(src: Path, dst: Path) -> None:
    """用 Word COM 把 docx 轉成 PDF。"""
    if dst.exists():
        dst.unlink()
    # pywin32 在 Windows 上一般已隨 Word 安裝；用 win32com.client。
    try:
        import win32com.client  # type: ignore
    except ImportError:
        print("缺少 pywin32（Word COM 需要）。Windows 請 `pip install pywin32`，或改用 LibreOffice。", file=sys.stderr)
        sys.exit(2)

    word = win32com.client.DispatchEx("Word.Application")
    word.Visible = False
    try:
        doc = word.Documents.Open(str(src), False, True)  # ConfirmConversions, ReadOnly
        # 17 = wdFormatPDF
        doc.SaveAs2(str(dst), 17)
        doc.Close(False)
    finally:
        word.Quit()
    if not dst.exists():
        raise RuntimeError(f"PDF 轉檔失敗：{dst}")


def _render_pdf_to_png(pdf: Path, out_dir: Path, scale: float = 2.0) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    pngs: list[Path] = []
    doc = pdfium.PdfDocument(str(pdf))
    for i, page in enumerate(doc):
        bmp = page.render(scale=scale)
        pil = bmp.to_pil()
        png = out_dir / f"page{i + 1:02d}.png"
        pil.save(png)
        pngs.append(png)
        # 同時裁下半部，焦點在「關聯圖」區域，方便視覺辨識
        w, h = pil.size
        crop = pil.crop((0, int(h * 0.40), w, h))
        crop.save(out_dir / f"page{i + 1:02d}_diagram.png")
    return pngs


def main() -> int:
    p = argparse.ArgumentParser(description="docx → PDF → PNG（含關聯圖裁圖）")
    p.add_argument("docx", help="輸入 docx 絕對路徑")
    p.add_argument("--out", required=True, help="輸出資料夾")
    p.add_argument("--scale", type=float, default=2.0, help="PDF 渲染倍率（預設 2.0 = 約 192dpi）")
    p.add_argument("--keep-pdf", action="store_true", help="保留中間 PDF 不刪除")
    args = p.parse_args()

    src = Path(args.docx).resolve()
    if not src.exists():
        print(f"找不到 docx：{src}", file=sys.stderr)
        return 1
    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    pdf = out_dir / (src.stem + ".pdf")
    print(f"[1/2] 轉 PDF → {pdf}")
    _docx_to_pdf(src, pdf)

    print(f"[2/2] 渲染 PNG → {out_dir}")
    pngs = _render_pdf_to_png(pdf, out_dir, scale=args.scale)
    for png in pngs:
        print(f"  • {png.name}  + {png.stem}_diagram{png.suffix}")

    if not args.keep_pdf:
        try:
            os.remove(pdf)
        except OSError:
            pass

    print("done")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
