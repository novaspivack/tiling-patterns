// Composite render pass: maps every screen pixel back to a Kisrhombille cell
// address by the same domain-folding math as `geometry.py` (ported to GLSL),
// looks up that cell's state, colors it by palette, and draws anti-aliased
// triangle-edge wireframe lines — the "black outlined triangles" look.

import { MAX_STATES } from "./rule.js";
import { FULLSCREEN_TRIANGLE_VERTEX_SOURCE, createProgram, drawFullscreenTriangle } from "./gl-utils.js";

export const EDGE_LENGTH = 1.0;

const RENDER_FRAGMENT_SOURCE = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;

#define PI 3.14159265358979323846
#define SQRT3 1.7320508075688772
#define SECTOR_ANGLE 0.5235987755982988

uniform sampler2DArray uState;
uniform vec2 uCameraCenter;
uniform float uUnitsPerPixel;
uniform vec2 uCanvasSize;
uniform ivec2 uGridSize;
uniform float uEdgeLength;
uniform vec3 uPalette[${MAX_STATES}];

out vec4 outColor;

int wrapi(int x, int n) {
  int m = x % n;
  return m < 0 ? m + n : m;
}

vec2 hexCenter(ivec2 hex, float edgeLength) {
  float q = float(hex.x);
  float r = float(hex.y);
  return vec2(edgeLength * (SQRT3 * q + SQRT3 * 0.5 * r), edgeLength * 1.5 * r);
}

ivec2 roundAxial(float qf, float rf) {
  float xf = qf;
  float zf = rf;
  float yf = -xf - zf;
  float rx = floor(xf + 0.5);
  float ry = floor(yf + 0.5);
  float rz = floor(zf + 0.5);
  float dx = abs(rx - xf);
  float dy = abs(ry - yf);
  float dz = abs(rz - zf);
  if (dx > dy && dx > dz) {
    rx = -ry - rz;
  } else if (dy > dz) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }
  return ivec2(int(rx), int(rz));
}

ivec2 nearestHex(vec2 point, float edgeLength) {
  float qf = (SQRT3 / 3.0 * point.x - point.y / 3.0) / edgeLength;
  float rf = (2.0 / 3.0 * point.y) / edgeLength;
  return roundAxial(qf, rf);
}

void sectorCorners(int sector, float edgeLength, out vec2 o, out vec2 m, out vec2 v) {
  float apothem = edgeLength * SQRT3 * 0.5;
  float startAngle = float(sector) * SECTOR_ANGLE;
  float endAngle = float(sector + 1) * SECTOR_ANGLE;
  float mAngle;
  float vAngle;
  if (sector % 2 == 0) {
    mAngle = startAngle;
    vAngle = endAngle;
  } else {
    mAngle = endAngle;
    vAngle = startAngle;
  }
  o = vec2(0.0);
  m = vec2(apothem * cos(mAngle), apothem * sin(mAngle));
  v = vec2(edgeLength * cos(vAngle), edgeLength * sin(vAngle));
}

float distToSegment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float denom = dot(ab, ab);
  float t = denom > 0.0 ? clamp(dot(p - a, ab) / denom, 0.0, 1.0) : 0.0;
  vec2 proj = a + t * ab;
  return length(p - proj);
}

void main() {
  vec2 pixel = gl_FragCoord.xy;
  vec2 world = vec2(
    (pixel.x - uCanvasSize.x * 0.5) * uUnitsPerPixel + uCameraCenter.x,
    (uCanvasSize.y * 0.5 - pixel.y) * uUnitsPerPixel + uCameraCenter.y
  );

  ivec2 hex = nearestHex(world, uEdgeLength);
  vec2 center = hexCenter(hex, uEdgeLength);
  vec2 localPoint = world - center;

  float theta = mod(atan(localPoint.y, localPoint.x), 2.0 * PI);
  int rawSector = int(floor(theta / SECTOR_ANGLE));
  int sector = rawSector % 12;

  int wq = wrapi(hex.x, uGridSize.x);
  int wr = wrapi(hex.y, uGridSize.y);
  float state = texelFetch(uState, ivec3(wq, wr, sector), 0).r;
  int stateIndex = int(state + 0.5);
  vec3 fillColor = uPalette[stateIndex];

  vec2 o;
  vec2 m;
  vec2 v;
  sectorCorners(sector, uEdgeLength, o, m, v);
  float edgeDist = min(distToSegment(localPoint, o, m), min(distToSegment(localPoint, m, v), distToSegment(localPoint, o, v)));

  float lineHalfWidth = uUnitsPerPixel * 0.8;
  float aa = uUnitsPerPixel * 0.8 + 1e-6;
  float edgeMix = 1.0 - smoothstep(lineHalfWidth - aa, lineHalfWidth + aa, edgeDist);
  vec3 edgeColor = vec3(0.06, 0.05, 0.07);

  outColor = vec4(mix(fillColor, edgeColor, edgeMix), 1.0);
}
`;

export class Renderer {
  constructor(gl, canvas) {
    this.gl = gl;
    this.canvas = canvas;
    this.program = createProgram(gl, FULLSCREEN_TRIANGLE_VERTEX_SOURCE, RENDER_FRAGMENT_SOURCE);
    const g = gl;
    this.uniforms = {
      state: g.getUniformLocation(this.program, "uState"),
      cameraCenter: g.getUniformLocation(this.program, "uCameraCenter"),
      unitsPerPixel: g.getUniformLocation(this.program, "uUnitsPerPixel"),
      canvasSize: g.getUniformLocation(this.program, "uCanvasSize"),
      gridSize: g.getUniformLocation(this.program, "uGridSize"),
      edgeLength: g.getUniformLocation(this.program, "uEdgeLength"),
      palette: g.getUniformLocation(this.program, "uPalette"),
    };
  }

  draw(engine, camera, paletteData) {
    const gl = this.gl;
    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, engine.srcTexture);
    gl.uniform1i(this.uniforms.state, 0);

    gl.uniform2f(this.uniforms.cameraCenter, camera.x, camera.y);
    gl.uniform1f(this.uniforms.unitsPerPixel, camera.unitsPerPixel);
    gl.uniform2f(this.uniforms.canvasSize, this.canvas.width, this.canvas.height);
    gl.uniform2i(this.uniforms.gridSize, engine.width, engine.height);
    gl.uniform1f(this.uniforms.edgeLength, EDGE_LENGTH);
    gl.uniform3fv(this.uniforms.palette, paletteData);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    drawFullscreenTriangle(gl);
  }
}
