export type DisintegrateParams = {
  charsPerFrame: number;
  vyMin: number;
  vyMax: number;
  ay: number;
  alphaDecay: number;
  lifeMin: number;
  lifeMax: number;
};

export const defaultParams: DisintegrateParams = {
  charsPerFrame: 70,
  vyMin: -1,
  vyMax: -8,
  ay: 0.35,
  alphaDecay: 0.045,
  lifeMin: 20,
  lifeMax: 45
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  char: string;
  alpha: number;
  active: boolean;
};

export class Disintegrator {
  private particles: Particle[];
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private rAFId: number | null = null;
  private params: DisintegrateParams;
  private isVisible: { current: boolean };
  private onComplete: () => void;
  public staticChars: { x: number, y: number, char: string }[] = [];
  
  private textColor: string;
  private fontStr: string;
  private activeParticlesCount = 0;

  constructor(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    asciiContent: string,
    isVisibleRef: { current: boolean },
    onComplete: () => void,
    textColor: string = "#ffffff",
    fontStr: string = '12px monospace',
    params: DisintegrateParams = defaultParams,
    charWidth: number = 8,
    charHeight: number = 14
  ) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.isVisible = isVisibleRef;
    this.onComplete = onComplete;
    this.params = params;
    this.textColor = textColor;
    this.fontStr = fontStr;

    const lines = asciiContent.split('\n');
    const startY = Math.max(0, (height - lines.length * charHeight) / 2);
    const maxLineLen = Math.max(...lines.map(l => l.length));
    const startX = Math.max(0, (width - maxLineLen * charWidth) / 2);

    for(let r=0; r<lines.length; r++) {
      for(let c=0; c<lines[r].length; c++) {
        const char = lines[r][c];
        if (char && char.trim() !== '') {
          this.staticChars.push({
            x: startX + c * charWidth,
            y: startY + r * charHeight,
            char
          });
        }
      }
    }

    this.particles = new Array(this.staticChars.length);
    for(let i=0; i<this.particles.length; i++) {
        this.particles[i] = { x:0, y:0, vx:0, vy:0, life:0, maxLife:1, char:'', alpha:0, active: false };
    }
  }

  public drawStatic() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.font = this.fontStr;
    this.ctx.fillStyle = this.textColor;
    this.ctx.textBaseline = 'alphabetic';
    
    const batchSize = 50;
    for (let i = 0; i < this.staticChars.length; i += batchSize) {
      const batch = this.staticChars.slice(i, i + batchSize);
      for (const c of batch) {
        this.ctx.fillText(c.char, c.x, c.y);
      }
    }
  }

  public start() {
    this.loop();
  }

  public stop() {
    if (this.rAFId) {
      cancelAnimationFrame(this.rAFId);
      this.rAFId = null;
    }
  }

  private loop = () => {
    if (!this.isVisible.current) {
        this.rAFId = requestAnimationFrame(this.loop);
        return;
    }

    this.ctx.clearRect(0, 0, this.width, this.height);

    const toExplode = Math.min(this.params.charsPerFrame, this.staticChars.length);
    for (let i = 0; i < toExplode; i++) {
        const idx = Math.floor(Math.random() * this.staticChars.length);
        const st = this.staticChars.splice(idx, 1)[0];
        for (let p=0; p<this.particles.length; p++) {
            if (!this.particles[p].active) {
                const part = this.particles[p];
                part.x = st.x;
                part.y = st.y;
                part.vx = (Math.random() - 0.5) * 4;
                part.vy = this.params.vyMin + Math.random() * (this.params.vyMax - this.params.vyMin);
                part.alpha = 1;
                part.life = 0;
                part.maxLife = this.params.lifeMin + Math.random() * (this.params.lifeMax - this.params.lifeMin);
                part.char = st.char;
                part.active = true;
                this.activeParticlesCount++;
                break;
            }
        }
    }

    this.ctx.font = this.fontStr;
    this.ctx.fillStyle = this.textColor;
    for (let i = 0; i < this.staticChars.length; i++) {
        const c = this.staticChars[i];
        this.ctx.fillText(c.char, c.x, c.y);
    }

    for (let p=0; p<this.particles.length; p++) {
        const part = this.particles[p];
        if (part.active) {
            part.x += part.vx;
            part.y += part.vy;
            part.vy += this.params.ay;
            part.alpha = Math.max(0, part.alpha - this.params.alphaDecay);
            part.life++;

            if (part.life >= part.maxLife || part.alpha <= 0) {
               part.active = false;
               this.activeParticlesCount--;
            } else {
               this.ctx.globalAlpha = part.alpha;
               this.ctx.fillText(part.char, part.x, part.y);
            }
        }
    }
    this.ctx.globalAlpha = 1.0;

    if (this.staticChars.length === 0 && this.activeParticlesCount === 0) {
        this.stop();
        this.onComplete();
    } else {
        this.rAFId = requestAnimationFrame(this.loop);
    }
  };
}
