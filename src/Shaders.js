import * as THREE from 'three'

export class Blobs {
  constructor(app) {
    this.app = app

    this.MAX_BLOBS = 64
    this.maxRad = 0.4
    this.minRad = 0.3

    app.on('update', (delta) => this.update(delta))

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        // aabb uniforms
        bmin: { value: new THREE.Vector3() },
        bmax: { value: new THREE.Vector3() },
        // blob uniforms
        blobs: {
          value: Array.from({ length: this.MAX_BLOBS }, () => ({
            center: new THREE.Vector3(),
            radius: Math.random() * (this.maxRad - this.minRad) + this.minRad,
          })),
        },
        count: { value: 0 },
        // engine uniforms
        time: { value: 0 },
        resolution: { value: new THREE.Vector2() },
        mouse: { value: new THREE.Vector2() },
        scrollY: { value: 0 },
        // style uniforms
        color: { value: new THREE.Vector3() },
      },
      vertexShader: this.VS(),
      fragmentShader: this.FS(),
    })

    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), this.material)
  }

  update(delta) {
    this.material.uniforms.time.value = this.app.time

    // update uniform aabbs
    const blobs = this.material.uniforms.blobs.value
    const count = this.material.uniforms.count.value

    const bmin = this.material.uniforms.bmin.value
    const bmax = this.material.uniforms.bmax.value
    bmin.set(Infinity, Infinity, Infinity)
    bmax.set(-Infinity, -Infinity, -Infinity)

    for (let i = 0; i < count; ++i) {
      const b = blobs[i]
      bmin.min(b.center.clone().subScalar(b.radius))
      bmax.max(b.center.clone().addScalar(b.radius))
    }

    const y = this.app.getY()
    this.material.uniforms.scrollY.value = y
    this.plane.position.y = y
  }

  createTransitionMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        ...this.material.uniforms,
        scrollY: { value: 0 },
        // independent color so it can be snapped to destination without affecting the main material
        color: { value: this.material.uniforms.color.value.clone() },
      },
      vertexShader: this.VS(),
      fragmentShader: this.FS(),
    })
  }

  // returns array of ball sims that can be modified by other classes
  static sim(count, position) {
    const speed = 0.004
    return Array.from({ length: count }, () => ({
      pos: new THREE.Vector3().random().subScalar(0.5).add(position), // map [0, 1) -> [-0.5, 0.5)
      velocity: new THREE.Vector3()
        .random()
        .subScalar(0.5)
        .multiplyScalar(speed),
    }))
  }

  static projectSim(count, position, xBound, zBound = 1.5) {
    const baseSpeed = 0.0025

    return Array.from({ length: count }, (_, i) => {
      // exaggerated per-blob pace: some noticeably slower, some faster
      const speedScale = 0.3 + Math.random() * 2.2
      const sign = () => (Math.random() < 0.5 ? -1 : 1)

      return {
        pos: new THREE.Vector3(
          -xBound + ((i + 0.5) / count) * (2 * xBound),
          Math.random() - 0.5, // staggered slightly on y
          (Math.random() - 0.5) * 2 * zBound,
        ).add(position), // spawn around the scene's world position
        velocity: new THREE.Vector3(
          sign() * baseSpeed * speedScale * 0.4, // gentle horizontal drift
          sign() * baseSpeed * speedScale,
          sign() * baseSpeed * speedScale * 0.4, // gentle z drift
        ),
        fading: false,
      }
    })
  }

  VS() {
    return `
    void main()
    {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `
  }

  FS() {
    return `
    #define MAX_BLOBS ${this.MAX_BLOBS}

    struct Blob {
        vec3  center;
        float radius;
    };

    // aabb uniforms
    uniform vec3 bmin;
    uniform vec3 bmax;

    // blob uniforms
    uniform Blob blobs[${this.MAX_BLOBS}];
    uniform int count;

    // engine uniforms
    uniform float time;
    uniform vec2 resolution;
    uniform vec2 mouse;
    uniform float scrollY;

    // style uniforms
    uniform vec3 color;

    float smin(float a, float b, float k)
    {
        float h = max(k-abs(a-b), 0.0) / k;
        return min(a,b) - h*h*h*k*(1.0/6.0);
    }

    float sphere(vec3 p, vec3 c, float r)
    {
        return length(p - c) - r;
    }

    // distance of point p to scene
    float map(vec3 p)
    {
        float d = 1e9;
        for (int i = 0; i < count; ++i)
        {
            Blob b = blobs[i];
            d = smin(d, sphere(p, b.center, b.radius), 1.0);
        }

        return d;
    }

    vec3 calculateNormal(vec3 p)
    {
    const float epsilon = 0.001;

    vec3 v1 = vec3(
        map(p + vec3(epsilon, 0.0, 0.0)),
        map(p + vec3(0.0, epsilon, 0.0)),
        map(p + vec3(0.0, 0.0, epsilon)));
    vec3 v2 = vec3(
        map(p - vec3(epsilon, 0.0, 0.0)),
        map(p - vec3(0.0, epsilon, 0.0)),
        map(p - vec3(0.0, 0.0, epsilon)));

    return normalize(v1 - v2);
    }

    vec2 hitAABB(vec3 ro, vec3 rd, vec3 lo, vec3 hi) 
    {
      vec3 inv = 1.0 / rd;
      vec3 t0 = (lo - ro) * inv;
      vec3 t1 = (hi - ro) * inv;
      vec3 tmin = min(t0, t1);
      vec3 tmax = max(t0, t1);
      return vec2(max(max(tmin.x, tmin.y), tmin.z),
                  min(min(tmax.x, tmax.y), tmax.z));
    }

    void main()
    {
        /*
        vec3 a = vec3(0.97, 0.24, 0.05); // orange (original)
        vec3 a = vec3(0.97, 0.05, 0.05); // red
        vec3 a = vec3(0.97, 0.62, 0.05); // amber
        vec3 a = vec3(0.97, 0.62, 0.05); // amber
        vec3 a = vec3(0.97, 0.86, 0.05); // yellow
        vec3 a = vec3(0.65, 0.97, 0.05); // chartreuse
        vec3 a = vec3(0.05, 0.97, 0.24); // green
        vec3 a = vec3(0.05, 0.97, 0.89); // teal
        vec3 a = vec3(0.05, 0.70, 0.97); // cyan-blue
        vec3 a = vec3(0.05, 0.35, 0.97); // blue
        vec3 a = vec3(0.35, 0.05, 0.97); // indigo
        vec3 a = vec3(0.97, 0.05, 0.97); // magenta
        vec3 a = vec3(0.97, 0.05, 0.62); // pink*/
        vec3 b = vec3(0.0, 0.0, 0.0); // color within blobs

        vec2 uv = gl_FragCoord.xy / resolution; // [0 -> 1], center at (0.5, 0.5)
        uv = uv * 2.0 - 1.0; // remap to [-1 -> 1], center at (0, 0)

        // initialization
        vec3 ro = vec3(0, scrollY, -3); // ray origin
        vec3 rd = normalize(vec3(uv, 1)); // ray direction

        vec3 pad = vec3(1.0);
        vec2 tb = hitAABB(ro, rd, bmin - pad, bmax + pad);
        if (tb.x > tb.y || tb.y < 0.0) 
        {
            gl_FragColor = vec4(color, 1.0);
            return;
        }

       float t = max(tb.x, 0.0);
        float tMax = tb.y; // finite backstop in case the box is ever degenerate
        float d = 0.0;
        vec3 p;

        // raymarching
        for (int i = 0; i < 80; ++i)
        {
            p = ro + rd * t; // position along ray (based on distance traveled)
            d = map(p); // current distance to the scene
            if (d < 0.001) break;
            t += d;
            if (t > tMax) break;  // left the box
        }

        // if surface was hit perform lighting calculations
        if (d < 0.001)
        {
            vec3 lightDir = vec3(cos(time) * 0.5, sin(time) * 0.5, cos(time) * 0.5);
            vec3 lightCol = vec3(1.0);
            float k = 0.015;

            vec3 n = calculateNormal(p);
            vec3 l = normalize(lightDir - p);
            vec3 v = normalize(ro - p);
            vec3 r = reflect(-l, n);

            float spec = pow(max(dot(v, r), 0.0), 32.0) * k;
            float f = step(0.01, spec);

            vec3 col = mix(b, vec3(1.0), f); // if f is past will return pure white
            gl_FragColor = vec4(col, 1.0);
        }
        else
        {
            gl_FragColor = vec4(color, 1.0);
        }
    }
    `
  }
}

/*
const meta = `
void main()
{
    vec3 a = vec3(0.1, 0.1, 1.0);
    vec3 col_in = vec3(0.8, 0.8, 0.8); // color within blobs

    vec2 uv = gl_FragCoord.xy / resolution; // [0 -> 1], center at (0.5, 0.5)
    uv = uv * 2.0 - 1.0; // remap to [-1 -> 1], center at (0, 0)
    
    float blobField = 0.0;
    for (int i = 0; i < count; i++)
    {
        Blob b = blobs[i];
        float d = length(uv - b.center) + 1e-6;
        blobField += b.radius / d;
    }
    float md = length(uv - mouse) + 1e-6;
    float mc = 0.01 / md;

    float field = blobField + mc;

    float inside  = step(1.0, field); 
    float hasBlob = step(0.5, blobField); // checks if blobs reach position (not just mouse)

    float f = inside * hasBlob;   

    col_in = (f > 0.5) ? col_in : a;
    gl_FragColor = vec4(col_in, 1.0);
}`
*/
