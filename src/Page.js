import gsap from 'gsap'
import { marked } from 'marked'

export class Page {
  constructor(app, data) {
    this.app = app
    this.data = data

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

    // filled in by loadBody() once the write-up markdown (or fallback
    // description) is ready — kept as its own scrollable region since a full
    // write-up can run much longer than the page itself
    this.body = document.createElement('div')
    this.body.className = 'page-body'
    section.appendChild(this.body)

    if (this.data.tech) {
      const ul = document.createElement('ul')
      ul.className = 'page-tech'
      for (const t of this.data.tech) {
        const li = document.createElement('li')
        li.textContent = t
        ul.appendChild(li)
      }
      section.appendChild(ul)
    }

    if (this.data.links) {
      const nav = document.createElement('div')
      nav.className = 'page-links'
      for (const { label, url } of this.data.links) {
        const a = document.createElement('a')
        a.textContent = label
        a.href = url
        a.target = '_blank'
        a.rel = 'noopener'
        a.className = 'page-link'
        nav.appendChild(a)
      }
      section.appendChild(nav)
    }

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
        return
      } catch (err) {
        console.error(`failed to load ${this.data.md}:`, err)
      }
    }

    this.body.textContent = this.data.description ?? ''
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
