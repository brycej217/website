import * as THREE from 'three'

export class Blobs {
  constructor(app) {
    this.app = app

    this.MAX_BLOBS = 32
    this.maxRad = 0.4
    this.minRad = 0.3

    app.on('update', (delta) => this.update(delta))

    this.material = new THREE.ShaderMaterial({
      uniforms: {
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
    const y = this.app.camera.get().position.y
    this.material.uniforms.scrollY.value = y
    this.plane.position.y = y
  }

  // returns array of ball sims that can be modified by other classes
  static sim(count, position) {
    const speed = 0.005
    return Array.from({ length: count }, () => ({
      pos: new THREE.Vector3().random().subScalar(0.5).add(position), // map [0, 1) -> [-0.5, 0.5)
      velocity: new THREE.Vector3()
        .random()
        .subScalar(0.5)
        .multiplyScalar(speed),
    }))
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

        float t = 0.0;
        float d = 0.0;
        vec3 p = ro; // initial point to be iterated

        // raymarching
        for (int i = 0; i < 80; ++i)
        {
            p = ro + rd * t; // position along ray (based on distance traveled)
            d = map(p); // current distance to the scene
            t += d; // march (we can travel safely d along the ray confirmed)

            // early exits
            if (d < 0.001 || t > 100.0) break;
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

            float diff = max(dot(n, l), 0.0);
            float diffuseStrength = 0.0;
            vec3 base = b + diff * diffuseStrength * lightCol;

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
