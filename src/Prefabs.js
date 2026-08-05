import * as THREE from 'three'
import { Text } from 'troika-three-text'

const loader = new THREE.TextureLoader()

// loads a static image onto `mat`, or — for .gif urls — continuously redraws
// a hidden <img> (which the browser animates natively) onto a canvas texture
// so animated gifs actually play on the card.
function loadCardTexture(url, mat) {
  if (/\.gif($|\?)/i.test(url)) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace

    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      mat.map = tex
      mat.needsUpdate = true

      const draw = () => {
        if (!mat.map) return // card disposed, stop the loop
        ctx.drawImage(img, 0, 0)
        tex.needsUpdate = true
        requestAnimationFrame(draw)
      }
      draw()
    }
    img.onerror = () => {
      // load error
    }
    img.src = url
  } else {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace // correct color for photos
        mat.map = tex
        mat.needsUpdate = true
      },
      undefined,
      () => {
        // load error
      },
    )
  }
}

// a rect shape with quadratic-curve corners, remapped so its default UVs
// (which THREE.ShapeGeometry otherwise leaves as raw local coordinates)
// land in the normal 0..1 range a texture expects.
function roundedRectGeometry(width, height, radius, segments = 8) {
  const r = Math.min(radius, width / 2, height / 2)
  const x = -width / 2
  const y = -height / 2

  const shape = new THREE.Shape()
  shape.moveTo(x, y + r)
  shape.lineTo(x, y + height - r)
  shape.quadraticCurveTo(x, y + height, x + r, y + height)
  shape.lineTo(x + width - r, y + height)
  shape.quadraticCurveTo(x + width, y + height, x + width, y + height - r)
  shape.lineTo(x + width, y + r)
  shape.quadraticCurveTo(x + width, y, x + width - r, y)
  shape.lineTo(x + r, y)
  shape.quadraticCurveTo(x, y, x, y + r)

  const geo = new THREE.ShapeGeometry(shape, segments)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(
      i,
      (pos.getX(i) + width / 2) / width,
      (pos.getY(i) + height / 2) / height,
    )
  }
  uv.needsUpdate = true

  return geo
}

function projectCard(
  imageUrl,
  label,
  {
    width = 3.2,
    height = 1.8,
    font,
    fontSize = 0.35,
    subtitle,
    subtitleFontSize = 0.2,
    cornerRadius = 0.12,
    padding = 0.35,
    backdropColor = 0x0b0d10, // matches the page background (see style.css)
  } = {},
) {
  const group = new THREE.Group()

  // image plane — rounded corners
  const geo = roundedRectGeometry(width, height, cornerRadius)
  const mat = new THREE.MeshBasicMaterial({ color: 'white' })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.z = 0.01
  group.add(mesh)

  loadCardTexture(imageUrl, mat)

  // title label
  const titleGap = fontSize + 0.05
  const title = new Text()
  title.text = label
  title.fontSize = fontSize
  title.color = 0xffffff
  title.anchorX = 'center'
  title.anchorY = 'top'
  title.position.set(0, height / 2 + titleGap, 0.02) // just above the plane, slightly forward
  title.font = '/ic.ttf'
  title.sync()
  group.add(title)

  // subtitle (one-sentence descriptor), wrapped under the title
  const subtitleGap = 0.1
  if (subtitle) {
    const sub = new Text()
    sub.text = subtitle
    sub.fontSize = subtitleFontSize
    sub.color = 0xffffff
    sub.anchorX = 'center'
    sub.anchorY = 'top'
    sub.textAlign = 'center'
    sub.maxWidth = width
    sub.position.set(0, -height / 2 - subtitleGap, 0.02)
    sub.font = '/ic.ttf'
    sub.sync()
    group.add(sub)
  }

  // vertical extent of the whole card (title + image + subtitle)
  const topY = height / 2 + titleGap + fontSize
  const bottomY = subtitle
    ? -height / 2 - subtitleGap - subtitleFontSize
    : -height / 2
  const contentH = topY - bottomY
  const centerY = (topY + bottomY) / 2

  // transparent hit plane — sized to just the image, not the backdrop, so
  // hover/click only fires over the image itself
  const hitPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  )
  hitPlane.position.set(0, 0, 0.03)
  hitPlane.userData.noFade = true // stays invisible regardless of scene fade
  group.add(hitPlane)

  // full footprint (backdrop bounds), so callers can space a grid of these
  // without re-deriving the title/subtitle layout math themselves
  group.userData.cardWidth = width + padding * 2
  group.userData.cardHeight = contentH + padding * 2

  return group
}

function plane(size = 10, { color = 'white' } = {}) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ color }),
  )
}

function cube(size = 1, { color = 'white' } = {}) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshBasicMaterial({ color }),
  )
}

function circle(size = 1, { color = 'white', material } = {}) {
  return new THREE.Mesh(
    new THREE.CircleGeometry(size),
    material ?? new THREE.MeshBasicMaterial({ color: color ?? 'white' }),
  )
}

function text(text, { fontSize = 0.5, color = 0xffffff, font } = {}) {
  const label = new Text()
  label.text = text
  label.fontSize = fontSize
  label.color = color
  label.anchorX = 'center'
  if (font) label.font = font
  label.sync() // required after setting properties
  return label
}

export { cube, text, plane, circle, projectCard }
