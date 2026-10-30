#!/usr/bin/env python3
"""
Integrated Retail site builder.

Regenerates the <header> and <footer> block inside every page from the
single-source partials in partials/header.html and partials/footer.html
(plus partials/footer-newsletter.html for the homepage-only newsletter
signup block).

WHY THIS EXISTS
---------------
The header and footer used to be pasted into all 48 page files. Any nav
or footer change meant editing ~48 files by hand, and it was easy to
miss one or introduce a small inconsistency. Now there is exactly one
place to edit: the files in partials/. Run this script and it rewrites
every page's <header>...</header> and <footer>...</footer> block to
match, with the right "../" path depth and the right active nav
underline for that page's section.

The pages themselves stay ordinary, fully self-contained static HTML —
there is no template engine or include tag left in the shipped files,
so double-clicking any .html file and opening it straight from disk in
a browser keeps working exactly as before. This script is a one-time
"compile" step Claude (or Denise, if she has Python installed) runs
after editing a partial; it is not needed to just view the site.

USAGE
-----
    python3 build_site.py            # rewrite all pages
    python3 build_site.py --check    # dry run: report what would change, write nothing

HOW A PAGE'S NAV SECTION IS DETERMINED
---------------------------------------
Based on the page's top-level folder (see SECTION_MAP below). Pages
with no matching folder (e.g. contact/, clients/... see NO_ACTIVE_ROOTS)
get no active nav underline, matching the original hand-authored pages.
"""
import re
import sys
import glob
import os
import posixpath

SITE_ROOT = os.path.dirname(os.path.abspath(__file__))
PARTIALS_DIR = os.path.join(SITE_ROOT, "partials")

# Directories that are not part of the deployed site and must never be
# touched by the build (scratch/preview files Denise or Claude left
# alongside the real pages).
EXCLUDE_DIRS = {"partials", "Claude outputs", "dist", "node_modules", ".git", ".wrangler", ".dyad"}

# Top-level folder -> nav section name used in the __ACTIVE_<NAME>__
# placeholders in partials/header.html.
SECTION_MAP = {
    "about": "ABOUT",
    "solutions": "SOLUTION",
    "products": "PRODUCT",
    "product-cegid-retail": "PRODUCT",
    "product-footfallcam": "PRODUCT",
    "iposit": "PRODUCT",
    "ioptimo": "PRODUCT",
    "warewiser": "PRODUCT",
    "retaillium": "PRODUCT",
    "globriq": "PRODUCT",
    "retailpro-prism": "PRODUCT",
    "services": "SERVICES",
    "industries": "INDUSTRIES",
    "resources": "RESOURCES",
    "clients": "RESOURCES",
}
ALL_SECTIONS = ["ABOUT", "SOLUTION", "PRODUCT", "SERVICES", "INDUSTRIES", "RESOURCES"]

HEADER_RE = re.compile(r'<header class="site-header">.*?</header>', re.S)
FOOTER_RE = re.compile(r'<footer class="site-footer">.*?</footer>', re.S)


GTAG_RE = re.compile(r'<!-- Google tag \(gtag\.js\) -->.*?</script>\s*(?=\n*</head>)', re.DOTALL)
BOTPRESS_RE = re.compile(r'<div id="webchat"></div>.*?</script>\s*(?=\s*<script[^>]*assets/js/|\s*</body>)', re.DOTALL)
CHAT_WIDGET_RE = re.compile(r'<div class="chat-widget">.*?<div class="chat-widget-footer-note">.*?</div>\s*</div>\s*</div>', re.DOTALL)


def load_partials():
    with open(os.path.join(PARTIALS_DIR, "header.html"), encoding="utf-8") as f:
        header_tpl = f.read()
    with open(os.path.join(PARTIALS_DIR, "footer.html"), encoding="utf-8") as f:
        footer_tpl = f.read()
    with open(os.path.join(PARTIALS_DIR, "footer-newsletter.html"), encoding="utf-8") as f:
        newsletter_html = f.read()
    gtag_path = os.path.join(PARTIALS_DIR, "gtag.html")
    gtag_html = open(gtag_path, encoding="utf-8").read().strip() if os.path.exists(gtag_path) else None
    botpress_path = os.path.join(PARTIALS_DIR, "botpress.html")
    botpress_html = open(botpress_path, encoding="utf-8").read().strip() if os.path.exists(botpress_path) else None
    return header_tpl, footer_tpl, newsletter_html, gtag_html, botpress_html


def site_pages():
    pages = []
    for path in sorted(glob.glob(os.path.join(SITE_ROOT, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(path, SITE_ROOT)
        top = rel.split(os.sep)[0]
        if top in EXCLUDE_DIRS:
            continue
        pages.append(rel)
    return pages


def active_section_for(rel_path):
    top = rel_path.split(os.sep)[0]
    return SECTION_MAP.get(top)


def render_header(header_tpl, root_prefix, active_section):
    out = header_tpl.replace("__ROOT__", root_prefix)
    for section in ALL_SECTIONS:
        token = f"__ACTIVE_{section}__"
        out = out.replace(token, " active" if section == active_section else "")
    return out


NEWSLETTER_LINE_RE = re.compile(r'^[ \t]*__NEWSLETTER__[ \t]*\n', re.M)


def get_build_number():
    if os.environ.get("BUILD_NUMBER"):
        return os.environ["BUILD_NUMBER"].strip()
    commit = os.environ.get("CF_PAGES_COMMIT_SHA")
    if commit:
        import datetime
        now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d")
        return f"{now_str}.{commit[:7]}"
    try:
        import subprocess
        out = subprocess.check_output(
            ["git", "log", "-1", "--format=%cd.%h", "--date=format:%Y%m%d"],
            cwd=SITE_ROOT,
            stderr=subprocess.DEVNULL
        ).decode("utf-8").strip()
        if out:
            return out
    except Exception:
        pass
    import datetime
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d")


def render_footer(footer_tpl, newsletter_html, root_prefix, is_homepage, build_number):
    out = footer_tpl.replace("__ROOT__", root_prefix).replace("__BUILD_NUMBER__", build_number)
    if is_homepage:
        # Splice in the newsletter block in place of its own placeholder
        # line, keeping the block's own indentation intact.
        out = NEWSLETTER_LINE_RE.sub(newsletter_html.strip("\n") + "\n", out)
    else:
        # Every other page has no newsletter signup: drop the
        # placeholder line entirely so no blank line is left behind.
        out = NEWSLETTER_LINE_RE.sub("", out)
    return out


FOOTER_LINK_RE = re.compile(r'<a href="([^"]+)"')


def mark_current_footer_link(footer_html, rel_path):
    """Add class="is-current" aria-current="page" to the footer link(s) for
    the page being built, so the visitor can see where they are.

    Matching is by folder: the link whose target folder is the page's own
    folder, or the closest parent folder, wins (so a blog post highlights
    "Resources", and /resources/faq/ highlights "FAQ"). Home only matches
    on the homepage itself. External, mailto and in-page links are ignored.
    """
    page_dir = posixpath.dirname(rel_path.replace(os.sep, "/"))

    def target_dir(href):
        if href.startswith(("http:", "https:", "mailto:", "tel:", "#", "javascript:")):
            return None
        t = posixpath.normpath(posixpath.join(page_dir, href.split("#")[0].split("?")[0]))
        if t.endswith("index.html"):
            t = posixpath.dirname(t)
        return "" if t == "." else t

    best, best_score = None, -1
    for m in FOOTER_LINK_RE.finditer(footer_html):
        t = target_dir(m.group(1))
        if t is None:
            continue
        if t == "":
            score = 0 if page_dir == "" else -1
            if page_dir == "":
                score = 1000
        elif page_dir == t or page_dir.startswith(t + "/"):
            score = len(t)
        else:
            score = -1
        if score > best_score:
            best, best_score = t, score
    if best is None or best_score < 0:
        return footer_html

    def repl(m):
        t = target_dir(m.group(1))
        if t == best:
            return '<a class="is-current" aria-current="page" href="%s"' % m.group(1)
        return m.group(0)

    return FOOTER_LINK_RE.sub(repl, footer_html)


def build(check_only=False):
    header_tpl, footer_tpl, newsletter_html, gtag_html, botpress_html = load_partials()
    pages = site_pages()
    build_num = get_build_number()

    changed = []
    unchanged = []
    skipped_no_header = []

    for rel in pages:
        path = os.path.join(SITE_ROOT, rel)
        with open(path, encoding="utf-8") as f:
            content = f.read()

        if not HEADER_RE.search(content) or not FOOTER_RE.search(content):
            skipped_no_header.append(rel)
            continue

        depth = rel.count(os.sep)
        root_prefix = "../" * depth
        active_section = active_section_for(rel)
        is_homepage = (rel == "index.html")

        new_header = render_header(header_tpl, root_prefix, active_section)
        new_footer = render_footer(footer_tpl, newsletter_html, root_prefix, is_homepage, build_num)
        new_footer = mark_current_footer_link(new_footer, rel)

        # Using a lambda replacement (rather than a plain string) means
        # re.sub inserts new_header/new_footer literally, with no
        # backslash/group-reference processing.
        new_content = HEADER_RE.sub(lambda m: new_header, content, count=1)
        new_content = FOOTER_RE.sub(lambda m: new_footer, new_content, count=1)

        # Sync Google Tag in <head>
        if gtag_html:
            if GTAG_RE.search(new_content):
                new_content = GTAG_RE.sub(lambda m: gtag_html, new_content, count=1)
            elif "</head>" in new_content and "G-N6ZQPDCEX1" not in new_content:
                new_content = new_content.replace("</head>", f"{gtag_html}\n</head>", 1)

        # Sync Botpress before </body>
        if botpress_html:
            if BOTPRESS_RE.search(new_content):
                new_content = BOTPRESS_RE.sub(lambda m: botpress_html, new_content, count=1)
            elif CHAT_WIDGET_RE.search(new_content):
                new_content = CHAT_WIDGET_RE.sub(lambda m: botpress_html, new_content, count=1)
            elif "</body>" in new_content and "botpress.cloud" not in new_content:
                new_content = new_content.replace("</body>", f"{botpress_html}\n</body>", 1)

        # Ensure site search scripts are present before </body>
        search_scripts = (
            f'<script src="{root_prefix}assets/js/search-index.js"></script>\n'
            f'<script src="{root_prefix}assets/js/search.js"></script>'
        )
        if "search.js" not in new_content and "</body>" in new_content:
            new_content = new_content.replace("</body>", f"{search_scripts}\n</body>", 1)

        if new_content != content:
            changed.append(rel)
            if not check_only:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
        else:
            unchanged.append(rel)

    print(f"Pages scanned: {len(pages)}")
    print(f"Pages changed: {len(changed)}")
    print(f"Pages unchanged: {len(unchanged)}")
    if skipped_no_header:
        print(f"Pages skipped (no <header>/<footer> found): {len(skipped_no_header)}")
        for r in skipped_no_header:
            print("  -", r)
    if check_only and changed:
        print("\n--check mode: no files were written. Changed pages would be:")
        for r in changed:
            print("  -", r)
    return changed


if __name__ == "__main__":
    check = "--check" in sys.argv
    build(check_only=check)
