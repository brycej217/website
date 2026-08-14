import gsap from 'gsap'
import { marked } from 'marked'

// url-safe anchor from a heading's text, e.g. "GPU Architecture" -> "gpu-architecture"
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

export class Page {
  constructor(app, data) {
    this.app = app
    this.data = data
    this.outline = [] // [{ id, text, level }] — filled in once the markdown loads

    this.el = this.build() // create DOM
    this.el.style.display = 'none'
    document.querySelector('#pages').appendChild(this.el)

    // kept (not just fire-and-forgotten) so a deep link straight to this
    // page (see Router.boot()/main.js) can wait on it before lifting the
    // loading screen, instead of revealing an empty body mid-fetch
    this.ready = this.loadBody()
  }

  build() {
    const section = document.createElement('section')
    section.className = 'page'

    // title + tech pills/links share one backdrop (.page-header) rather than
    // each getting its own — two adjacent boxes read as unrelated, one box
    // reads as a single header
    const header = document.createElement('div')
    header.className = 'page-header'
    section.appendChild(header)

    const h1 = document.createElement('h1')
    h1.className = 'page-title'
    h1.textContent = this.data.title
    header.appendChild(h1)

    // tech pills and links share one row, left-aligned (see .page-meta) —
    // so only build the row at all if either exists
    if (this.data.tech || this.data.links) {
      const meta = document.createElement('div')
      meta.className = 'page-meta'

      if (this.data.tech) {
        const ul = document.createElement('ul')
        ul.className = 'page-tech'
        for (const t of this.data.tech) {
          const li = document.createElement('li')
          li.textContent = t
          ul.appendChild(li)
        }
        meta.appendChild(ul)
      }

      if (this.data.links) {
        const nav = document.createElement('div')
        nav.className = 'page-links'

        // GitHub and YouTube render as icons (public/github.svg,
        // public/youtube.svg) rather than text links, and always sit
        // together at the far right of the row regardless of where they
        // fall in data.links — everything else renders first, in its
        // original order, then the icons are appended last.
        let githubUrl = null
        let youtubeUrl = null
        for (const { label, url } of this.data.links) {
          if (/^github$/i.test(label)) {
            githubUrl = url
            continue
          }
          if (/^youtube$/i.test(label)) {
            youtubeUrl = url
            continue
          }
          const a = document.createElement('a')
          a.textContent = label
          a.href = url
          a.target = '_blank'
          a.rel = 'noopener'
          a.className = 'page-link'
          nav.appendChild(a)
        }

        if (githubUrl || youtubeUrl) {
          const icons = document.createElement('div')
          icons.className = 'page-link-icons'
          if (githubUrl) {
            icons.appendChild(
              this.buildIconLink(githubUrl, '/github.svg', 'GitHub'),
            )
          }
          if (youtubeUrl) {
            icons.appendChild(
              this.buildIconLink(youtubeUrl, '/youtube.svg', 'YouTube demo'),
            )
          }
          nav.appendChild(icons)
        }

        meta.appendChild(nav)
      }

      header.appendChild(meta)
    }

    // filled in by loadBody() once the write-up markdown (or fallback
    // description) is ready — kept as its own scrollable region since a full
    // write-up can run much longer than the page itself
    this.body = document.createElement('div')
    this.body.className = 'page-body'
    section.appendChild(this.body)

    return section
  }

  // builds one icon-only link (GitHub, YouTube demo, ...) for the page-meta row
  buildIconLink(url, src, label) {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener'
    a.className = 'page-link-icon'
    a.setAttribute('aria-label', label)
    const img = document.createElement('img')
    img.src = src
    img.alt = label
    a.appendChild(img)
    return a
  }

  // loads the project's write-up from a markdown file in public/ (data.md) and
  // renders it into .page-body; falls back to the plain-text description if
  // there's no md file yet (or it fails to load)
  async loadBody() {
    if (this.data.md) {
      try {
        // resolve against the site root, not document.baseURI — a few
        // Content.js entries still write this path without a leading slash
        // from before project pages had a real URL of their own (see
        // Router.js); document.baseURI is now that page's own nested route
        // (e.g. /project/nptracer) whenever this is a deep link/hard
        // refresh, and a relative fetch against that 404s instead of
        // reaching public/'s actual root-served file.
        const mdUrl = new URL(this.data.md, location.origin + '/')
        const res = await fetch(mdUrl)
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const md = await res.text()
        this.body.innerHTML = marked.parse(md)
        this.resolveRelativeUrls(mdUrl)
        this.wrapSections()
        this.buildOutline()
        return
      } catch (err) {
        console.error(`failed to load ${this.data.md}:`, err)
      }
    }

    this.body.textContent = this.data.description ?? ''
  }

  // several write-ups' own markdown source references sibling images with a
  // path relative to the .md file itself (e.g. "cuda/foo.png"), authored
  // back when the site was always served from `/` — the browser would
  // otherwise resolve those against document.baseURI (the *page's* current
  // URL, e.g. /project/cuda-path-tracer on a deep link/hard refresh — see
  // loadBody()'s comment above) instead of where the .md file actually
  // lives. Rewrite them once, right after parsing, against the .md file's
  // own directory — marked itself deliberately dropped automatic base-url
  // resolution, so this has to happen as a post-pass over the parsed DOM.
  resolveRelativeUrls(mdUrl) {
    const base = mdUrl.href.slice(0, mdUrl.href.lastIndexOf('/') + 1)

    for (const el of this.body.querySelectorAll('img[src]')) {
      el.src = new URL(el.getAttribute('src'), base).href
    }
    for (const el of this.body.querySelectorAll('a[href]')) {
      const href = el.getAttribute('href')
      if (href.startsWith('#')) continue // same-page anchor, not a path
      el.href = new URL(href, base).href
    }
  }

  // groups the flat sequence of elements marked.parse() produces into nested
  // .page-h1-section / .page-h2-section wrapper divs — everything from one
  // heading up to (not including) the next heading of the same-or-higher
  // level moves inside its wrapper, so each "# Heading" markdown section (and
  // each "## Heading" subsection within it) shares one backdrop with its own
  // body text instead of just the heading itself being boxed off (see
  // .page-h1-section/.page-h2-section in style.css)
  wrapSections() {
    const frag = document.createDocumentFragment()
    let h1Wrap = null
    let h2Wrap = null

    for (const node of Array.from(this.body.childNodes)) {
      if (node.nodeName === 'H1') {
        h1Wrap = document.createElement('div')
        h1Wrap.className = 'page-h1-section'
        h2Wrap = null
        frag.appendChild(h1Wrap)
      } else if (node.nodeName === 'H2') {
        h2Wrap = document.createElement('div')
        h2Wrap.className = 'page-h2-section'
        const parent = h1Wrap ?? frag
        parent.appendChild(h2Wrap)
      }

      const target = h2Wrap ?? h1Wrap ?? frag
      target.appendChild(node)
    }

    this.body.replaceChildren(frag)
  }

  // walks the rendered write-up's h1/h2s into a navigable outline (h2s nest
  // under whichever h1 they follow) and gives each heading a stable id to
  // scroll to. Runs after the markdown fetch resolves, so it notifies
  // PageManager directly in case this page is already the one on screen.
  // Ids are prefixed with this page's own id — plain slugs collide across
  // projects (every write-up has its own generic "# Overview"/"# Features"),
  // and since every Page's DOM lives in #pages at once (only display:none'd,
  // not removed), document.getElementById() would silently resolve to
  // whichever project happened to build its DOM first rather than the one
  // actually on screen — which is why H1 nav landed in the wrong place while
  // H2 (whose headings are specific enough per-project not to collide) didn't.
  buildOutline() {
    const headings = this.body.querySelectorAll('h1, h2')
    const seen = new Set()

    this.outline = Array.from(headings).map((el) => {
      let id = `${this.data.id}-${slugify(el.textContent)}`
      let unique = id || 'section'
      let n = 2
      while (seen.has(unique)) unique = `${id}-${n++}`
      seen.add(unique)
      el.id = unique

      return {
        id: unique,
        text: el.textContent,
        level: el.tagName === 'H1' ? 1 : 2,
      }
    })

    this.app.pages?.onOutlineReady?.(this)
  }

  show() {
    this.el.style.display = 'block'
    gsap.fromTo(
      this.el,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6 },
    )
  }

  hide() {
    gsap.to(this.el, {
      opacity: 0,
      duration: 0.4,
      onComplete: () => {
        this.el.style.display = 'none'
      },
    })
  }
}
