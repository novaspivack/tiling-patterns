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
uniform float uPixelRatio;
uniform ivec2 uGridSize;
uniform float uEdgeLength;
uniform vec3 uPalette[${MAX_STATES}];
uniform ivec2 uHighlightHex;
uniform int uHighlightActive;

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
  // gl_FragCoord is in device pixels with a bottom-left origin, Y increasing
  // upward (the WebGL/OpenGL window-space convention). uUnitsPerPixel and
  // uCanvasSize are calibrated in CSS pixels with a top-left origin, Y
  // increasing downward (matching event.offsetX/offsetY in camera.js, so
  // panning and painting hit-test the same pixel a user actually
  // sees/clicks) -- converting both axes here (device->CSS scale, plus the
  // Y-axis flip) is what keeps the two in sync.
  vec2 pixel = vec2(gl_FragCoord.x / uPixelRatio, uCanvasSize.y - gl_FragCoord.y / uPixelRatio);
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

  // Cap the line width at a small fraction of the cell size itself: once cells
  // shrink below a few screen pixels (zoomed far out over a huge grid), a
  // fixed screen-space line width would cover almost the whole cell and the
  // view would render as solid edge-color. Letting the line thin out below
  // that point instead falls back to (aliased) point-sampled fill color,
  // which is still recognizably colorful rather than uniformly dark.
  float lineHalfWidth = min(uUnitsPerPixel * 0.8, uEdgeLength * 0.035);
  float aa = lineHalfWidth + 1e-6;
  float edgeMix = 1.0 - smoothstep(lineHalfWidth - aa, lineHalfWidth + aa, edgeDist);
  vec3 edgeColor = vec3(0.06, 0.05, 0.07);

  vec3 color = mix(fillColor, edgeColor, edgeMix);
  if (uHighlightActive == 1 && wq == wrapi(uHighlightHex.x, uGridSize.x) && wr == wrapi(uHighlightHex.y, uGridSize.y)) {
    color = mix(color, vec3(1.0), 0.45);
  }

  outColor = vec4(color, 1.0);
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
      pixelRatio: g.getUniformLocation(this.program, "uPixelRatio"),
      gridSize: g.getUniformLocation(this.program, "uGridSize"),
      edgeLength: g.getUniformLocation(this.program, "uEdgeLength"),
      palette: g.getUniformLocation(this.program, "uPalette"),
      highlightHex: g.getUniformLocation(this.program, "uHighlightHex"),
      highlightActive: g.getUniformLocation(this.program, "uHighlightActive"),
    };
  }

  draw(engine, camera, paletteData, highlightHex = null) {
    const gl = this.gl;
    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, engine.srcTexture);
    gl.uniform1i(this.uniforms.state, 0);

    const cssWidth = this.canvas.clientWidth || this.canvas.width;
    const cssHeight = this.canvas.clientHeight || this.canvas.height;
    const pixelRatio = this.canvas.width / cssWidth;

    gl.uniform2f(this.uniforms.cameraCenter, camera.x, camera.y);
    gl.uniform1f(this.uniforms.unitsPerPixel, camera.unitsPerPixel);
    gl.uniform2f(this.uniforms.canvasSize, cssWidth, cssHeight);
    gl.uniform1f(this.uniforms.pixelRatio, pixelRatio);
    gl.uniform2i(this.uniforms.gridSize, engine.width, engine.height);
    gl.uniform1f(this.uniforms.edgeLength, EDGE_LENGTH);
    gl.uniform3fv(this.uniforms.palette, paletteData);
    if (highlightHex) {
      gl.uniform1i(this.uniforms.highlightActive, 1);
      gl.uniform2i(this.uniforms.highlightHex, highlightHex.q, highlightHex.r);
    } else {
      gl.uniform1i(this.uniforms.highlightActive, 0);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    drawFullscreenTriangle(gl);
  }
}
