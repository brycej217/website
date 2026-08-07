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

// matches youtu.be/ID, youtube.com/watch?v=ID, and youtube.com/embed/ID
const YOUTUBE_RE =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/

export class Page {
  constructor(app, data) {
    this.app = app
    this.data = data
    this.outline = [] // [{ id, text, level }] — filled in once the markdown loads

    this.el = this.build() // create DOM
    this.el.style.display = 'none'
    document.querySelector('#pages').appendChild(this.el)

    this.loadBody()
  }

  build() {
    const section = document.createElement('section')
    section.className = 'page'

    const h1 = document.createElement('h1')
    h1.className = 'page-title'
    h1.textContent = this.data.title
    section.appendChild(h1)

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

        // GitHub renders as an icon (public/github.svg) rather than a text
        // link, and always sits at the far right of the row regardless of
        // where it falls in data.links — everything else renders first, in
        // its original order, then the icon is appended last.
        let githubUrl = null
        for (const { label, url } of this.data.links) {
          if (/^github$/i.test(label)) {
            githubUrl = url
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

        if (githubUrl) {
          const a = document.createElement('a')
          a.href = githubUrl
          a.target = '_blank'
          a.rel = 'noopener'
          a.className = 'page-link-icon'
          a.setAttribute('aria-label', 'GitHub')
          const img = document.createElement('img')
          img.src = '/github.svg'
          img.alt = 'GitHub'
          a.appendChild(img)
          nav.appendChild(a)
        }

        meta.appendChild(nav)
      }

      section.appendChild(meta)
    }

    // filled in by loadBody() once the write-up markdown (or fallback
    // description) is ready — kept as its own scrollable region since a full
    // write-up can run much longer than the page itself
    this.body = document.createElement('div')
    this.body.className = 'page-body'
    section.appendChild(this.body)

    return section
  }

  // loads the project's write-up from a markdown file in public/ (data.md) and
  // renders it into .page-body; falls back to the plain-text description if
  // there's no md file yet (or it fails to load)
  async loadBody() {
    if (this.data.md) {
      try {
        const res = await fetch(this.data.md)
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const md = await res.text()
        this.body.innerHTML = marked.parse(md)
        this.embedVideos()
        this.buildOutline()
        return
      } catch (err) {
        console.error(`failed to load ${this.data.md}:`, err)
      }
    }

    this.body.textContent = this.data.description ?? ''
  }

  // finds any link (or the broken linked-image markdown pattern people
  // naturally paste a plain YouTube url into) pointing at a YouTube video
  // and swaps it for an actual playable embed. Runs before buildOutline()
  // since it can remove/replace nodes, but doesn't touch headings.
  embedVideos() {
    const candidates = this.body.querySelectorAll(
      'a[href*="youtu"], img[src*="youtu"]',
    )
    const seen = new Set()

    for (const el of candidates) {
      const url = el.tagName === 'IMG' ? el.src : el.href
      const match = url.match(YOUTUBE_RE)
      if (!match) continue

      const id = match[1]
      if (seen.has(id)) {
        el.remove() // e.g. the img nested inside the a of [![](url)](url)
        continue
      }
      seen.add(id)

      // collapse up to the outermost wrapper that contains *only* this link
      // (typically the <p> around it) so no empty paragraph/anchor is left
      // behind once it's replaced
      let target = el
      while (
        target.parentElement &&
        target.parentElement !== this.body &&
        target.parentElement.childNodes.length === 1
      ) {
        target = target.parentElement
      }

      const wrap = document.createElement('div')
      wrap.className = 'page-video'
      const iframe = document.createElement('iframe')
      iframe.src = `https://www.youtube.com/embed/${id}`
      iframe.title = 'YouTube video player'
      iframe.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      iframe.referrerPolicy = 'strict-origin-when-cross-origin'
      iframe.allowFullscreen = true
      wrap.appendChild(iframe)

      target.replaceWith(wrap)
    }
  }

  // walks the rendered write-up's h1/h2s into a navigable outline (h2s nest
  // under whichever h1 they follow) and gives each heading a stable id to
  // scroll to. Runs after the markdown fetch resolves, so it notifies
  // PageManager directly in case this page is already the one on screen.
  buildOutline() {
    const headings = this.body.querySelectorAll('h1, h2')
    const seen = new Set()

    this.outline = Array.from(headings).map((el) => {
      let id = slugify(el.textContent)
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
