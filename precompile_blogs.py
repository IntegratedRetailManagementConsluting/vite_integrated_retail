#!/usr/bin/env python3
"""
Precompile WordPress Blog Posts for Integrated Retail

Fetches all published posts from the headless WordPress instance
(https://cms.integratedretail.com/wp-json/wp/v2/posts) and compiles:
1. Static HTML files: /resources/<slug>/index.html for every post
2. Blog posts data file: /assets/data/posts.json for static blog listing/filtering
3. Updated search index: /assets/js/search-index.js with all blog posts

Zero external pip dependencies required — uses only standard library.
"""

import os
import re
import sys
import json
import time
import html
import urllib.request
import urllib.error
from datetime import datetime, timezone

SITE_ROOT = os.path.dirname(os.path.abspath(__file__))
WP_API_ORIGIN = os.environ.get("WP_API_ORIGIN", "https://cms.integratedretail.com").rstrip("/")
RESOURCES_DIR = os.path.join(SITE_ROOT, "resources")
DATA_DIR = os.path.join(SITE_ROOT, "assets", "data")
CACHE_FILE = os.path.join(SITE_ROOT, "data", "wordpress_posts_cache.json")
SEARCH_INDEX_FILE = os.path.join(SITE_ROOT, "assets", "js", "search-index.js")

USER_AGENT = "IntegratedRetailSiteBuilder/1.0 (+https://integratedretail.com)"


def fetch_url(url, retries=3, backoff=2):
    """Fetch URL with retry logic for LiteSpeed/shared hosting resilience."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                total_pages = int(response.headers.get("X-WP-TotalPages", 1))
                total_posts = int(response.headers.get("X-WP-Total", 0))
                data = json.loads(response.read().decode("utf-8"))
                return data, total_pages, total_posts
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            if attempt < retries:
                wait_time = backoff * attempt
                print(f"  [!] Request to {url} failed ({e}). Retrying in {wait_time}s (attempt {attempt}/{retries})...")
                time.sleep(wait_time)
            else:
                raise e


def fetch_all_posts(use_cache=False):
    """Fetch all posts across pages from WordPress REST API."""
    if use_cache and os.path.exists(CACHE_FILE):
        print(f"Loading posts from local cache: {CACHE_FILE}")
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    print(f"Fetching posts from WordPress API: {WP_API_ORIGIN}/wp-json/wp/v2/posts ...")
    posts = []
    page = 1
    per_page = 20  # Safe batch size to avoid LiteSpeed 503 limits
    total_pages = 1
    total_posts = 0

    while page <= total_pages:
        url = f"{WP_API_ORIGIN}/wp-json/wp/v2/posts?_embed=1&per_page={per_page}&page={page}"
        print(f"  Fetching page {page}/{total_pages}...")
        try:
            batch, total_pages_header, total_posts_header = fetch_url(url)
            total_pages = total_pages_header
            total_posts = total_posts_header
            if isinstance(batch, list):
                posts.extend(batch)
            print(f"    Page {page} OK ({len(batch)} posts, accumulated {len(posts)}/{total_posts})")
            page += 1
            # Brief pause to respect hosting rate limits
            time.sleep(0.3)
        except Exception as e:
            print(f"  [ERROR] Failed to fetch page {page}: {e}")
            if os.path.exists(CACHE_FILE):
                print("  Falling back to previously saved cache file...")
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            raise e

    # Save cache
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)
    print(f"Cached {len(posts)} posts to {CACHE_FILE}")

    return posts


def clean_html(raw_html):
    """Strip tags and unescape entities for meta description and excerpts."""
    if not raw_html:
        return ""
    text = re.sub(r"<[^>]+>", " ", raw_html)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def format_date(iso_date):
    """Format ISO date string to human readable e.g. 24 October 2025."""
    if not iso_date:
        return ""
    try:
        dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
        return dt.strftime("%d %B %Y")
    except Exception:
        return iso_date.split("T")[0]


def calculate_reading_time(text):
    """Estimate reading time in minutes."""
    words = len(text.split())
    minutes = max(1, round(words / 200))
    return f"{minutes} min read"


def sanitize_content(raw_content):
    """Rewrite any internal cms.integratedretail.com URLs to public site."""
    if not raw_content:
        return ""
    content = raw_content
    # Replace links pointing to cms.integratedretail.com
    content = re.sub(
        r'href=["\']https?://cms\.integratedretail\.com/([^"\']+)["\']',
        r'href="/resources/\1/"',
        content
    )
    # Ensure images have lazy loading
    content = re.sub(r"<img\s+(?![^>]*loading=)", '<img loading="lazy" decoding="async" ', content)
    return content


def extract_post_data(item):
    """Extract and normalize all required fields from raw WordPress post JSON."""
    raw_title = item.get("title", {}).get("rendered", "Untitled Article")
    clean_title = html.unescape(raw_title)

    raw_excerpt = item.get("excerpt", {}).get("rendered", "")
    clean_excerpt = clean_html(raw_excerpt)
    if len(clean_excerpt) > 160:
        clean_excerpt = clean_excerpt[:157] + "..."

    raw_content = item.get("content", {}).get("rendered", "")
    content = sanitize_content(raw_content)

    slug = item.get("slug", "").strip()

    # Featured image
    featured_media = None
    featured_image_url = None
    featured_image_alt = clean_title
    try:
        media_list = item.get("_embedded", {}).get("wp:featuredmedia", [])
        if media_list and isinstance(media_list, list) and len(media_list) > 0:
            featured_media = media_list[0]
            featured_image_url = featured_media.get("source_url")
            alt = featured_media.get("alt_text")
            if alt:
                featured_image_alt = alt
    except Exception:
        pass

    # Author
    author_name = "Integrated Retail"
    try:
        authors = item.get("_embedded", {}).get("author", [])
        if authors and len(authors) > 0:
            author_name = authors[0].get("name", "Integrated Retail")
    except Exception:
        pass

    # Categories
    categories = []
    primary_category = "Retail Insights"
    try:
        terms_groups = item.get("_embedded", {}).get("wp:term", [])
        if terms_groups and len(terms_groups) > 0:
            for term in terms_groups[0]:
                categories.append({
                    "id": term.get("id"),
                    "name": term.get("name"),
                    "slug": term.get("slug"),
                })
            if categories:
                primary_category = categories[0]["name"]
    except Exception:
        pass

    date_iso = item.get("date", "")
    date_display = format_date(date_iso)
    plain_text = clean_html(content)
    reading_time = calculate_reading_time(plain_text)

    # Determine language tag if present
    is_th = any(c.get("slug") == "th" for c in categories)
    is_id = any(c.get("slug") == "id" for c in categories)
    lang_code = "th" if is_th else ("id" if is_id else "en")

    return {
        "id": item.get("id"),
        "slug": slug,
        "title": clean_title,
        "raw_title": raw_title,
        "excerpt": clean_excerpt,
        "content": content,
        "date": date_iso,
        "date_display": date_display,
        "modified": item.get("modified", ""),
        "author": author_name,
        "categories": categories,
        "primary_category": primary_category,
        "featured_image": featured_image_url,
        "featured_image_alt": featured_image_alt,
        "reading_time": reading_time,
        "lang": lang_code,
        "url": f"/resources/{slug}/",
    }


def render_post_html(post):
    """Generate the complete self-contained HTML page for a single blog post."""
    canonical_url = f"https://integratedretail.com/resources/{post['slug']}/"
    meta_image = post["featured_image"] or "https://integratedretail.com/assets/img/og-default.jpg"

    banner_html = ""
    if post["featured_image"]:
        banner_html = f"""
    <div class="article-hero-banner">
      <img src="{html.escape(post['featured_image'])}" alt="{html.escape(post['featured_image_alt'])}" loading="eager" decoding="async">
    </div>"""

    return f"""<!DOCTYPE html>
<html lang="{post['lang']}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(post['title'])} | Integrated Retail</title>
<meta name="description" content="{html.escape(post['excerpt'])}">
<link rel="canonical" href="{canonical_url}">

<!-- OpenGraph / Social Meta Tags -->
<meta property="og:type" content="article">
<meta property="og:title" content="{html.escape(post['title'])}">
<meta property="og:description" content="{html.escape(post['excerpt'])}">
<meta property="og:url" content="{canonical_url}">
<meta property="og:image" content="{html.escape(meta_image)}">
<meta property="og:site_name" content="Integrated Retail">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{html.escape(post['title'])}">
<meta name="twitter:description" content="{html.escape(post['excerpt'])}">
<meta name="twitter:image" content="{html.escape(meta_image)}">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../assets/css/style.css">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230a1628'/%3E%3Cpolygon points='16,7 25,25 7,25' fill='%23c4181f'/%3E%3C/svg%3E">
</head>
<body>

<header class="site-header">
  <!-- Replaced by build_site.py -->
</header>

<!-- Article Header Section -->
<section class="page-hero article-hero" style="background: linear-gradient(180deg, rgba(8,18,34,0.75), rgba(8,18,34,0.92));">
  <div class="container">
    <div class="breadcrumb">
      <a href="../../index.html">Home</a> / <a href="../index.html">Resources</a> / <span>{html.escape(post['primary_category'])}</span>
    </div>
    
    <div>
      <h1 style="margin-top: 14px; max-width: 900px; color: #fff;">{html.escape(post['title'])}</h1>
      <div class="post-meta-bar" style="display:flex; align-items:center; gap:10px; margin-top:16px; flex-wrap:wrap; font-size:0.92rem; color:var(--slate-300,#cbd5e1);">
        <span class="badge-tag" style="background: var(--accent,#c4181f); color: #fff; padding:3px 10px; border-radius:4px; font-weight:600; font-size:0.8rem;">{html.escape(post['primary_category'])}</span>
        <span>{post['date_display']}</span>
        <span class="post-meta-dot">&bull;</span>
        <span>{html.escape(post['author'])}</span>
        <span class="post-meta-dot">&bull;</span>
        <span>{post['reading_time']}</span>
      </div>
    </div>
{banner_html}
  </div>
</section>

<!-- Article Content Section -->
<section>
  <div class="container" style="max-width: 820px; padding-top: 40px; padding-bottom: 60px;">
    <div class="article-body" style="font-size:1.08rem; line-height:1.75; color:var(--slate-800,#1e293b);">
      {post['content']}
    </div>

    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border,#e2e8f0); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <a href="../index.html" class="card-link" style="font-size: 0.95rem; font-weight: 600;">&larr; Back to all resources</a>
      <button type="button" class="btn btn-outline" onclick="window.scrollTo({{top:0, behavior:'smooth'}})" style="padding: 8px 16px; font-size: 0.85rem;">Back to Top &uarr;</button>
    </div>
  </div>
</section>

<!-- Call to action band -->
<section class="tight alt-bg">
  <div class="container">
    <div class="cta-band" style="background: linear-gradient(120deg, var(--navy-950,#050b14), var(--navy-700,#0f2744));">
      <div>
        <h2>Ready to modernize your retail technology?</h2>
        <p>Book a zero-obligation consultation with our regional retail systems experts.</p>
      </div>
      <a href="../../contact/index.html" class="btn btn-primary">Book a Consultation</a>
    </div>
  </div>
</section>

<footer class="site-footer">
  <!-- Replaced by build_site.py -->
</footer>

<script>window.__SITE_ROOT_PREFIX = "../../";</script>
<script src="../../assets/js/i18n.js"></script>
<script src="../../assets/js/main.js"></script>
</body>
</html>
"""


def update_search_index(posts_data):
    """Add all blog posts into search-index.js so visitors can search articles."""
    if not os.path.exists(SEARCH_INDEX_FILE):
        return

    # Static site sections that are part of the baseline search index
    baseline_entries = [
        {"t": "Home", "u": "index.html", "s": "Home"},
        {"t": "About Us — Company", "u": "about/index.html", "s": "About"},
        {"t": "Values & Culture", "u": "about/values/index.html", "s": "About"},
        {"t": "Careers", "u": "about/careers/index.html", "s": "About"},
        {"t": "Partners", "u": "about/partners/index.html", "s": "About"},
        {"t": "Our Solutions", "u": "solutions/index.html", "s": "Solution"},
        {"t": "RFID & Item-Level Tracking", "u": "solutions/rfid/index.html", "s": "Solution"},
        {"t": "Products Overview", "u": "products/index.html", "s": "Product"},
        {"t": "Cegid Retail", "u": "product-cegid-retail/index.html", "s": "Product · Point of Sale"},
        {"t": "Retail Pro Prism", "u": "retailpro-prism/index.html", "s": "Product · Point of Sale"},
        {"t": "FootfallCam", "u": "product-footfallcam/index.html", "s": "Product · Traffic & Location"},
        {"t": "iPosit", "u": "iposit/index.html", "s": "Product · AI & Merchandising"},
        {"t": "iOptimo", "u": "ioptimo/index.html", "s": "Product · AI & Merchandising"},
        {"t": "Warewiser", "u": "warewiser/index.html", "s": "Product · Warehouse Management"},
        {"t": "Retaillium", "u": "retaillium/index.html", "s": "Product · Unified Commerce & AI"},
        {"t": "Globriq", "u": "globriq/index.html", "s": "Product · Systems Integration"},
        {"t": "Services Overview", "u": "services/index.html", "s": "Services"},
        {"t": "Solution Design", "u": "services/solution-design/index.html", "s": "Services"},
        {"t": "Project Delivery", "u": "services/project-delivery/index.html", "s": "Services"},
        {"t": "Managed Services", "u": "services/managed-services/index.html", "s": "Services"},
        {"t": "Training", "u": "services/training/index.html", "s": "Services"},
        {"t": "Integration", "u": "services/integration/index.html", "s": "Services"},
        {"t": "Industries Overview", "u": "industries/index.html", "s": "Industries"},
        {"t": "Fashion & Apparel", "u": "industries/fashion-apparel/index.html", "s": "Industries"},
        {"t": "Health & Beauty", "u": "industries/health-beauty/index.html", "s": "Industries"},
        {"t": "F&B", "u": "industries/food-beverage/index.html", "s": "Industries"},
        {"t": "Shopping Malls", "u": "industries/shopping-malls/index.html", "s": "Industries"},
        {"t": "Luxury Retail", "u": "industries/luxury-retail/index.html", "s": "Industries"},
        {"t": "Groceries", "u": "industries/groceries/index.html", "s": "Industries"},
        {"t": "Department Stores", "u": "industries/departmental-stores/index.html", "s": "Industries"},
        {"t": "Resources — Blog & News", "u": "resources/index.html", "s": "Resources"},
        {"t": "Case Studies", "u": "clients/index.html", "s": "Resources"},
        {"t": "FAQ", "u": "resources/faq/index.html", "s": "Resources"},
        {"t": "Contact Us", "u": "contact/index.html", "s": "Contact"}
    ]

    # Add each post to search index
    for post in posts_data:
        baseline_entries.append({
            "t": post["title"],
            "u": f"resources/{post['slug']}/index.html",
            "s": f"Resources · {post['primary_category']}"
        })

    js_content = "// Site search index with static pages and precompiled blog articles.\n"
    js_content += "window.__SITE_SEARCH_INDEX = " + json.dumps(baseline_entries, ensure_ascii=False, indent=2) + ";\n"

    with open(SEARCH_INDEX_FILE, "w", encoding="utf-8") as f:
        f.write(js_content)
    print(f"Updated search index with {len(baseline_entries)} items ({len(posts_data)} articles)")


def main():
    use_cache = "--cache" in sys.argv
    print("==================================================")
    print("  Precompiling WordPress Blogs for Static Hosting ")
    print("==================================================")

    raw_posts = fetch_all_posts(use_cache=use_cache)
    if not raw_posts:
        print("No posts found. Exiting.")
        return

    processed_posts = []
    created_count = 0

    print(f"\nGenerating static HTML pages for {len(raw_posts)} posts...")
    for item in raw_posts:
        post = extract_post_data(item)
        if not post["slug"]:
            continue

        post_dir = os.path.join(RESOURCES_DIR, post["slug"])
        os.makedirs(post_dir, exist_ok=True)
        post_file = os.path.join(post_dir, "index.html")

        html_content = render_post_html(post)
        with open(post_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        # Store lighter representation for JSON listing
        processed_posts.append({
            "id": post["id"],
            "slug": post["slug"],
            "title": post["title"],
            "excerpt": post["excerpt"],
            "date": post["date"],
            "date_display": post["date_display"],
            "categories": post["categories"],
            "primary_category": post["primary_category"],
            "featured_image": post["featured_image"],
            "featured_image_alt": post["featured_image_alt"],
            "author": post["author"],
            "reading_time": post["reading_time"],
            "lang": post["lang"],
            "url": post["url"],
        })
        created_count += 1

    # Save data/posts.json
    os.makedirs(DATA_DIR, exist_ok=True)
    posts_json_path = os.path.join(DATA_DIR, "posts.json")
    with open(posts_json_path, "w", encoding="utf-8") as f:
        json.dump({
            "total": len(processed_posts),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "posts": processed_posts
        }, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(processed_posts)} articles to {posts_json_path}")

    # Update search index
    update_search_index(processed_posts)

    print(f"\nSuccessfully precompiled {created_count} blog pages into resources/<slug>/index.html!")
    print("Ready for partial injection by build_site.py.\n")


if __name__ == "__main__":
    main()
