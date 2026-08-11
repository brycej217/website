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
        const res = await fetch(this.data.md)
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const md = await res.text()
        this.body.innerHTML = marked.parse(md)
        this.buildOutline()
        return
      } catch (err) {
        console.error(`failed to load ${this.data.md}:`, err)
      }
    }

    this.body.textContent = this.data.description ?? ''
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
