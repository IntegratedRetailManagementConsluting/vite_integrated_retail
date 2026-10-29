/**
 * Cloudflare Pages Function: /api/posts
 *
 * Edge Proxy and Cache for WordPress REST API posts.
 * Caches responses at Cloudflare Edge to protect the WordPress origin
 * and provide ultra-fast client-side delivery.
 */

const WP_ORIGIN = 'https://integratedretail.com';

// Language to WordPress category ID mappings
const LANG_CATEGORIES = {
  th: 239, // Thai
  id: 238, // Bahasa Indonesia
};

function formatPost(item, includeContent = false) {
  if (!item) return null;

  const featuredMedia = item._embedded?.['wp:featuredmedia']?.[0];
  const terms = item._embedded?.['wp:term']?.[0] || [];
  const author = item._embedded?.author?.[0];

  const categories = terms.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
  }));

  const data = {
    id: item.id,
    slug: item.slug,
    date: item.date,
    modified: item.modified,
    title: item.title?.rendered || '',
    excerpt: item.excerpt?.rendered || '',
    link: `/resources/post.html?slug=${encodeURIComponent(item.slug)}`,
    original_link: item.link || '',
    featured_image: featuredMedia?.source_url || null,
    featured_image_alt: featuredMedia?.alt_text || item.title?.rendered || '',
    categories,
    author: author?.name || 'Integrated Retail',
  };

  if (includeContent) {
    data.content = item.content?.rendered || '';
  }

  return data;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const slug = params.get('slug');
  const page = parseInt(params.get('page') || '1', 10);
  const perPage = Math.min(parseInt(params.get('per_page') || '9', 10), 50);
  const lang = (params.get('lang') || '').toLowerCase();
  const category = params.get('category') || params.get('categories');
  const search = params.get('search');

  const headers = {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400',
  };

  try {
    // 1. Single Post by Slug
    if (slug) {
      const wpUrl = new URL(`${WP_ORIGIN}/wp-json/wp/v2/posts`);
      wpUrl.searchParams.set('slug', slug);
      wpUrl.searchParams.set('_embed', '1');

      const wpRes = await fetch(wpUrl.toString(), {
        cf: {
          cacheTtl: 1800,
          cacheEverything: true,
        },
      });

      if (!wpRes.ok) {
        return new Response(
          JSON.stringify({ error: `WordPress API responded with ${wpRes.status}` }),
          { status: wpRes.status, headers }
        );
      }

      const items = await wpRes.json();
      if (!Array.isArray(items) || items.length === 0) {
        return new Response(JSON.stringify({ error: 'Post not found' }), {
          status: 404,
          headers,
        });
      }

      const post = formatPost(items[0], true);
      return new Response(JSON.stringify({ post }), {
        status: 200,
        headers,
      });
    }

    // 2. Listing of Posts
    const wpUrl = new URL(`${WP_ORIGIN}/wp-json/wp/v2/posts`);
    wpUrl.searchParams.set('_embed', '1');
    wpUrl.searchParams.set('page', String(page));
    wpUrl.searchParams.set('per_page', String(perPage));

    if (search) {
      wpUrl.searchParams.set('search', search);
    }

    if (category) {
      wpUrl.searchParams.set('categories', category);
    } else if (lang === 'th') {
      wpUrl.searchParams.set('categories', String(LANG_CATEGORIES.th));
    } else if (lang === 'id') {
      wpUrl.searchParams.set('categories', String(LANG_CATEGORIES.id));
    } else if (lang === 'en') {
      // Exclude Thai and Indonesian posts for English view
      wpUrl.searchParams.set('categories_exclude', `${LANG_CATEGORIES.th},${LANG_CATEGORIES.id}`);
    }

    const wpRes = await fetch(wpUrl.toString(), {
      cf: {
        cacheTtl: 1800,
        cacheEverything: true,
      },
    });

    if (!wpRes.ok) {
      return new Response(
        JSON.stringify({ error: `WordPress API responded with ${wpRes.status}` }),
        { status: wpRes.status, headers }
      );
    }

    const total = parseInt(wpRes.headers.get('x-wp-total') || '0', 10);
    const totalPages = parseInt(wpRes.headers.get('x-wp-totalpages') || '1', 10);
    const rawItems = await wpRes.json();

    const posts = Array.isArray(rawItems)
      ? rawItems.map((item) => formatPost(item, false))
      : [];

    return new Response(
      JSON.stringify({
        posts,
        total,
        totalPages,
        page,
        perPage,
      }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal proxy error' }),
      { status: 500, headers }
    );
  }
}
