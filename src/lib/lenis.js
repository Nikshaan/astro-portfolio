import Lenis from 'lenis';

const lenis = new Lenis({
  lerp: 0.1,
  wheelMultiplier: 1,
  anchors: true
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);
