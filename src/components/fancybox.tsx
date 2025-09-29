import React, { useEffect, useMemo, useCallback } from 'react';

interface ImageCarouselProps {
  images: any[];
  options?: any;
}

const CarouselImage = React.memo(({ image, index }: any) => (
  <div className="f-carousel__slide">
    <a 
      href={image.src} 
      data-fancybox="gallery" 
      data-src={image.src}
      data-caption={image.title}
    >
      <img
        src={image.thumbnail || image.src} 
        alt={image.alt} 
        title={image.title}
        loading={index < 3 ? "eager" : "lazy"}
        style={{ 
          width: '100%', 
          height: '500px',
          objectFit: 'cover',
          cursor: 'pointer'
        }}
      />
    </a>
  </div>
));

export default React.memo(function ImageCarousel({ images, options = {} }: ImageCarouselProps) {
  const [carouselRef, setCarouselRef] = React.useState<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  useEffect(() => {
    if (!carouselRef || isLoaded) return;

    let mounted = true;

    const loadLibraries = async () => {
      try {
        // Load only what we need
        const [carousel, fancybox] = await Promise.all([
          import('@fancyapps/ui/dist/carousel/').then(m => m.Carousel),
          import('@fancyapps/ui/dist/fancybox/').then(m => m.Fancybox)
        ]);

        const { Arrows } = await import('@fancyapps/ui/dist/carousel/carousel.arrows.js');

        if (!mounted) return;

        // Initialize carousel with minimal options
        const instance = carousel(carouselRef, {
          infinite: true,
          slidesPerPage: 1,
          center: true,
          Dots: true,
          Navigation: true,
          Arrows: { autoHide: false },
          ...options
        }, { Arrows }).init();

        // Initialize fancybox with minimal toolbar
        fancybox.bind("[data-fancybox='gallery']", {
          Toolbar: {
            display: {
              left: [],
              middle: ["zoomIn", "zoomOut"],
              right: ["close"],
            },
          },
        });

        setIsLoaded(true);

        return () => {
          if (mounted) {
            instance?.destroy();
            fancybox.unbind("[data-fancybox='gallery']");
          }
        };
      } catch (error) {
        console.error('Failed to load:', error);
      }
    };

    loadLibraries();
    return () => { mounted = false; };
  }, [carouselRef, options, isLoaded]);

  const renderedImages = useMemo(() => 
    images.map((image, index) => (
      <CarouselImage key={`${image.src}-${index}`} image={image} index={index} />
    )), [images]
  );

  return (
    <div ref={setCarouselRef} className="f-carousel">
      {renderedImages}
    </div>
  );
});
