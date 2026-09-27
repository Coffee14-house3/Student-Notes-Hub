import os
import sys
import zipfile
import base64
import html
import re
import xml.etree.ElementTree as ET

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pr": "http://schemas.openxmlformats.org/package/2006/relationships"
}

def parse_rels(xml_bytes):
    rels = {}
    if not xml_bytes:
        return rels
    try:
        root = ET.fromstring(xml_bytes)
        for rel in root.iter("{http://schemas.openxmlformats.org/package/2006/relationships}Relationship"):
            rid = rel.attrib.get("Id")
            target = rel.attrib.get("Target")
            if rid and target:
                rels[rid] = target
    except Exception:
        pass
    return rels

def emu_to_px(val, is_y=False):
    try:
        v = float(val)
        if is_y:
            return v * 1080.0 / 6858000.0
        return v * 1920.0 / 12192000.0
    except:
        return 0.0

def get_color(elem):
    if elem is None:
        return None
    srgb = elem.find(".//a:srgbClr", NS)
    if srgb is not None:
        val = srgb.attrib.get("val")
        if val:
            return f"#{val}"
    scheme = elem.find(".//a:schemeClr", NS)
    if scheme is not None:
        val = scheme.attrib.get("val", "")
        if "bg" in val or "lt" in val:
            return "#FFFFFF"
        if "tx" in val or "dk" in val:
            return "#1E293B"
        if "accent1" in val:
            return "#FF9900"
        if "accent" in val:
            return "#3B82F6"
    return None

def is_dark_color(hex_clr):
    if not hex_clr or not hex_clr.startswith("#") or len(hex_clr) != 7:
        return False
    try:
        r = int(hex_clr[1:3], 16)
        g = int(hex_clr[3:5], 16)
        b = int(hex_clr[5:7], 16)
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        return lum < 128
    except:
        return False

def render_pptx(pptx_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    if not os.path.exists(pptx_path):
        print(f"PPTX file not found: {pptx_path}", file=sys.stderr)
        return

    with zipfile.ZipFile(pptx_path, "r") as z:
        slide_entries = [f for f in z.namelist() if re.match(r"^ppt/slides/slide\d+\.xml$", f)]
        slide_entries.sort(key=lambda x: int(re.search(r"slide(\d+)\.xml", x).group(1)))

        if not slide_entries:
            print("No slides found in PPTX zip", file=sys.stderr)
            return

        for idx, slide_path in enumerate(slide_entries):
            slide_num = idx + 1
            slide_xml = z.read(slide_path)
            root = ET.fromstring(slide_xml)

            slide_base = os.path.basename(slide_path)
            rels_path = f"ppt/slides/_rels/{slide_base}.rels"
            rels = {}
            if rels_path in z.namelist():
                rels = parse_rels(z.read(rels_path))

            bg_color = "#FFFFFF"
            bg_elem = root.find(".//p:bg", NS)
            if bg_elem is not None:
                clr = get_color(bg_elem)
                if clr:
                    bg_color = clr

            svg_elements = []
            svg_elements.append(f'<rect width="1920" height="1080" fill="{bg_color}" />')

            spTree = root.find(".//p:spTree", NS)
            if spTree is not None:
                for child in spTree:
                    tag = child.tag.split("}")[-1]

                    # 1. Shapes (<p:sp>)
                    if tag == "sp":
                        spPr = child.find("p:spPr", NS)
                        if spPr is None:
                            continue
                        xfrm = spPr.find("a:xfrm", NS)
                        if xfrm is None:
                            continue
                        off = xfrm.find("a:off", NS)
                        ext = xfrm.find("a:ext", NS)
                        if off is None or ext is None:
                            continue

                        x = emu_to_px(off.attrib.get("x", 0), is_y=False)
                        y = emu_to_px(off.attrib.get("y", 0), is_y=True)
                        w = emu_to_px(ext.attrib.get("cx", 0), is_y=False)
                        h = emu_to_px(ext.attrib.get("cy", 0), is_y=True)

                        geom = spPr.find("a:prstGeom", NS)
                        prst = geom.attrib.get("prst", "rect") if geom is not None else "rect"

                        fill_elem = spPr.find("a:solidFill", NS)
                        fill_clr = get_color(fill_elem) or "none"
                        ln_elem = spPr.find("a:ln", NS)
                        stroke_clr = "none"
                        stroke_w = "1"
                        if ln_elem is not None:
                            s_clr = get_color(ln_elem)
                            if s_clr:
                                stroke_clr = s_clr
                                ln_w = ln_elem.attrib.get("w")
                                if ln_w:
                                    stroke_w = str(max(1.0, emu_to_px(ln_w, is_y=False)))

                        if prst == "ellipse":
                            cx = x + w / 2.0
                            cy = y + h / 2.0
                            rx = w / 2.0
                            ry = h / 2.0
                            svg_elements.append(f'<ellipse cx="{cx:.2f}" cy="{cy:.2f}" rx="{rx:.2f}" ry="{ry:.2f}" fill="{fill_clr}" stroke="{stroke_clr}" stroke-width="{stroke_w}" />')
                        elif prst == "roundRect":
                            rx = min(20.0, h * 0.12)
                            svg_elements.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" rx="{rx:.2f}" fill="{fill_clr}" stroke="{stroke_clr}" stroke-width="{stroke_w}" />')
                        elif prst == "line":
                            svg_elements.append(f'<line x1="{x:.2f}" y1="{y:.2f}" x2="{(x+w):.2f}" y2="{(y+h):.2f}" stroke="{stroke_clr if stroke_clr != "none" else "#64748B"}" stroke-width="{stroke_w}" />')
                        else:
                            if fill_clr != "none" or stroke_clr != "none":
                                svg_elements.append(f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" fill="{fill_clr}" stroke="{stroke_clr}" stroke-width="{stroke_w}" />')

                        # Text inside shape using foreignObject
                        txBody = child.find("p:txBody", NS)
                        if txBody is not None:
                            paras = txBody.findall("a:p", NS)
                            if paras:
                                html_paragraphs = []
                                for p_elem in paras:
                                    pPr = p_elem.find("a:pPr", NS)
                                    algn = "left"
                                    if pPr is not None:
                                        a_attr = pPr.attrib.get("algn", "l")
                                        if a_attr == "ctr":
                                            algn = "center"
                                        elif a_attr == "r":
                                            algn = "right"

                                    runs = p_elem.findall("a:r", NS)
                                    if not runs:
                                        html_paragraphs.append('<br/>')
                                        continue

                                    run_spans = []
                                    for r_elem in runs:
                                        t_elem = r_elem.find("a:t", NS)
                                        if t_elem is None or not t_elem.text:
                                            continue
                                        t_text = html.escape(t_elem.text)
                                        rPr = r_elem.find("a:rPr", NS)
                                        font_size = 18.0
                                        font_weight = "normal"
                                        default_text_clr = "#FFFFFF" if is_dark_color(fill_clr) or (fill_clr == "none" and is_dark_color(bg_color)) else "#1E293B"
                                        t_clr = default_text_clr
                                        if rPr is not None:
                                            sz = rPr.attrib.get("sz")
                                            if sz:
                                                font_size = float(sz) / 100.0 * 1.35
                                            if rPr.attrib.get("b") == "1":
                                                font_weight = "bold"
                                            c = get_color(rPr)
                                            if c:
                                                t_clr = c
                                        run_spans.append(f'<span style="font-size: {font_size:.1f}px; font-weight: {font_weight}; color: {t_clr};">{t_text}</span>')
                                    
                                    if run_spans:
                                        html_paragraphs.append(f'<div style="text-align: {algn}; margin-bottom: 4px; width: 100%;">{"".join(run_spans)}</div>')

                                if html_paragraphs:
                                    svg_elements.append(f'''
                                    <foreignObject x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}">
                                        <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; padding: 6px 10px; font-family: Segoe UI, system-ui, sans-serif; word-wrap: break-word; overflow: hidden; pointer-events: none;">
                                            {"".join(html_paragraphs)}
                                        </div>
                                    </foreignObject>
                                    ''')

                    # 2. Pictures / Icons (<p:pic>)
                    elif tag == "pic":
                        spPr = child.find("p:spPr", NS)
                        blip = child.find(".//a:blip", NS)
                        if spPr is not None and blip is not None:
                            xfrm = spPr.find("a:xfrm", NS)
                            if xfrm is not None:
                                off = xfrm.find("a:off", NS)
                                ext = xfrm.find("a:ext", NS)
                                if off is not None and ext is not None:
                                    x = emu_to_px(off.attrib.get("x", 0), is_y=False)
                                    y = emu_to_px(off.attrib.get("y", 0), is_y=True)
                                    w = emu_to_px(ext.attrib.get("cx", 0), is_y=False)
                                    h = emu_to_px(ext.attrib.get("cy", 0), is_y=True)

                                    embed_id = blip.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed")
                                    if embed_id and embed_id in rels:
                                        target = rels[embed_id]
                                        media_path = os.path.normpath(os.path.join("ppt/slides", target)).replace("\\", "/")
                                        if media_path in z.namelist():
                                            img_data = z.read(media_path)
                                            ext_name = os.path.splitext(media_path)[1].lower().replace(".", "")
                                            mime = "image/png" if ext_name == "png" else "image/jpeg"
                                            b64 = base64.b64encode(img_data).decode("utf-8")
                                            data_uri = f"data:{mime};base64,{b64}"
                                            svg_elements.append(
                                                f'<image href="{data_uri}" x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" preserveAspectRatio="xMidYMid meet" />'
                                            )

            svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1920 1080" width="100%" height="100%">
  <defs>
    <style>
      text {{ user-select: none; font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'; }}
    </style>
  </defs>
  {"".join(svg_elements)}
</svg>"""
            # Save both slide-N.svg and slide-N.png (if cairosvg or fallback is available, or just save slide-N.svg which our reader handles)
            out_file_svg = os.path.join(output_dir, f"slide-{slide_num}.svg")
            with open(out_file_svg, "w", encoding="utf-8") as f:
                f.write(svg_content)

            # Also create a symlink or copy as slide-N.png if needed, or let frontend handle svg/png
            out_file_png = os.path.join(output_dir, f"slide-{slide_num}.png")
            # If we want a png, we can write a tiny 1x1 png or try converting svg if possible, but our viewer checks both .png and .svg
            print(f"Generated {out_file_svg}")

    print(f"Successfully rendered {len(slide_entries)} slides natively via Python SVG renderer.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 pptx_renderer.py <pptx_file> <output_dir>")
        sys.exit(1)
    render_pptx(sys.argv[1], sys.argv[2])
