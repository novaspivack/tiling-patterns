// Pan/zoom camera over the world-space Kisrhombille plane. World units match
// `EDGE_LENGTH` in render.js (the level-0 hexagon edge length).

const MIN_UNITS_PER_PIXEL = 0.0005;
const MAX_UNITS_PER_PIXEL = 4000;
const DEEPEST_ZOOM_FACTOR = 0.004; // 100% on the zoom slider is this fraction of the "whole grid" scale

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.unitsPerPixel = 1;
    this.mode = "pan"; // "pan" | "paint" | "place"
    this.onPaint = null; // (worldX, worldY, isDragStart) => void
    this.onPlace = null; // (worldX, worldY) => void — "place" mode click
    this.onHover = null; // (worldX, worldY) => void — called on every pointer move, any mode
    this._dragging = false;
    this._lastPointer = null;
    this._worldExtent = null; // { width, height } — set via setWorldExtent, used by the zoom slider mapping
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

  /** Remember the full grid's world extent, so `setZoomPercent`/`getZoomPercent` have a fixed 0-100% scale to work with. */
  setWorldExtent(worldWidth, worldHeight) {
    this._worldExtent = { width: worldWidth, height: worldHeight };
  }

  _zoomBounds() {
    const canvasWidth = this.canvas.clientWidth || this.canvas.width;
    const canvasHeight = this.canvas.clientHeight || this.canvas.height;
    const { width, height } = this._worldExtent;
    const maxUnitsPerPixel = Math.max(width / canvasWidth, height / canvasHeight) * 1.04; // 0% — whole grid visible
    const minUnitsPerPixel = Math.max(maxUnitsPerPixel * DEEPEST_ZOOM_FACTOR, MIN_UNITS_PER_PIXEL); // 100% — deep zoom-in
    return { minUnitsPerPixel, maxUnitsPerPixel };
  }

  /** `percent` in `[0, 100]`; 0 = whole grid visible, 100 = deepest zoom-in. Logarithmic, so it feels linear to a human. */
  setZoomPercent(percent) {
    const { minUnitsPerPixel, maxUnitsPerPixel } = this._zoomBounds();
    const t = clamp(percent, 0, 100) / 100;
    this.unitsPerPixel = maxUnitsPerPixel * (minUnitsPerPixel / maxUnitsPerPixel) ** t;
  }

  getZoomPercent() {
    const { minUnitsPerPixel, maxUnitsPerPixel } = this._zoomBounds();
    const ratio = clamp(this.unitsPerPixel, minUnitsPerPixel, maxUnitsPerPixel) / maxUnitsPerPixel;
    return 100 * (Math.log(ratio) / Math.log(minUnitsPerPixel / maxUnitsPerPixel));
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
      if (this.mode === "paint" && this.onPaint) {
        const [worldX, worldY] = this.screenToWorld(event.offsetX, event.offsetY);
        this.onPaint(worldX, worldY, true);
      } else if (this.mode === "place" && this.onPlace) {
        const [worldX, worldY] = this.screenToWorld(event.offsetX, event.offsetY);
        this.onPlace(worldX, worldY);
      }
    });

    canvas.addEventListener("pointermove", (event) => {
      if (this.onHover) {
        const [worldX, worldY] = this.screenToWorld(event.offsetX, event.offsetY);
        this.onHover(worldX, worldY);
      }
      if (!this._dragging) return;
      if (this.mode === "paint") {
        if (this.onPaint) {
          const [worldX, worldY] = this.screenToWorld(event.offsetX, event.offsetY);
          this.onPaint(worldX, worldY, false);
        }
        return;
      }
      if (this.mode === "place") return; // placing is a single click, not a drag
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
