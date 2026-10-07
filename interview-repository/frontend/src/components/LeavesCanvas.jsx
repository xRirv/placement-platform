import { useEffect, useRef } from 'react';

export const LeavesCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Natural leaf palette: Contrasting rich greens, sage, golden amber, and warm earthy browns
    const leafColors = [
      'rgba(58, 114, 76, 0.82)',   // Forest green
      'rgba(82, 142, 97, 0.8)',    // Sage green
      'rgba(112, 168, 118, 0.75)', // Spring green
      'rgba(142, 88, 48, 0.82)',   // Warm wood brown
      'rgba(184, 118, 62, 0.8)',   // Golden amber brown
      'rgba(122, 68, 38, 0.78)',   // Deep russet bark
      'rgba(75, 125, 88, 0.85)',   // Emerald foliage
    ];

    // Particle count
    const LEAF_COUNT = 32;

    class Leaf {
      constructor(initial = false) {
        this.reset(initial);
      }

      reset(initial = false) {
        // Spawn predominantly from the top and upper-left where the tree canopy sits
        this.x = initial ? Math.random() * width : Math.random() * (width * 0.7) - width * 0.1;
        this.y = initial ? Math.random() * height : -30 - Math.random() * 80;
        this.size = 11 + Math.random() * 14;
        this.speedY = 0.9 + Math.random() * 1.5;
        this.speedX = 1.2 + Math.random() * 1.8; // gentle rightward wind drift
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.04;
        this.swayAngle = Math.random() * Math.PI * 2;
        this.swaySpeed = 0.015 + Math.random() * 0.025;
        this.swayMagnitude = 0.8 + Math.random() * 1.6;
        this.color = leafColors[Math.floor(Math.random() * leafColors.length)];
        this.aspectRatio = 0.45 + Math.random() * 0.25;
        this.flipProgress = Math.random() * Math.PI;
        this.flipSpeed = 0.02 + Math.random() * 0.03;
      }

      update() {
        this.swayAngle += this.swaySpeed;
        this.flipProgress += this.flipSpeed;
        this.rotation += this.rotationSpeed;

        this.x += this.speedX + Math.sin(this.swayAngle) * this.swayMagnitude;
        this.y += this.speedY;

        // Reset if offscreen (past right or bottom)
        if (this.y > height + 40 || this.x > width + 50) {
          this.reset(false);
        }
      }

      draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.rotation);

        // 3D tumble flip factor
        const scaleY = Math.sin(this.flipProgress);
        context.scale(1, scaleY);

        context.beginPath();
        // Stylized natural curved leaf
        context.moveTo(0, -this.size);
        context.bezierCurveTo(
          this.size * this.aspectRatio * 1.8, -this.size * 0.3,
          this.size * this.aspectRatio * 1.4, this.size * 0.6,
          0, this.size
        );
        context.bezierCurveTo(
          -this.size * this.aspectRatio * 1.4, this.size * 0.6,
          -this.size * this.aspectRatio * 1.8, -this.size * 0.3,
          0, -this.size
        );
        context.closePath();

        context.fillStyle = this.color;
        context.shadowColor = 'rgba(27, 48, 32, 0.18)';
        context.shadowBlur = 4;
        context.shadowOffsetX = 1;
        context.shadowOffsetY = 2;
        context.fill();

        // Subtle leaf vein
        context.beginPath();
        context.moveTo(0, -this.size * 0.85);
        context.lineTo(0, this.size * 0.85);
        context.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        context.lineWidth = 0.75;
        context.stroke();

        context.restore();
      }
    }

    const leaves = Array.from({ length: LEAF_COUNT }, () => new Leaf(true));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < leaves.length; i++) {
        leaves[i].update();
        leaves[i].draw(ctx);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="leaves-animation-canvas"
      aria-hidden="true"
    />
  );
};
