let fancyboxPromise: Promise<any> | null = null;
let carouselPromise: Promise<any> | null = null;

export const loadFancybox = () => {
  if (!fancyboxPromise) {
    fancyboxPromise = Promise.all([
      import('@fancyapps/ui/dist/fancybox/'),
      import('@fancyapps/ui/dist/fancybox/fancybox.css')
    ]).then(([module]) => module);
  }
  return fancyboxPromise;
};

export const loadCarousel = () => {
  if (!carouselPromise) {
    carouselPromise = Promise.all([
      import('@fancyapps/ui/dist/carousel/'),
      import('@fancyapps/ui/dist/carousel/carousel.arrows.js'),
      import('@fancyapps/ui/dist/carousel/carousel.css'),
      import('@fancyapps/ui/dist/carousel/carousel.arrows.css')
    ]).then(([carouselModule, arrowsModule]) => ({
      Carousel: carouselModule.Carousel,
      Arrows: arrowsModule.Arrows
    }));
  }
  return carouselPromise;
};

export const loadBoth = () => Promise.all([loadCarousel(), loadFancybox()]);
