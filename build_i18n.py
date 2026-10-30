#!/usr/bin/env python3
"""
build_i18n.py - makes every page translatable (English / Indonesian / Thai).

Two steps, both safe to re-run:

  python3 build_i18n.py tag        Walk every page, add data-i18n="t.<hash>" to each
                                   piece of body copy that doesn't have one yet, and
                                   write i18n/source.json (key -> English markup).
  python3 build_i18n.py bundle     Read i18n/translations/{id,th}.json and write the
                                   browser files assets/js/lang/{id,th}.js that
                                   assets/js/i18n.js loads on demand.
  python3 build_i18n.py report     List keys that still have no translation.

English stays in the HTML (single source of truth). Translations live in
i18n/translations/<lang>.json as {"t.xxxxxxxx": "translated markup"}.
The key is a hash of the English markup, so changing English copy produces a
new key and the page falls back to English until the new text is translated.
"""
import glob
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_JSON = os.path.join(ROOT, "i18n", "source.json")
TR_DIR = os.path.join(ROOT, "i18n", "translations")
LANG_DIR = os.path.join(ROOT, "assets", "js", "lang")
LANGS = ["id", "th"]

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}
RAW = {"script", "style"}
INLINE = {"a", "span", "strong", "b", "em", "i", "u", "br", "small", "sup",
          "sub", "mark", "abbr", "wbr", "cite", "time"}
# Elements that may carry a translation.
CANDIDATE = {"h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "td", "th",
             "figcaption", "dt", "dd", "blockquote", "summary", "button",
             "label", "a", "span", "div", "strong", "em", "legend", "option",
             "cite", "small", "b", "i"}
SKIP_SUBTREE = {"script", "style", "svg", "noscript", "pre", "code", "textarea", "select"}

TAG_RE = re.compile(
    r"<!--.*?-->|<(/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\"[^\"]*\"|'[^']*'|[^>\"'])*)>", re.S)


class El:
    __slots__ = ("tag", "o_start", "o_end", "c_start", "c_end", "attrs", "kids", "parent")

    def __init__(self, tag, o_start, o_end, attrs, parent):
        self.tag, self.o_start, self.o_end, self.attrs = tag, o_start, o_end, attrs
        self.c_start = self.c_end = None
        self.kids = []
        self.parent = parent


def parse(html, lo, hi):
    """Parse html[lo:hi] into a forest of El (only what we need)."""
    roots, stack = [], []
    pos = lo
    while True:
        m = TAG_RE.search(html, pos, hi)
        if not m:
            break
        pos = m.end()
        if m.group(0).startswith("<!--"):
            continue
        closing, tag, attrs = m.group(1), m.group(2).lower(), m.group(3)
        if closing:
            for i in range(len(stack) - 1, -1, -1):
                if stack[i].tag == tag:
                    for el in stack[i + 1:]:
                        el.c_start = el.c_end = m.start()
                    stack[i].c_start, stack[i].c_end = m.start(), m.end()
                    del stack[i:]
                    break
            continue
        parent = stack[-1] if stack else None
        el = El(tag, m.start(), m.end(), attrs, parent)
        (parent.kids if parent else roots).append(el)
        selfclose = attrs.rstrip().endswith("/")
        if tag in VOID or selfclose:
            el.c_start = el.c_end = m.end()
            continue
        if tag in RAW:
            end = re.search(r"</%s\s*>" % tag, html[pos:hi], re.I)
            if end:
                el.c_start = pos + end.start()
                el.c_end = pos + end.end()
                pos = el.c_end
            else:
                el.c_start = el.c_end = hi
            continue
        stack.append(el)
    for el in stack:
        el.c_start = el.c_end = hi
    return roots


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


def key_for(inner):
    return "t." + hashlib.sha1(norm(inner).encode("utf8")).hexdigest()[:8]


def inline_only(el):
    for k in el.kids:
        if k.tag not in INLINE or not inline_only(k):
            return False
    return True


def has_letters(html):
    txt = re.sub(r"<[^>]+>", " ", html)
    txt = re.sub(r"&[#a-zA-Z0-9]+;", " ", txt)
    return re.search(r"[^\W\d_]", txt) is not None


def collect(html, els, out):
    """Pick the outermost translatable elements."""
    for el in els:
        if el.tag in SKIP_SUBTREE or "data-i18n" in el.attrs:
            continue
        inner = html[el.o_end:el.c_start] if el.c_start is not None else ""
        if (el.tag in CANDIDATE and inline_only(el) and "data-i18n" not in inner
                and has_letters(inner)
                and not (el.tag == "div" and re.search(r"<(a|button)\b", inner))):
            out.append(el)
            continue
        collect(html, el.kids, out)


def loose_segments(html, el, out):
    """Text sitting directly inside a mixed-content element (e.g. the last
    breadcrumb, or an icon followed by a label). Returns (start, end) spans."""
    if el.c_start is None:
        return
    bounds = [el.o_end]
    spans = []
    cur = el.o_end
    for k in el.kids:
        spans.append((cur, k.o_start))
        cur = k.c_end if k.c_end is not None else k.o_end
    spans.append((cur, el.c_start))
    for a, b in spans:
        seg = html[a:b]
        if "<" in seg or not has_letters(seg):
            continue
        lead = len(seg) - len(seg.lstrip())
        trail = len(seg) - len(seg.rstrip())
        out.append((a + lead, b - trail))


def collect_loose(html, els, out):
    for el in els:
        if el.tag in SKIP_SUBTREE or "data-i18n" in el.attrs:
            continue
        inner = html[el.o_end:el.c_start] if el.c_start is not None else ""
        if (el.tag in CANDIDATE and inline_only(el) and "data-i18n" not in inner
                and has_letters(inner)
                and not (el.tag == "div" and re.search(r"<(a|button)\b", inner))):
            continue
        if el.tag in ("div", "li", "p", "span", "a", "td", "th", "section", "article", "header",
                      "ul", "main", "figure", "button", "label"):
            loose_segments(html, el, out)
        collect_loose(html, el.kids, out)


def region(html):
    m1 = re.search(r"</header>", html)
    m2 = re.search(r"<footer\b", html)
    if not m1:
        return 0, len(html)
    return m1.end(), (m2.start() if m2 and m2.start() > m1.end() else len(html))


PH_RE = re.compile(r"(<(?:input|textarea)\b)((?:\"[^\"]*\"|'[^']*'|[^>\"'])*?)(/?>)", re.S)


def tag_page(path, source):
    html = open(path, encoding="utf8").read()
    lo, hi = region(html)
    roots = parse(html, lo, hi)
    found = []
    collect(html, roots, found)
    edits = []
    loose = []
    collect_loose(html, roots, loose)
    for a, b in loose:
        txt = html[a:b]
        k = key_for(txt)
        source.setdefault(k, norm(txt))
        edits.append((a, '<span data-i18n="%s">' % k))
        edits.append((b, "</span>"))
    for el in found:
        inner = html[el.o_end:el.c_start]
        k = key_for(inner)
        source.setdefault(k, norm(inner))
        edits.append((el.o_end - 1 - (1 if el.attrs.rstrip().endswith("/") else 0),
                      ' data-i18n="%s"' % k))
    # placeholders (inputs/textareas): data-i18n-ph="key"
    for m in PH_RE.finditer(html, lo, hi):
        attrs = m.group(2)
        if "data-i18n-ph" in attrs:
            continue
        pm = re.search(r'placeholder="([^"]+)"', attrs)
        if pm and has_letters(pm.group(1)):
            k = key_for(pm.group(1))
            source.setdefault(k, norm(pm.group(1)))
            edits.append((m.start(3), ' data-i18n-ph="%s"' % k))
    # also record keys already present so source.json stays complete
    for el_key in re.finditer(r'data-i18n(?:-ph)?="(t\.[0-9a-f]{8})"', html):
        pass
    if edits:
        for pos, text in sorted(edits, reverse=True):
            html = html[:pos] + text + html[pos:]
        open(path, "w", encoding="utf8").write(html)
    return len(edits)


EXCLUDE_DIRS = {"partials", "Claude outputs", "dist", "node_modules", ".git", ".wrangler", ".dyad", ".gemini", "assets_bk"}


def cmd_tag():
    source = {}
    if os.path.exists(SRC_JSON):
        source = json.load(open(SRC_JSON, encoding="utf8"))
    total = 0
    pages = []
    for p in sorted(glob.glob(os.path.join(ROOT, "**", "index.html"), recursive=True)):
        rel = os.path.relpath(p, ROOT)
        if rel.split(os.sep)[0] in EXCLUDE_DIRS:
            continue
        pages.append(p)
    for p in pages:
        total += tag_page(p, source)
    # Re-derive the full source list from every tagged element so source.json
    # always matches the HTML exactly.
    full = {}
    for p in pages:
        html = open(p, encoding="utf8").read()
        lo, hi = region(html)
        roots = parse(html, lo, hi)
        stack = list(roots)
        while stack:
            el = stack.pop()
            stack.extend(el.kids)
            m = re.search(r'data-i18n="(t\.[0-9a-f]{8})"', el.attrs)
            if m and el.c_start is not None:
                full[m.group(1)] = norm(html[el.o_end:el.c_start])
        for m in re.finditer(r'<(?:input|textarea)\b[^>]*data-i18n-ph="(t\.[0-9a-f]{8})"[^>]*>', html):
            pm = re.search(r'placeholder="([^"]+)"', m.group(0))
            if pm:
                full[m.group(1)] = norm(pm.group(1))
    os.makedirs(os.path.dirname(SRC_JSON), exist_ok=True)
    json.dump(dict(sorted(full.items())), open(SRC_JSON, "w", encoding="utf8"),
              ensure_ascii=False, indent=1)
    print("tagged %d new elements; %d unique strings in i18n/source.json" % (total, len(full)))


def load_tr(lang):
    p = os.path.join(TR_DIR, lang + ".json")
    return json.load(open(p, encoding="utf8")) if os.path.exists(p) else {}


def cmd_bundle():
    src = json.load(open(SRC_JSON, encoding="utf8"))
    os.makedirs(LANG_DIR, exist_ok=True)
    for lang in LANGS:
        tr = load_tr(lang)
        out = {k: tr[k] for k in src if k in tr and tr[k].strip()}
        js = ("// Page-copy translations (%s). Generated by build_i18n.py from "
              "i18n/translations/%s.json - edit that file, then rebuild.\n"
              "window.IR_LANG_PAGES=window.IR_LANG_PAGES||{};"
              "window.IR_LANG_PAGES[%s]=%s;\n") % (
            lang, lang, json.dumps(lang), json.dumps(out, ensure_ascii=False, separators=(",", ":")))
        open(os.path.join(LANG_DIR, lang + ".js"), "w", encoding="utf8").write(js)
        print("%s: %d of %d strings -> assets/js/lang/%s.js" % (lang, len(out), len(src), lang))


def cmd_report():
    src = json.load(open(SRC_JSON, encoding="utf8"))
    for lang in LANGS:
        tr = load_tr(lang)
        missing = [k for k in src if not tr.get(k, "").strip()]
        print("%s: %d missing of %d" % (lang, len(missing), len(src)))
        for k in missing[:20]:
            print("   ", k, src[k][:80])


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    {"tag": cmd_tag, "bundle": cmd_bundle, "report": cmd_report}.get(
        cmd, lambda: print(__doc__))()
