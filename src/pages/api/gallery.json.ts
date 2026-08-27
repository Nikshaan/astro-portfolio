import type { APIRoute } from "astro";
import { getImage } from "astro:assets";
import { photoTitles } from "../../data/photoTitles";
import { photoOrderRank } from "../../data/photoOrder";

export const prerender = true;

interface PhotoModule {
  default: ImageMetadata;
}

export const GET: APIRoute = async () => {
  const photoModules = import.meta.glob<PhotoModule>(
    "../../data/photos/photo*.webp",
    {
      eager: true,
    },
  );

  const allImages = await Promise.all(
    Object.entries(photoModules)
      .sort(([a], [b]) => {
        const aNum = parseInt(a.match(/photo(\d+)/)?.[1] || "0");
        const bNum = parseInt(b.match(/photo(\d+)/)?.[1] || "0");
        return photoOrderRank(aNum) - photoOrderRank(bNum);
      })
      .map(async ([path, module]) => {
        const photoNumber = parseInt(path.match(/photo(\d+)/)?.[1] || "0");
        const imageModule = module;
        if (!imageModule.default) return null;

        const optimizedFull = await getImage({
          src: imageModule.default,
          width: 1200,
          quality: 85,
          format: "webp",
        });

        return {
          src: optimizedFull.src,
          width: optimizedFull.attributes.width,
          height: optimizedFull.attributes.height,
          title: photoTitles[photoNumber] || `Photo ${photoNumber}`,
          alt: `Photography - ${photoTitles[photoNumber] || "Photo " + photoNumber}`,
          caption: photoTitles[photoNumber] || `Photo ${photoNumber}`,
        };
      }),
  );

  const validImages = allImages.filter(Boolean);

  return new Response(JSON.stringify(validImages), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
};
