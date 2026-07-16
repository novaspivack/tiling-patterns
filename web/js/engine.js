// The CA engine: a ping-pong pair of 12-layer `TEXTURE_2D_ARRAY` float
// textures (one layer per sector), stepped by a generalized k-state
// outer-totalistic rule (see rule.js) via 12 draw calls per generation (one
// per sector layer, each reading the *other* buffer's 12 layers).

import { crossHexNeighborUniformData, NUM_SECTORS } from "./lattice.js";
import {
  FULLSCREEN_TRIANGLE_VERTEX_SOURCE,
  createLookupTexture1D,
  createProgram,
  createStateArrayTexture,
  drawFullscreenTriangle,
  requireFloatRenderingSupport,
  uploadLookupTexture1D,
} from "./gl-utils.js";
import { MAX_TABLE_SIZE, tableToTextureData } from "./rule.js";

const STEP_FRAGMENT_SOURCE = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;

uniform sampler2DArray uSrc;
uniform sampler2D uRuleTable;
uniform int uNumStates;
uniform int uMaxSum;
uniform ivec3 uCrossHex[12];
uniform int uCurrentLayer;
uniform ivec2 uGridSize;

out vec4 outColor;

int wrapi(int x, int n) {
  int m = x % n;
  return m < 0 ? m + n : m;
}

float fetchState(int x, int y, int layer) {
  int wx = wrapi(x, uGridSize.x);
  int wy = wrapi(y, uGridSize.y);
  return texelFetch(uSrc, ivec3(wx, wy, layer), 0).r;
}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  int layer = uCurrentLayer;

  float own = fetchState(coord.x, coord.y, layer);

  int inHexA = (layer + 11) % 12;
  int inHexB = (layer + 1) % 12;
  float n0 = fetchState(coord.x, coord.y, inHexA);
  float n1 = fetchState(coord.x, coord.y, inHexB);

  ivec3 crossHex = uCrossHex[layer];
  float n2 = fetchState(coord.x + crossHex.x, coord.y + crossHex.y, crossHex.z);

  int sum = int(n0 + n1 + n2 + 0.5);
  int tableIndex = int(own + 0.5) * (uMaxSum + 1) + sum;

  float next = texelFetch(uRuleTable, ivec2(tableIndex, 0), 0).r;
  outColor = vec4(next, 0.0, 0.0, 1.0);
}
`;

const SEED_FRAGMENT_SOURCE = `#version 300 es
precision highp float;

uniform int uNumStates;
uniform float uSeed;
uniform int uCurrentLayer;
uniform float uDensity; // probability a cell is nonzero; nonzero cells pick uniformly among states 1..numStates-1

out vec4 outColor;

float hash(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 p = vec3(gl_FragCoord.xy, float(uCurrentLayer) * 97.0 + uSeed * 10007.0);
  float activeRoll = hash(p);
  float colorRoll = hash(p + vec3(31.7, 5.3, 71.1));
  float state = 0.0;
  if (uNumStates > 1 && activeRoll < uDensity) {
    state = 1.0 + floor(colorRoll * float(uNumStates - 1));
    state = min(state, float(uNumStates - 1));
  }
  outColor = vec4(state, 0.0, 0.0, 1.0);
}
`;

const FILL_FRAGMENT_SOURCE = `#version 300 es
precision highp float;

uniform float uValue;

out vec4 outColor;

void main() {
  outColor = vec4(uValue, 0.0, 0.0, 1.0);
}
`;

export class Engine {
  constructor(gl, gridWidth, gridHeight) {
    requireFloatRenderingSupport(gl);
    this.gl = gl;
    this.width = gridWidth;
    this.height = gridHeight;

    this.textures = [
      createStateArrayTexture(gl, gridWidth, gridHeight, NUM_SECTORS),
      createStateArrayTexture(gl, gridWidth, gridHeight, NUM_SECTORS),
    ];
    this.srcIndex = 0;
    this.fbo = gl.createFramebuffer();

    this.ruleTableTexture = createLookupTexture1D(gl, MAX_TABLE_SIZE);
    this.numStates = 2;
    this.maxSum = 3;
    this._crossHexData = crossHexNeighborUniformData();

    this.stepProgram = createProgram(gl, FULLSCREEN_TRIANGLE_VERTEX_SOURCE, STEP_FRAGMENT_SOURCE);
    this.seedProgram = createProgram(gl, FULLSCREEN_TRIANGLE_VERTEX_SOURCE, SEED_FRAGMENT_SOURCE);
    this.fillProgram = createProgram(gl, FULLSCREEN_TRIANGLE_VERTEX_SOURCE, FILL_FRAGMENT_SOURCE);
    this._cacheUniformLocations();

    this.generation = 0;
    this._checkFramebufferComplete();
  }

  _cacheUniformLocations() {
    const gl = this.gl;
    this.stepUniforms = {
      src: gl.getUniformLocation(this.stepProgram, "uSrc"),
      ruleTable: gl.getUniformLocation(this.stepProgram, "uRuleTable"),
      numStates: gl.getUniformLocation(this.stepProgram, "uNumStates"),
      maxSum: gl.getUniformLocation(this.stepProgram, "uMaxSum"),
      crossHex: gl.getUniformLocation(this.stepProgram, "uCrossHex"),
      currentLayer: gl.getUniformLocation(this.stepProgram, "uCurrentLayer"),
      gridSize: gl.getUniformLocation(this.stepProgram, "uGridSize"),
    };
    this.seedUniforms = {
      numStates: gl.getUniformLocation(this.seedProgram, "uNumStates"),
      seed: gl.getUniformLocation(this.seedProgram, "uSeed"),
      currentLayer: gl.getUniformLocation(this.seedProgram, "uCurrentLayer"),
      density: gl.getUniformLocation(this.seedProgram, "uDensity"),
    };
    this.fillUniforms = {
      value: gl.getUniformLocation(this.fillProgram, "uValue"),
    };
  }

  _checkFramebufferComplete() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.textures[0], 0, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`CA engine framebuffer incomplete (status ${status}) — this GPU/browser cannot render into an R32F texture array layer.`);
    }
  }

  get srcTexture() {
    return this.textures[this.srcIndex];
  }

  get dstTexture() {
    return this.textures[1 - this.srcIndex];
  }

  setRule(numStates, table) {
    this.numStates = numStates;
    this.maxSum = 3 * (numStates - 1);
    uploadLookupTexture1D(this.gl, this.ruleTableTexture, MAX_TABLE_SIZE, tableToTextureData(table));
  }

  /**
   * CPU-generated random seed, uploaded directly — deliberately not the GPU
   * hash-shader approach. The analytic per-fragment hash (kept below as
   * `seedRandomGPU` since it is still useful when speed matters more than
   * statistical quality) was found empirically to have a spatial
   * correlation defect: aggregate density/state-split statistics come out
   * correct, but at least one rule (the default "Living Bloom Field")
   * reliably collapsed to a uniform fixed point within a few hundred
   * generations when seeded that way, while an independent, verified
   * Python simulation seeded with `numpy`'s RNG at the same density sustains
   * indefinitely. `Math.random()` per cell has no such defect.
   */
  seedRandom(density = 1.0) {
    const gl = this.gl;
    const layerSize = this.width * this.height;
    const data = new Float32Array(layerSize * NUM_SECTORS);
    for (let layer = 0; layer < NUM_SECTORS; layer++) {
      const base = layer * layerSize;
      for (let i = 0; i < layerSize; i++) {
        if (Math.random() < density) {
          data[base + i] = 1 + Math.floor(Math.random() * (this.numStates - 1));
        }
      }
    }
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.srcTexture);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, this.width, this.height, NUM_SECTORS, gl.RED, gl.FLOAT, data);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    this.generation = 0;
  }

  /** Faster, GPU-only random seed — see the correctness caveat on `seedRandom` above. */
  seedRandomGPU(seedValue = Math.random(), density = 1.0) {
    const gl = this.gl;
    gl.useProgram(this.seedProgram);
    gl.uniform1i(this.seedUniforms.numStates, this.numStates);
    gl.uniform1f(this.seedUniforms.seed, seedValue);
    gl.uniform1f(this.seedUniforms.density, density);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.width, this.height);
    for (let layer = 0; layer < NUM_SECTORS; layer++) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.srcTexture, 0, layer);
      gl.uniform1i(this.seedUniforms.currentLayer, layer);
      drawFullscreenTriangle(gl);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.generation = 0;
  }

  /** Set every cell (all layers) to a single constant state — the "Blank" seed pattern uses `value = 0`. */
  fillConstant(value) {
    const gl = this.gl;
    gl.useProgram(this.fillProgram);
    gl.uniform1f(this.fillUniforms.value, value);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.width, this.height);
    for (let layer = 0; layer < NUM_SECTORS; layer++) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.srcTexture, 0, layer);
      drawFullscreenTriangle(gl);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.generation = 0;
  }

  /** Directly write one cell's state into the current buffer (paint tool) — takes effect immediately, no ping-pong swap. */
  setCell(q, r, sector, state) {
    const gl = this.gl;
    const wrappedQ = ((q % this.width) + this.width) % this.width;
    const wrappedR = ((r % this.height) + this.height) % this.height;
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.srcTexture);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, wrappedQ, wrappedR, sector, 1, 1, 1, gl.RED, gl.FLOAT, new Float32Array([state]));
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
  }

  step() {
    const gl = this.gl;
    gl.useProgram(this.stepProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.srcTexture);
    gl.uniform1i(this.stepUniforms.src, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.ruleTableTexture);
    gl.uniform1i(this.stepUniforms.ruleTable, 1);

    gl.uniform1i(this.stepUniforms.numStates, this.numStates);
    gl.uniform1i(this.stepUniforms.maxSum, this.maxSum);
    gl.uniform3iv(this.stepUniforms.crossHex, this._crossHexData);
    gl.uniform2i(this.stepUniforms.gridSize, this.width, this.height);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.width, this.height);
    for (let layer = 0; layer < NUM_SECTORS; layer++) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.dstTexture, 0, layer);
      gl.uniform1i(this.stepUniforms.currentLayer, layer);
      drawFullscreenTriangle(gl);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.srcIndex = 1 - this.srcIndex;
    this.generation++;
  }
}
