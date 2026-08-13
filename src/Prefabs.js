import * as THREE from 'three'
import { Text } from 'troika-three-text'

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

// shrinks `object` uniformly so it never runs wider than `margin` of the
// camera's current visible width (Camera.visibleWidth()). troika's fontSize
// is a world unit, not a px one, so a label tuned to fit a desktop 16:9
// frustum runs off the edges of a narrower/portrait one — a fixed-vertical
// -fov camera's horizontal visible extent shrinks with aspect ratio (see
// Camera.visibleWidth()). Re-measured on every resize, and — for troika Text
// specifically — once more right after its own async, worker-driven layout
// actually lands (textRenderInfo is null until then, so measuring any
// earlier reads a stale/empty width).
function fitViewport(app, object, { margin = 0.85 } = {}) {
  const isText = 'textRenderInfo' in object

  const width = () => {
    if (isText) {
      const bounds = object.textRenderInfo?.blockBounds
      return bounds ? bounds[2] - bounds[0] : 0
    }
    // non-text objects: measure world-space bounds at unit scale, since a
    // previous fit() call may have already left `object` scaled down
    object.scale.setScalar(1)
    object.updateWorldMatrix(true, false)
    const box = new THREE.Box3().setFromObject(object)
    return box.max.x - box.min.x
  }

  const fit = () => {
    const w = width()
    if (!w) return
    const visible = app.camera.visibleWidth() * margin
    object.scale.setScalar(Math.min(1, visible / w))
  }

  app.on('resize', fit)
  if (isText) object.addEventListener('synccomplete', fit)
  else fit()

  return fit
}

// rendered width of a troika Text's glyphs, in local (pre-scale) units —
// null until its async, worker-driven layout actually lands (same caveat as
// fitViewport above).
function textWidth(label) {
  const bounds = label.textRenderInfo?.blockBounds
  return bounds ? bounds[2] - bounds[0] : null
}

// bottom edge of a troika Text's rendered glyphs (accounting for descenders
// etc, via textRenderInfo.blockBounds — position.y alone is the text's
// baseline/origin, not its visual bottom), in its parent's local space and
// scaled by the label's own current scale (e.g. a shrink applied by
// fitViewport above). Null until layout lands, same as textWidth(). Lets
// DOM content (ProjectScene/AboutScene, via WorldHtml) anchor itself right
// below a 3D label at any resolution, instead of at a hand-picked distance
// that only happens to look right at whatever size it was tuned against.
function labelLocalBottom(label) {
  const bounds = label.textRenderInfo?.blockBounds
  if (!bounds) return null
  return label.position.y + bounds[1] * label.scale.y
}

export { cube, text, plane, circle, fitViewport, textWidth, labelLocalBottom }
