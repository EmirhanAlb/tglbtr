import { useEffect, useRef } from "react";
import * as d3 from "d3";

export function RotatingEarth({ width = 720, height = 720, className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!context) return;

    const containerWidth = width;
    const containerHeight = height;
    const radius = Math.min(containerWidth, containerHeight) / 2.4;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(containerWidth * dpr);
    canvas.height = Math.floor(containerHeight * dpr);
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    context.scale(dpr, dpr);

    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90);

    const path = d3.geoPath().projection(projection).context(context);

    const pointInPolygon = (point, polygon) => {
      const x = point[0];
      const y = point[1];
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      return inside;
    };

    const pointInFeature = (point, feature) => {
      const geometry = feature.geometry;
      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates;
        if (!pointInPolygon(point, coordinates[0])) return false;
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) return false;
        }
        return true;
      } else if (geometry.type === "MultiPolygon") {
        for (const polygon of geometry.coordinates) {
          if (pointInPolygon(point, polygon[0])) {
            let inHole = false;
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true;
                break;
              }
            }
            if (!inHole) return true;
          }
        }
        return false;
      }
      return false;
    };

    const generateDotsInPolygon = (feature, dotSpacing) => {
      const dots = [];
      const bounds = d3.geoBounds(feature);
      const minLng = bounds[0][0];
      const minLat = bounds[0][1];
      const maxLng = bounds[1][0];
      const maxLat = bounds[1][1];
      const stepSize = dotSpacing * 0.08;
      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          if (pointInFeature([lng, lat], feature)) {
            dots.push(lng, lat);
          }
        }
      }
      return dots;
    };

    // Flat typed array [lng0, lat0, lng1, lat1, ...] for cache locality
    let dotArr = new Float32Array(0);
    let landFeatures = null;
    let cancelled = false;

    const graticule = d3.geoGraticule().step([20, 20])();

    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight);
      const currentScale = projection.scale();
      const scaleFactor = currentScale / radius;
      const cx = containerWidth / 2;
      const cy = containerHeight / 2;

      // Ocean
      context.beginPath();
      context.arc(cx, cy, currentScale, 0, 2 * Math.PI);
      context.fillStyle = "#07090F";
      context.fill();
      context.strokeStyle = "#BBC6CC";
      context.lineWidth = 1.2 * scaleFactor;
      context.globalAlpha = 0.7;
      context.stroke();
      context.globalAlpha = 1;

      if (landFeatures) {
        // Graticule
        context.beginPath();
        path(graticule);
        context.strokeStyle = "#BBC6CC";
        context.lineWidth = 0.7 * scaleFactor;
        context.globalAlpha = 0.16;
        context.stroke();
        context.globalAlpha = 1;

        // Land outlines
        context.beginPath();
        const feats = landFeatures.features;
        for (let i = 0; i < feats.length; i++) path(feats[i]);
        context.strokeStyle = "#E3E9EC";
        context.lineWidth = 0.8 * scaleFactor;
        context.globalAlpha = 0.5;
        context.stroke();
        context.globalAlpha = 1;

        // Dots — batch via single path with arcs is slower for many dots.
        // Use rect-based fill for tiny dots: faster fillRect.
        context.fillStyle = "#BBC6CC";
        context.globalAlpha = 0.85;
        const dotSize = Math.max(1, 1.2 * scaleFactor);
        const half = dotSize / 2;
        const n = dotArr.length;
        for (let i = 0; i < n; i += 2) {
          const p = projection([dotArr[i], dotArr[i + 1]]);
          if (p) {
            const px = p[0];
            const py = p[1];
            if (px >= 0 && px <= containerWidth && py >= 0 && py <= containerHeight) {
              context.fillRect(px - half, py - half, dotSize, dotSize);
            }
          }
        }
        context.globalAlpha = 1;
      }
    };

    const loadWorldData = async () => {
      try {
        // Veri kendi sitemizden servis edilir (harici GitHub fetch'i kaldırıldı;
        // sunucunun güvenlik kurallarını tetiklemesini önler).
        const response = await fetch("/world-land.json");
        if (!response.ok) throw new Error("Failed to load");
        const data = await response.json();
        if (cancelled) return;
        landFeatures = data;
        // Spacing bigger ⇒ fewer dots. 26 keeps shape readable but cuts dots ~60% vs 16.
        const all = [];
        for (let i = 0; i < landFeatures.features.length; i++) {
          const dots = generateDotsInPolygon(landFeatures.features[i], 26);
          for (let k = 0; k < dots.length; k++) all.push(dots[k]);
        }
        dotArr = Float32Array.from(all);
        render();
      } catch (err) {
        // silent
      }
    };

    const rotation = [0, -10];
    let autoRotate = true;
    let visible = true;
    let lastTs = 0;
    let frameId = null;
    // Cap auto-rotate at ~30fps to halve work on most displays
    const minDelta = 1000 / 30;
    const rotationSpeedPerMs = 0.012; // ≈ 0.4° per 33ms ≈ similar to prior

    const tick = (ts) => {
      frameId = requestAnimationFrame(tick);
      if (!visible) return;
      if (!autoRotate) return;
      const dt = ts - lastTs;
      if (dt < minDelta) return;
      lastTs = ts;
      rotation[0] += rotationSpeedPerMs * dt;
      projection.rotate(rotation);
      render();
    };
    frameId = requestAnimationFrame(tick);

    const handleMouseDown = (event) => {
      autoRotate = false;
      const startX = event.clientX;
      const startY = event.clientY;
      const startRotation = [rotation[0], rotation[1]];

      let pending = false;
      const handleMouseMove = (moveEvent) => {
        const sensitivity = 0.5;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        rotation[0] = startRotation[0] + dx * sensitivity;
        rotation[1] = startRotation[1] - dy * sensitivity;
        if (rotation[1] > 90) rotation[1] = 90;
        else if (rotation[1] < -90) rotation[1] = -90;
        if (!pending) {
          pending = true;
          requestAnimationFrame(() => {
            pending = false;
            projection.rotate(rotation);
            render();
          });
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        setTimeout(() => {
          autoRotate = true;
          lastTs = performance.now();
        }, 800);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    canvas.addEventListener("mousedown", handleMouseDown);

    // Pause when off-screen
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible = e.isIntersecting;
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    // Pause when tab hidden
    const onVis = () => {
      if (document.hidden) visible = false;
      else {
        visible = true;
        lastTs = performance.now();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    loadWorldData();

    return () => {
      cancelled = true;
      if (frameId) cancelAnimationFrame(frameId);
      canvas.removeEventListener("mousedown", handleMouseDown);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [width, height]);

  return <canvas ref={canvasRef} className={`globe-canvas ${className}`} />;
}
