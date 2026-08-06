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

    // browsers only keep advancing an animated image's frames while it's
    // actually part of the rendered document — a fully detached <img> (never
    // inserted into the DOM) decodes its first frame and then just freezes
    // there, which is why the gif wasn't moving. Parking it off-screen keeps
    // it "rendered" (and therefore playing) without ever being visible; the
    // canvas below is what actually gets shown on the card.
    img.style.position = 'fixed'
    img.style.left = '-9999px'
    img.style.width = '1px'
    img.style.height = '1px'
    document.body.appendChild(img)

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
        if (!mat.map) {
          img.remove() // card disposed, stop the loop and clean up the hidden <img>
          return
        }
        ctx.drawImage(img, 0, 0)
        tex.needsUpdate = true
        requestAnimationFrame(draw)
      }
      draw()
    }
    img.onerror = () => {
      img.remove()
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
    fontSize = 0.33,
    subtitle,
    subtitleFontSize = 0.18,
    cornerRadius = 0.12,
    padding = 0.3,
    backdropColor = 0xffffff,
    backdropOpacity = 0.14, // faint white tint — a flat MeshBasicMaterial can't
    // sample/blur what's behind it, so the "frosted glass" read comes from
    // this translucent tint plus the edge highlight below, not a real blur
  } = {},
) {
  const group = new THREE.Group()

  // image plane — rounded corners
  const geo = roundedRectGeometry(width, height, cornerRadius)
  const mat = new THREE.MeshBasicMaterial({ color: 'white' })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.z = 0.01
  mesh.raycast = () => {} // purely visual — hitPlane below is the only hit target
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
  title.font = '/mr.ttf'
  title.raycast = () => {} // purely visual — hitPlane below is the only hit target
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
    sub.raycast = () => {} // purely visual — hitPlane below is the only hit target
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

  // backdrop behind everything, sized to the content bounds plus padding.
  // the shared blob background sits at world z = 0 and covers the whole
  // viewport, so this has to stay in *front* of that (z > 0) — just behind
  // the image/text — or it gets occluded and never shows up.
  const backdropGeo = roundedRectGeometry(
    width + padding,
    contentH + padding,
    cornerRadius + padding * 0.5,
  )
  const backdrop = new THREE.Mesh(
    backdropGeo,
    new THREE.MeshBasicMaterial({
      color: backdropColor,
      transparent: true,
      opacity: backdropOpacity,
      depthWrite: false,
    }),
  )
  backdrop.position.set(0, centerY - padding * 0.5 - 0.1, 0.005)
  // fixed translucency regardless of scene fade — Scene.opacity's crossfade
  // would otherwise force this to fully opaque (1) once a transition
  // finishes, same reason the hit-plane below opts out
  backdrop.userData.noFade = true
  // purely visual — without this, the backdrop's much larger area (it
  // extends past the image into the padding) would itself be raycast-
  // testable and silently widen the hoverable/clickable region past hitPlane
  //backdrop.raycast = () => {}
  group.add(backdrop)

  // thin light edge traced around the backdrop's silhouette — sells the
  // "glass" read (a subtle rim catching light) alongside the translucent tint
  const edge = new THREE.LineLoop(
    new THREE.EdgesGeometry(backdropGeo),
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
    }),
  )
  edge.position.set(backdrop.position.x, backdrop.position.y, 0.006)
  edge.userData.noFade = true
  edge.raycast = () => {} // purely visual, same reason as the backdrop above
  group.add(edge)

  // hit plane — the only raycast target in the card; sized to just the
  // image, not the backdrop, so hover/click only fires over the image itself
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
