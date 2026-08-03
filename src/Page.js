import gsap from 'gsap'

export class Page {
  constructor(app, data) {
    this.app = app
    this.data = data

    this.el = this.build() // create DOM
    this.el.style.display = 'none'
    document.querySelector('#pages').appendChild(this.el)
  }

  build() {
    const section = document.createElement('section')
    section.className = 'page'

    const h1 = document.createElement('h1')
    h1.className = 'page-title'
    h1.textContent = this.data.title
    section.appendChild(h1)

    const desc = document.createElement('p')
    desc.className = 'page-desc'
    desc.textContent = this.data.description
    section.appendChild(desc)

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
