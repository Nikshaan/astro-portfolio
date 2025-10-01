import { useEffect, useRef, useState } from 'react';
import '@fancyapps/ui/dist/carousel/carousel.css';
import '@fancyapps/ui/dist/fancybox/fancybox.css';

export default function ImageCarousel({ images, options }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Fix hydration mismatch - only initialize after client mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!ref.current || !isMounted) return;
    
    const initCarousel = async () => {
      try {
        const [{ Carousel }, { Arrows }, { Fancybox }] = await Promise.all([
          import('@fancyapps/ui/dist/carousel/'),
          import('@fancyapps/ui/dist/carousel/carousel.arrows.js'),
          import('@fancyapps/ui/dist/fancybox/')
        ]);

        // Ensure DOM is ready
        setTimeout(() => {
          if (!ref.current) return;

          const carouselInstance = Carousel(ref.current, {
            infinite: true,
            slidesPerPage: 1,
            center: true,
            Dots: true,
            Navigation: true,
            Arrows: { autoHide: false },
            ...options
          }, { Arrows });

          carouselInstance.init();

          Fancybox.bind("[data-fancybox='gallery']", {
            Toolbar: { display: { right: ["close"] } }
          });
        }, 100);

      } catch (error) {
        console.error('Carousel failed:', error);
      }
    };

    initCarousel();
  }, [isMounted, options]);

  // Show loading state until mounted (prevents hydration mismatch)
  if (!isMounted) {
    return (
      <div className="f-carousel-loading">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {images.slice(0, 3).map((img: any, i: number) => (
            <div key={i} style={{ width: '100%', maxWidth: '400px' }}>
              <img 
                src={img.src} 
                alt={img.alt}
                style={{
                  width: '100%', 
                  height: '300px', 
                  objectFit: 'cover',
                  display: 'block'
                }} 
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="f-carousel">
      {images.map((img: any, i: number) => (
        <div key={i} className="f-carousel__slide">
          <a href={img.src} data-fancybox="gallery" data-caption={img.title}>
            <img 
              src={img.src} 
              alt={img.alt} 
              loading={i < 2 ? "eager" : "lazy"} 
              style={{
                width: '100%', 
                height: '500px', 
                objectFit: 'cover',
                display: 'block'
              }} 
            />
          </a>
        </div>
      ))}
    </div>
  );
}
