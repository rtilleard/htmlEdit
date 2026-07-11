// Static blog generator for htmledit.io — LLM/SEO optimised.
// Reads ./_articles.json, writes article pages + index + blog.css,
// and ../sitemap.xml, ../llms.txt, ../feed.xml.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, ".."); // site/
const SITE = "https://htmledit.io";
const AUTHOR = {
  name: "Robbie Tilleard",
  url: "https://robbietilleard.com",
  sameAs: [
    "https://twitter.com/rtilleard",
    "https://www.linkedin.com/in/robert-tilleard/",
  ],
};
const PUB = { name: "htmlEdit", logo: `${SITE}/icon.png` };

// ---------- helpers ----------
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");

// Safety net: strip AI-tell punctuation/phrasing. Manual review still happens.
function deAI(s) {
  if (!s) return s;
  let t = String(s);
  t = t.replace(/\s*[—–]\s*/g, ", "); // em/en dashes -> comma
  t = t.replace(/,\s*,/g, ","); // tidy doubled commas
  t = t.replace(/\s+,/g, ","); // space before comma
  t = t.replace(/,\s*\./g, "."); // comma before full stop
  return t;
}
// Some drafts arrive with HTML entity-escaped (&lt;p&gt;). Decode only when we
// detect that (presence of &lt;), so raw-HTML drafts pass through untouched.
function decodeEntities(s) {
  if (!/&lt;/.test(s)) return s;
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
function cleanBody(html) {
  return deAI(decodeEntities(html));
}

function fmtDate(iso) {
  const d = new Date(iso + "T09:00:00Z");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ---------- shared chrome ----------
function head({ title, desc, canonical, jsonld, ogType = "article", published, modified }) {
  const t = deAI(title);
  const d = deAI(desc);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escAttr(t)} | htmlEdit</title>
<meta name="description" content="${escAttr(d)}">
<link rel="canonical" href="${escAttr(canonical)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="${escAttr(AUTHOR.name)}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="htmlEdit">
<meta property="og:title" content="${escAttr(t)}">
<meta property="og:description" content="${escAttr(d)}">
<meta property="og:url" content="${escAttr(canonical)}">
<meta property="og:image" content="${SITE}/og.png">
${published ? `<meta property="article:published_time" content="${published}">` : ""}
${modified ? `<meta property="article:modified_time" content="${modified}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escAttr(t)}">
<meta name="twitter:description" content="${escAttr(d)}">
<meta name="twitter:image" content="${SITE}/og.png">
<meta name="twitter:creator" content="@rtilleard">
<link rel="icon" href="/icon.png" type="image/png">
<link rel="stylesheet" href="/blog/blog.css">
<link rel="alternate" type="application/rss+xml" title="htmlEdit blog" href="/feed.xml">
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 0)}
</script>
</head>`;
}

function siteHeader() {
  return `<header class="topbar">
  <a class="brand" href="/"><span class="mark">¶</span> htmlEdit</a>
  <nav>
    <a href="/blog/">Blog</a>
    <a href="/#download">Get the app</a>
  </nav>
</header>`;
}

function siteFooter() {
  return `<footer class="sitefoot">
  <p><a href="/">htmlEdit</a> — edit HTML documents like a document. <a href="/blog/">Blog</a> · <a href="/privacy">Privacy</a> · <a href="https://github.com/rtilleard/htmlEdit">Open source</a></p>
  <p class="muted">Written by <a href="${AUTHOR.url}" rel="author">Robbie Tilleard</a>.</p>
</footer>`.replace("—", ",");
}

// ---------- article page ----------
function articlePage(a, all) {
  const url = `${SITE}/blog/${a.slug}`;
  const related = all
    .filter((x) => x.slug !== a.slug)
    .filter((x) => x.tags.some((t) => a.tags.includes(t)))
    .slice(0, 3);
  const relatedFallback = related.length
    ? related
    : all.filter((x) => x.slug !== a.slug).slice(0, 3);

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: deAI(a.title),
    description: deAI(a.metaDescription),
    datePublished: a.date,
    dateModified: a.date,
    author: {
      "@type": "Person",
      name: AUTHOR.name,
      url: AUTHOR.url,
      sameAs: AUTHOR.sameAs,
    },
    publisher: {
      "@type": "Organization",
      name: PUB.name,
      logo: { "@type": "ImageObject", url: PUB.logo },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    image: `${SITE}/og.png`,
    keywords: a.tags.join(", "),
    articleSection: "Productivity",
    inLanguage: "en",
    wordCount: (a.bodyHtml.replace(/<[^>]+>/g, " ").match(/\S+/g) || []).length,
  };

  const takeaways = (a.keyTakeaways || [])
    .map((k) => `<li>${esc(deAI(k))}</li>`)
    .join("\n");

  const relatedHtml = relatedFallback
    .map(
      (r) =>
        `<li><a href="/blog/${r.slug}">${esc(deAI(r.title))}</a></li>`
    )
    .join("\n");

  return `${head({
    title: a.title,
    desc: a.metaDescription,
    canonical: url,
    jsonld,
    published: a.date,
    modified: a.date,
  })}
<body>
${siteHeader()}
<main>
<article>
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/blog/">Blog</a></nav>
  <header class="post-head">
    <h1>${esc(deAI(a.title))}</h1>
    <p class="byline">By <a href="${AUTHOR.url}" rel="author">Robbie Tilleard</a> · <time datetime="${a.date}">${fmtDate(a.date)}</time> · ${a.readingTimeMin} min read</p>
  </header>
  ${a.tldr ? `<div class="tldr"><strong>In short:</strong> ${esc(deAI(a.tldr))}</div>` : ""}
  <div class="post-body">
${cleanBody(a.bodyHtml)}
  </div>
  ${takeaways ? `<section class="takeaways"><h2>Key takeaways</h2><ul>${takeaways}</ul></section>` : ""}
  <aside class="cta">
    <p><strong>htmlEdit</strong> lets you edit AI-generated HTML documents visually, then save them. It is a Mac app and a browser extension, it is local and private, and it is <a href="https://github.com/rtilleard/htmlEdit">open source</a>.</p>
    <p><a class="btn" href="/#download">Get htmlEdit</a></p>
  </aside>
  ${relatedHtml ? `<section class="related"><h2>Related reading</h2><ul>${relatedHtml}</ul></section>` : ""}
</article>
</main>
${siteFooter()}
</body>
</html>`;
}

// ---------- blog index ----------
function indexPage(all) {
  const url = `${SITE}/blog/`;
  const items = all.map((a, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${SITE}/blog/${a.slug}`,
    name: deAI(a.title),
  }));
  const jsonld = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "htmlEdit Blog",
    description:
      "Notes on editing HTML documents, working with Claude and Codex, and practical AI productivity.",
    url,
    publisher: {
      "@type": "Organization",
      name: PUB.name,
      logo: { "@type": "ImageObject", url: PUB.logo },
    },
    blogPost: all.map((a) => ({
      "@type": "BlogPosting",
      headline: deAI(a.title),
      url: `${SITE}/blog/${a.slug}`,
      datePublished: a.date,
      author: { "@type": "Person", name: AUTHOR.name },
    })),
    mainEntity: { "@type": "ItemList", itemListElement: items },
  };

  const cards = all
    .map(
      (a) => `<li class="card">
    <h2><a href="/blog/${a.slug}">${esc(deAI(a.title))}</a></h2>
    <p class="meta"><time datetime="${a.date}">${fmtDate(a.date)}</time> · ${a.readingTimeMin} min</p>
    <p>${esc(deAI(a.tldr || a.metaDescription))}</p>
    <p class="tags">${a.tags.map((t) => `<span>${esc(t)}</span>`).join(" ")}</p>
  </li>`
    )
    .join("\n");

  return `${head({
    title: "Blog",
    desc: "Notes on editing HTML documents, using Claude and Codex together, and practical AI productivity, from the maker of htmlEdit.",
    canonical: url,
    jsonld,
    ogType: "website",
  })}
<body>
${siteHeader()}
<main>
  <header class="blog-hero">
    <h1>The htmlEdit Blog</h1>
    <p>Editing HTML documents, working with Claude and Codex as a team, and getting more out of AI without the busywork.</p>
  </header>
  <ul class="post-list">
${cards}
  </ul>
</main>
${siteFooter()}
</body>
</html>`;
}

// ---------- css ----------
const CSS = `:root{color-scheme:light;--ink:#1a1a1a;--muted:#6a6a6a;--bg:#f6f6f4;--card:#fff;--line:rgba(0,0,0,.09);--accent:#2a7af6;}
*{box-sizing:border-box;}
body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;line-height:1.65;}
a{color:var(--accent);text-decoration:none;}
a:hover{text-decoration:underline;}
.topbar{display:flex;align-items:center;justify-content:space-between;max-width:820px;margin:0 auto;padding:20px 22px;}
.brand{font-weight:700;color:var(--ink);font-size:18px;}
.brand .mark{font-family:Georgia,serif;margin-right:2px;}
.topbar nav a{margin-left:18px;color:var(--ink);font-size:15px;}
main{max-width:720px;margin:0 auto;padding:8px 22px 64px;}
.crumbs{font-size:13px;color:var(--muted);margin:8px 0 24px;}
.crumbs a{color:var(--muted);}
.post-head h1{font-size:34px;line-height:1.15;margin:0 0 10px;letter-spacing:-.01em;}
.byline{color:var(--muted);font-size:14px;margin:0 0 26px;}
.tldr{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:10px;padding:14px 18px;margin:0 0 28px;font-size:16px;box-shadow:0 4px 16px rgba(0,0,0,.05);}
.post-body{font-size:17.5px;}
.post-body h2{font-size:23px;margin:38px 0 12px;letter-spacing:-.01em;}
.post-body h3{font-size:18px;margin:26px 0 8px;}
.post-body p{margin:0 0 18px;}
.post-body ul,.post-body ol{margin:0 0 18px;padding-left:24px;}
.post-body li{margin:7px 0;}
.post-body blockquote{margin:22px 0;padding:4px 18px;border-left:3px solid var(--line);color:#333;font-style:italic;}
.takeaways{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 22px 18px;margin:36px 0;box-shadow:0 6px 20px rgba(0,0,0,.05);}
.takeaways h2{font-size:18px;}
.cta{background:#111;color:#eee;border-radius:14px;padding:22px 24px;margin:40px 0;}
.cta a{color:#8ab6ff;}
.cta .btn{display:inline-block;margin-top:8px;background:#fff;color:#111;font-weight:600;padding:10px 18px;border-radius:10px;}
.cta .btn:hover{text-decoration:none;opacity:.9;}
.related h2{font-size:18px;margin-top:36px;}
.related ul{padding-left:20px;}
.sitefoot{max-width:720px;margin:0 auto;padding:30px 22px 60px;border-top:1px solid var(--line);color:var(--muted);font-size:14px;}
.sitefoot a{color:var(--muted);text-decoration:underline;}
.muted{color:var(--muted);}
.blog-hero{padding:20px 0 10px;}
.blog-hero h1{font-size:36px;margin:0 0 8px;letter-spacing:-.02em;}
.blog-hero p{color:var(--muted);font-size:18px;max-width:560px;}
.post-list{list-style:none;padding:0;margin:26px 0 0;}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px;margin:0 0 16px;box-shadow:0 4px 16px rgba(0,0,0,.04);}
.card h2{font-size:20px;margin:0 0 6px;}
.card h2 a{color:var(--ink);}
.card .meta{color:var(--muted);font-size:13px;margin:0 0 8px;}
.card p{margin:0 0 8px;font-size:15.5px;}
.card .tags span{display:inline-block;font-size:12px;color:var(--muted);background:var(--bg);border:1px solid var(--line);border-radius:20px;padding:2px 10px;margin-right:4px;}
@media(max-width:520px){.post-head h1{font-size:28px;}.post-body{font-size:17px;}}
`;

// ---------- sitemap / llms.txt / rss ----------
function sitemap(all) {
  const urls = [
    { loc: `${SITE}/`, pri: "1.0" },
    { loc: `${SITE}/blog/`, pri: "0.9" },
    { loc: `${SITE}/privacy`, pri: "0.3" },
    ...all.map((a) => ({ loc: `${SITE}/blog/${a.slug}`, pri: "0.8", lastmod: a.date })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.pri}</priority></url>`
  )
  .join("\n")}
</urlset>
`;
}

function llmsTxt(all) {
  return `# htmlEdit

> htmlEdit is a minimal tool for editing HTML documents visually. You point, click and type directly on the rendered page, like editing a Word document, instead of hand-editing raw HTML or re-prompting an AI. It is built for cleaning up AI-generated HTML documents (memos, briefs, one-pagers). It runs as a Mac app and a Chrome browser extension, keeps your files local and private, and is open source under the MIT licence.

## Product
- Website: ${SITE}
- Mac app: available on the Mac App Store
- Browser: a companion Chrome extension that makes any page editable
- Source code (MIT): https://github.com/rtilleard/htmlEdit
- Privacy: ${SITE}/privacy (collects no user data)

## About
- Made by Robbie Tilleard (${AUTHOR.url})

## Blog
Practical writing on editing HTML documents, using Claude and Codex together, and AI productivity.
${all.map((a) => `- [${deAI(a.title)}](${SITE}/blog/${a.slug}): ${deAI(a.tldr || a.metaDescription)}`).join("\n")}
`;
}

function rss(all) {
  const items = all
    .slice()
    .sort((x, y) => (x.date < y.date ? 1 : -1))
    .map(
      (a) => `    <item>
      <title>${esc(deAI(a.title))}</title>
      <link>${SITE}/blog/${a.slug}</link>
      <guid>${SITE}/blog/${a.slug}</guid>
      <pubDate>${new Date(a.date + "T09:00:00Z").toUTCString()}</pubDate>
      <description>${esc(deAI(a.tldr || a.metaDescription))}</description>
    </item>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
    <title>htmlEdit Blog</title>
    <link>${SITE}/blog/</link>
    <description>Editing HTML documents, Claude and Codex, and AI productivity.</description>
    <language>en</language>
${items}
</channel></rss>
`;
}

// ---------- run ----------
const articles = JSON.parse(readFileSync(join(__dir, "_articles.json"), "utf8"));
// newest first for index/rss; keep given order otherwise
const ordered = articles.slice().sort((a, b) => (a.date < b.date ? 1 : -1));

for (const a of articles) {
  writeFileSync(join(__dir, `${a.slug}.html`), articlePage(a, articles));
}
writeFileSync(join(__dir, "index.html"), indexPage(ordered));
writeFileSync(join(__dir, "blog.css"), CSS);
writeFileSync(join(ROOT, "sitemap.xml"), sitemap(ordered));
writeFileSync(join(ROOT, "llms.txt"), llmsTxt(ordered));
writeFileSync(join(ROOT, "feed.xml"), rss(ordered));

console.log(`Built ${articles.length} articles + index + sitemap + llms.txt + feed.xml`);
