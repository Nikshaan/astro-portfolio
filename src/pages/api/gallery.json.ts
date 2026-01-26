import type { APIRoute } from 'astro';
import { getImage } from "astro:assets";

export const prerender = true;

interface PhotoModule {
    default: ImageMetadata;
}

export const GET: APIRoute = async () => {
    const photoModules = import.meta.glob<PhotoModule>("../../data/photos/photo*.webp", {
        eager: true,
    });

    const photoTitles: Record<number, string> = {
        1: "Manali",
        2: "Manali",
        3: "Mulki Station, Karnataka",
        4: "Padubidri beach, Udupi",
        5: "Marine drive, Mumbai",
        6: "Mall road, Manali",
        7: "Fort Kochi, Kerala",
        8: "Basilica of Bom Jesus, Goa",
        9: "Manali",
        10: "Humayun's tomb, Delhi",
        11: "Humayun's tomb, Delhi",
        12: "Humayun's tomb, Delhi",
        13: "Humayun's tomb, Delhi",
        14: "Jama masjid, Delhi",
        15: "Jama masjid, Delhi",
        16: "Red fort, Delhi",
        17: "Darwaza-i-rauza, Agra",
        18: "Darwaza-i-rauza, Agra",
        19: "Taj mahal, Agra",
        20: "Taj mahal, Agra",
        21: "Taj mahal, Agra",
        22: "Taj mahal, Agra",
        23: "Fort kochi, Kerala",
        24: "St. Francis church, Fort kochi, Kerala",
        25: "Padubidri beach, Udupi",
        26: "Kerala",
        27: "Fort kochi, Kerala",
        28: "Kerala",
        29: "Kunnukara, Kerala",
        30: "Kunnukara, Kerala",
        31: "Kunnukara, Kerala",
        32: "Manali",
        33: "Kerala",
        34: "Kerala",
        35: "Mangluru",
        36: "Mangluru",
        37: "Mangluru",
        38: "Mangluru",
        39: "Mangluru",
        40: "Wada, Maharashtra",
        41: "Mumbai, Maharashtra",
        42: "Mangluru",
        43: "Maharashtra",
        44: "Mangluru",
        45: "Mangluru",
        46: "Mangluru",
        47: "Mangluru",
        48: "Padubidri beach, Udupi",
        49: "Padubidri beach, Udupi",
        50: "Padubidri beach, Udupi",
        51: "Marine Drive, Mumbai",
        52: "Padubidri beach, Udupi",
        53: "Padubidri beach, Udupi",
        54: "Manali",
        55: "Padubidri beach, Udupi",
        56: "Padubidri beach, Udupi",
        57: "Padubidri beach, Udupi",
        58: "Hadimba temple, Manali",
        59: "Kerala",
        60: "Kerala",
        61: "Padubidri beach, Udupi",
        62: "Padubidri beach, Udupi",
        63: "Mumbai, Maharashtra",
        64: "Mumbai, Maharashtra",
        66: "Pune, Maharashtra",
        67: "Pune, Maharashtra",
        68: "Mumbai, Maharashtra",
        69: "Goa",
        70: "Basilica of bom jesus, Goa",
        71: "Manali",
        72: "Manali",
        73: "Marine Drive, Mumbai",
        74: "Marine Drive, Mumbai",
        75: "Marine Drive, Mumbai",
        76: "Taj hotel, Mumbai",
        77: "Gurudwara Shri Manikaran Sahib, Manikaran",
        78: "Manikaran",
        79: "Manali",
        80: "Kunnukara, Kerala",
        81: "Manali",
        82: "Hadimba temple, Manali",
        83: "Ugrasen ki Baoli, New Delhi",
        84: "Red fort, Delhi",
        85: "Manikaran",
        86: "Manikaran",
        87: "Manikaran",
        88: "Manali",
        89: "Manali",
        90: "Manali",
        91: "Manali",
        92: "Manali",
        93: "Mall road, Manali",
        94: "Manali",
        95: "Manali",
        96: "Attari - Wagah Border, Punjab",
        97: "Attari - Wagah Border, Punjab",
        98: "Manali",
        99: "Mangluru",
        100: "Mangluru",
        101: "Mangluru",
        102: "Padubidri beach, Udupi",
        103: "Daman, India",
        104: "Birds Aviary, Daman",
        105: "Birds Aviary, Daman",
        106: "Moti Daman Fort, Daman",
        107: "Moti Daman Fort, Daman",
        108: "Moti Daman Fort, Daman",
        109: "Moti Daman Fort, Daman",
    };

    const allImages = await Promise.all(
        Object.entries(photoModules)
            .sort(([a], [b]) => {
                const aNum = parseInt(a.match(/photo(\d+)/)?.[1] || "0");
                const bNum = parseInt(b.match(/photo(\d+)/)?.[1] || "0");
                return aNum - bNum;
            })
            .map(async ([path, module]) => {
                const photoNumber = parseInt(path.match(/photo(\d+)/)?.[1] || "0");
                const imageModule = module;
                if (!imageModule.default) return null;

                const optimizedFull = await getImage({
                    src: imageModule.default,
                    width: 1200,
                    quality: 85,
                    format: "avif",
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
            'Content-Type': 'application/json'
        }
    });
}
