"""Build index.html: a single self-contained, offline file.

Embeds into app.template.html:
  - form-template.jpg        (the scanned form, as background)
  - vendor/amiri-400.css + woff2 files (Amiri font, OFL)
  - vendor/jspdf.umd.min.js  (jsPDF 2.5.1, MIT)
Run:  python3 build.py
"""
import base64, pathlib, re
here = pathlib.Path(__file__).parent
v = here / "vendor"
b64 = lambda p: base64.b64encode(p.read_bytes()).decode()

css = (v / "amiri-400.css").read_text(encoding="utf-8")
css = re.sub(r"url\(\./files/([^)]+?\.woff2)\)",
             lambda m: f"url(data:font/woff2;base64,{b64(v / m.group(1))})", css)
css = re.sub(r",\s*url\(\./files/[^)]+?\.woff\)\s*format\('woff'\)", "", css)

html = (here / "app.template.html").read_text(encoding="utf-8")
html = html.replace("/*__AMIRI_FONT__*/", css)
html = html.replace("/*__JSPDF__*/", (v / "jspdf.umd.min.js").read_text(encoding="utf-8"))
html = html.replace("__FORM_IMG__", "data:image/jpeg;base64," + b64(here / "form-template.jpg"))
assert "url(./files" not in html
(here / "index.html").write_text(html, encoding="utf-8")
print(f"index.html written ({len(html)//1024} KB)")
