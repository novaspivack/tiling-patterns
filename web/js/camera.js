// Pan/zoom camera over the world-space Kisrhombille plane. World units match
// `EDGE_LENGTH` in render.js (the level-0 hexagon edge length).

const MIN_UNITS_PER_PIXEL = 0.002;
const MAX_UNITS_PER_PIXEL = 2000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.unitsPerPixel = 1;
    this._dragging = false;
    this._lastPointer = null;
    this._bindEvents();
  }

  /** Zoom out just far enough that a `worldWidth` x `worldHeight` extent fits the canvas. */
  fitToWorldExtent(worldWidth, worldHeight, marginFactor = 1.04) {
    const canvasWidth = this.canvas.clientWidth || this.canvas.width;
    const canvasHeight = this.canvas.clientHeight || this.canvas.height;
    this.unitsPerPixel = clamp(Math.max(worldWidth / canvasWidth, worldHeight / canvasHeight) * marginFactor, MIN_UNITS_PER_PIXEL, MAX_UNITS_PER_PIXEL);
    this.x = 0;
    this.y = 0;
  }

  screenToWorld(pixelX, pixelY) {
    const canvasWidth = this.canvas.clientWidth || this.canvas.width;
    const canvasHeight = this.canvas.clientHeight || this.canvas.height;
    const worldX = (pixelX - canvasWidth / 2) * this.unitsPerPixel + this.x;
    const worldY = (canvasHeight / 2 - pixelY) * this.unitsPerPixel + this.y;
    return [worldX, worldY];
  }

  _bindEvents() {
    const canvas = this.canvas;

    canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const [worldXBefore, worldYBefore] = this.screenToWorld(event.offsetX, event.offsetY);
        const zoomFactor = Math.exp(event.deltaY * 0.0015);
        this.unitsPerPixel = clamp(this.unitsPerPixel * zoomFactor, MIN_UNITS_PER_PIXEL, MAX_UNITS_PER_PIXEL);
        const [worldXAfter, worldYAfter] = this.screenToWorld(event.offsetX, event.offsetY);
        this.x += worldXBefore - worldXAfter;
        this.y += worldYBefore - worldYAfter;
      },
      { passive: false },
    );

    canvas.addEventListener("pointerdown", (event) => {
      this._dragging = true;
      this._lastPointer = [event.clientX, event.clientY];
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!this._dragging) return;
      const dx = event.clientX - this._lastPointer[0];
      const dy = event.clientY - this._lastPointer[1];
      this._lastPointer = [event.clientX, event.clientY];
      this.x -= dx * this.unitsPerPixel;
      this.y += dy * this.unitsPerPixel;
    });

    canvas.addEventListener("pointerup", () => {
      this._dragging = false;
    });
    canvas.addEventListener("pointerleave", () => {
      this._dragging = false;
    });
  }
}
