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

SITE_ROOT = os.path.dirname(os.path.abspath(__file__))
PARTIALS_DIR = os.path.join(SITE_ROOT, "partials")

# Directories that are not part of the deployed site and must never be
# touched by the build (scratch/preview files Denise or Claude left
# alongside the real pages).
EXCLUDE_DIRS = {"partials", "Claude outputs"}

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


def load_partials():
    with open(os.path.join(PARTIALS_DIR, "header.html"), encoding="utf-8") as f:
        header_tpl = f.read()
    with open(os.path.join(PARTIALS_DIR, "footer.html"), encoding="utf-8") as f:
        footer_tpl = f.read()
    with open(os.path.join(PARTIALS_DIR, "footer-newsletter.html"), encoding="utf-8") as f:
        newsletter_html = f.read()
    return header_tpl, footer_tpl, newsletter_html


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


def render_footer(footer_tpl, newsletter_html, root_prefix, is_homepage):
    out = footer_tpl.replace("__ROOT__", root_prefix)
    if is_homepage:
        # Splice in the newsletter block in place of its own placeholder
        # line, keeping the block's own indentation intact.
        out = NEWSLETTER_LINE_RE.sub(newsletter_html.strip("\n") + "\n", out)
    else:
        # Every other page has no newsletter signup: drop the
        # placeholder line entirely so no blank line is left behind.
        out = NEWSLETTER_LINE_RE.sub("", out)
    return out


def build(check_only=False):
    header_tpl, footer_tpl, newsletter_html = load_partials()
    pages = site_pages()

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
        new_footer = render_footer(footer_tpl, newsletter_html, root_prefix, is_homepage)

        # Using a lambda replacement (rather than a plain string) means
        # re.sub inserts new_header/new_footer literally, with no
        # backslash/group-reference processing.
        new_content = HEADER_RE.sub(lambda m: new_header, content, count=1)
        new_content = FOOTER_RE.sub(lambda m: new_footer, new_content, count=1)

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
