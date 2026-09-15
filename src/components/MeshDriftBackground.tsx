'use client'

import { useEffect, useRef } from 'react'

const vertexShader = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const fragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 u_colors[8];
uniform vec4 u_scene;
uniform vec4 u_shape;
uniform vec4 u_surface;
uniform vec4 u_finish;
uniform vec4 u_transform;
uniform vec4 u_space;
uniform vec4 u_cursor;

#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_paramA u_shape.z
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_oklab u_transform.w
#define u_offset u_space.xy
#define u_mouse u_space.zw
#define u_cursorPresence u_cursor.x
#define u_cursorEffect u_cursor.y
#define u_cursorStrength u_cursor.z
#define u_cursorRadius u_cursor.w

float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 shade(vec2 uv, vec2 p, float t) {
  vec3 c0 = vec3(0.063, 0.000, 0.169);
  vec3 c1 = vec3(0.498, 0.000, 1.000);
  vec3 c2 = vec3(0.200, 0.682, 0.725);
  vec3 c3 = vec3(0.035, 0.125, 0.957);
  vec2 q1 = vec2(sin(t * 0.21 + 0.4), cos(t * 0.17 + 0.2)) * 0.5;
  vec2 q2 = vec2(sin(t * 0.29 + 2.1), cos(t * 0.23 + 1.4)) * 0.5;
  vec2 q3 = vec2(sin(t * 0.16 + 4.2), cos(t * 0.31 + 3.7)) * 0.5;
  float w1 = exp(-dot(p - q1, p - q1) * 4.6);
  float w2 = exp(-dot(p - q2, p - q2) * 5.0);
  float w3 = exp(-dot(p - q3, p - q3) * 4.2);
  float n = fbm(p * 2.4 + t * 0.025);
  vec3 col = c0 * 0.14 + c1 * w1 + c2 * w2 + c3 * w3;
  return col / (0.14 + w1 + w2 + w3) + vec3(n * 0.025);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  p *= u_scale;
  p += u_offset;
  if (u_warp > 0.0) p += u_warp * (vec2(fbm(p * u_detail + u_seed), fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);
  vec3 col = shade(uv, p, u_time);
  col = (col - 0.5) * u_contrast + 0.5;
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, u_saturation);
  col += u_brightness;
  float vd = length(uv - 0.5) * 1.41421356;
  col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);
  col += (grainHash(gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Não foi possível criar o shader.')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(log || 'Falha ao compilar shader.')
  }
  return shader
}

export default function MeshDriftBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
    if (!gl) return

    let program: WebGLProgram
    try {
      const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader)
      const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader)
      program = gl.createProgram()!
      gl.attachShader(program, vertex)
      gl.attachShader(program, fragment)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Falha ao linkar WebGL.')
      gl.useProgram(program)
    } catch {
      return
    }

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const resolution = gl.getUniformLocation(program, 'u_scene')
    const shape = gl.getUniformLocation(program, 'u_shape')
    const surface = gl.getUniformLocation(program, 'u_surface')
    const finish = gl.getUniformLocation(program, 'u_finish')
    const transform = gl.getUniformLocation(program, 'u_transform')
    const space = gl.getUniformLocation(program, 'u_space')
    const cursor = gl.getUniformLocation(program, 'u_cursor')
    const colors = gl.getUniformLocation(program, 'u_colors[0]')
    const colorData = new Float32Array([
      0.063, 0.000, 0.169,
      0.498, 0.000, 1.000,
      0.200, 0.682, 0.725,
      0.035, 0.125, 0.957,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
    gl.uniform3fv(colors, colorData)
    gl.uniform4f(shape, 1.10, 0.34, 0.50, 0.00)
    gl.uniform4f(surface, 2.40, 0.96, -0.10, 0.96)
    gl.uniform4f(finish, 0.00, 0.36, 0.026, 0.07)
    gl.uniform4f(transform, 1453.0, 0.00, 0.00, 0.0)
    gl.uniform4f(space, 0, 0, 0, 0)
    gl.uniform4f(cursor, 0, 2.0, 0.65, 0.46)

    let frame = 0
    let start = performance.now()
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.floor(window.innerWidth * dpr))
      const height = Math.max(1, Math.floor(window.innerHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
    }
    const render = (now: number) => {
      resize()
      gl.uniform4f(resolution, canvas.width, canvas.height, (now - start) / 1000 * 0.73, 4.0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      frame = requestAnimationFrame(render)
    }
    const visibility = () => {
      if (document.hidden) cancelAnimationFrame(frame)
      else { start = performance.now(); frame = requestAnimationFrame(render) }
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('resize', resize)
    frame = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('resize', resize)
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-45" />
}
