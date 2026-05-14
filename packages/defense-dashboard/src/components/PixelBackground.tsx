// CareBridge: Defense dashboard client implementation.
import React from 'react';

type Pattern = 'center' | 'top' | 'bottom' | 'left' | 'right';

type PixelBackgroundProps = {
  className?: string;
  children?: React.ReactNode;
  gap?: number;
  speed?: number;
  pattern?: Pattern;
  darkColors?: string;
};

class Pixel {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  color: string;
  speed: number;
  size = 0;
  sizeStep = Math.random() * 0.4;
  minSize = 0.5;
  maxSize = Math.random() * (2 - 0.5) + 0.5;
  delay: number;
  counter = 0;
  counterStep: number;
  isIdle = false;
  isReverse = false;
  isShimmer = false;

  constructor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    speed: number,
    delay: number,
    width: number,
    height: number,
  ) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.color = color;
    this.speed = (Math.random() * 0.8 + 0.1) * speed;
    this.delay = delay;
    this.counterStep = Math.random() * 4 + (width + height) * 0.01;
  }

  draw() {
    const centerOffset = 1 - this.size * 0.5;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(this.x + centerOffset, this.y + centerOffset, this.size, this.size);
  }

  appear() {
    this.isIdle = false;
    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }
    if (this.size >= this.maxSize) this.isShimmer = true;
    if (this.isShimmer) {
      if (this.size >= this.maxSize) this.isReverse = true;
      else if (this.size <= this.minSize) this.isReverse = false;
      this.size += this.isReverse ? -this.speed : this.speed;
    } else {
      this.size += this.sizeStep;
    }
    this.draw();
  }

  disappear() {
    this.isShimmer = false;
    this.counter = 0;
    if (this.size <= 0) {
      this.isIdle = true;
      return;
    }
    this.size -= 0.1;
    this.draw();
  }
}

function calcDelay(pattern: Pattern, x: number, y: number, width: number, height: number) {
  switch (pattern) {
    case 'top':
      return y;
    case 'bottom':
      return height - y;
    case 'left':
      return x;
    case 'right':
      return width - x;
    case 'center':
    default:
      return Math.hypot(x - width / 2, y - height / 2);
  }
}

export default function PixelBackground({
  className,
  children,
  gap = 6,
  speed = 35,
  pattern = 'center',
  darkColors = '#173327,#25483a,#385f50',
}: PixelBackgroundProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const pixelsRef = React.useRef<Pixel[]>([]);
  const rafRef = React.useRef<number | null>(null);
  const previousRef = React.useRef(0);

  const init = React.useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.clearRect(0, 0, width, height);

    const palette = darkColors.split(',').map((c) => c.trim()).filter(Boolean);
    const pxs: Pixel[] = [];

    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        pxs.push(
          new Pixel(
            ctx,
            x,
            y,
            palette[Math.floor(Math.random() * palette.length)] || '#173327',
            speed * 0.001,
            calcDelay(pattern, x, y, width, height),
            width,
            height,
          ),
        );
      }
    }

    pixelsRef.current = pxs;
  }, [darkColors, gap, pattern, speed]);

  const animate = React.useCallback((mode: 'appear' | 'disappear') => {
    const tick = () => {
      rafRef.current = window.requestAnimationFrame(tick);
      const now = performance.now();
      const elapsed = now - previousRef.current;
      if (elapsed < 1000 / 60) return;
      previousRef.current = now;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let allIdle = true;
      for (const pixel of pixelsRef.current) {
        pixel[mode]();
        if (!pixel.isIdle) allIdle = false;
      }
      if (allIdle && rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    previousRef.current = performance.now();
    rafRef.current = window.requestAnimationFrame(tick);
  }, []);

  React.useEffect(() => {
    init();
    const observer = new ResizeObserver(() => init());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [init]);

  return (
    <div
      ref={containerRef}
      className={className}
      onMouseEnter={() => animate('appear')}
      onMouseLeave={() => animate('disappear')}
    >
      <canvas ref={canvasRef} className="pixel-canvas" aria-hidden="true" />
      <div className="pixel-content">{children}</div>
    </div>
  );
}
