import React, { useEffect, useMemo, useCallback } from 'react';
import useCarousel from './useFancybox';
import { Fancybox } from "@fancyapps/ui/dist/fancybox/";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

interface ImageCarouselProps {
  images: {
    src: string;
    alt: string;
    title?: string;
    thumbnail?: string;
  }[];
  options?: any;
}

const CarouselImage = React.memo(({ image, index }: { image: any; index: number }) => (
  <div className="f-carousel__slide">
    <a 
      href={image.src} 
      data-fancybox="gallery" 
      data-src={image.src}
      data-caption={image.title}
      tabIndex={0}
    >
      <img
        src={image.thumbnail || image.src} 
        alt={image.alt} 
        title={image.title}
        loading="lazy"
        tabIndex={-1}
        style={{ 
          width: '100%', 
          height: '300px',
          objectFit: 'cover',
          cursor: 'pointer'
        }}
      />
    </a>
  </div>
));

export default React.memo(function ImageCarousel({ images, options = {} }: ImageCarouselProps) {
  
  const carouselOptions = useMemo(() => ({
    infinite: true,
    center: true,
    slidesPerPage: 1,
    transition: "slide",
    Dots: true,
    Navigation: true,
    Arrows: {
      autoHide: false,
    },
    keyboard: {
    tabToNext: true,
    tabToPrev: true,
    },
    trapFocus: false,
      ...options
  }), [options]);

  const [carouselRef, carouselInstance] = useCarousel(carouselOptions);

  const initializeFancybox = useCallback(() => {
    Fancybox.bind("[data-fancybox='gallery']", {
      Toolbar: {
        display: {
          left: ["infobar"],
          middle: [
            "zoomIn",
            "zoomOut",
            "toggle1to1",
            "rotateCCW",
            "rotateCW",
            "flipX",
            "flipY",
          ],
          right: ["slideshow", "thumbs", "close"],
        },
      },
    });
  }, []);

  useEffect(() => {
    initializeFancybox();
    return () => {
      Fancybox.unbind("[data-fancybox='gallery']");
    };
  }, [initializeFancybox]);

  const renderedImages = useMemo(() => 
    images.map((image, index) => (
      <CarouselImage key={`${image.src}-${index}`} image={image} index={index} />
    )), [images]
  );

  return (
    <div ref={carouselRef} className="f-carousel" style={{ position: 'relative' }}>
      {renderedImages}
    </div>
  );
});
