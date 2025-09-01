/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateDecadeImage, generateSurpriseMeSuggestion, refineImaginationPrompt } from './services/geminiService';
import PolaroidCard from './components/PolaroidCard';
import { createAlbumPage } from './lib/albumUtils';
import Footer from './components/Footer';
import { cn } from './lib/utils';

const ERA_CATEGORIES = [
    {
        name: 'Ancient & Mythological',
        eras: ['Ancient Egyptian Pharaoh', 'Roman Gladiator', 'Viking Warrior', 'Feudal Japan Samurai', 'Ramayana Era Royalty', 'Greek Philosopher', 'Aztec Priest', 'Medieval Knight'],
    },
    {
        name: 'Historical & Cultural',
        eras: ['Renaissance Artist', 'Elizabethan Noble', 'Golden Age Pirate', 'French Revolutionist', 'Victorian Era Explorer', 'Roaring Twenties Flapper', '1940s Film Noir Detective', '1950s Rock & Roll Star', '1960s Hippie', '1970s Disco Dancer', '1980s Neon Punk', '1990s Grunge Musician', '2000s Y2K Pop Icon', 'Wild West Outlaw', '1970s Bollywood Star', 'Indian Maharaja'],
    },
    {
        name: 'Artistic Styles',
        eras: ['as an Impressionist Painting', 'as a Cubist Portrait', 'in the Art Deco style', 'as a Surrealist Dream', 'as a Pop Art piece', 'as a Baroque Painting', 'as a Minimalist line drawing'],
    },
    {
        name: 'Future & Sci-Fi',
        eras: ['Cyberpunk Hacker', 'Solarpunk Botanist', 'Galactic Space Explorer', 'Steampunk Inventor', 'Post-Apocalyptic Survivor', 'Utopian Future Citizen', 'Starship Captain'],
    },
    {
        name: 'Fantasy',
        eras: ['as a High Elf', 'as a Dwarven Blacksmith', 'as a powerful Sorcerer', 'as a Forest Fairy', 'as a DnD-style Rogue'],
    }
];
const ALL_ERAS = ERA_CATEGORIES.flatMap(category => category.eras);

const CULTURAL_LOOKS_DATA: Record<string, string[]> = {
    // --- Africa ---
    'Egypt': ['Galabeya', 'Bedouin traditional dress'],
    'Ethiopia': ['Habesha Kemis', 'Oromo traditional wear'],
    'Ghana': ['Kente cloth', 'Adinkra cloth smock'],
    'Kenya': ['Maasai Shuka and beadwork', 'Kikuyu traditional attire', 'Swahili Kanga'],
    'Morocco': ['Djellaba', 'Kaftan', 'Berber traditional dress'],
    'Nigeria': ['Yoruba Aso Oke', 'Igbo Isiagu', 'Hausa Babban Riga', 'Efik traditional attire'],
    'South Africa': ['Zulu traditional attire (Umhbaco)', 'Xhosa beadwork clothing', 'Ndebele patterned blankets'],

    // --- Americas ---
    'Argentina': ['Gaucho traditional wear', 'Tango dress'],
    'Bolivia': ['Pollera skirt and Bowler hat', 'Aymara traditional dress'],
    'Brazil': ['Bahian dress (Baiana)', 'Samba costume', 'Gaúcho bombachas'],
    'Canada': ['First Nations ceremonial regalia', 'Métis sash', 'Inuit amauti'],
    'Chile': ['Huaso and Huasa attire', 'Mapuche traditional dress'],
    'Colombia': ['Sombrero Vueltiao and white shirt', 'Cumbia pollera dress'],
    'Guatemala': ['Maya huipil and corte', 'Quetzaltenango traje'],
    'Mexico': ['Jalisco Mariachi suit', 'Veracruz Jarocha dress', 'Yucatán Huipil', 'Oaxaca Tehuana dress', 'Chiapas Parachico costume'],
    'Peru': ['Andean Poncho and Chullo', 'Quechua Lliklla mantle', 'Shipibo-Conibo geometric patterns'],
    'United States': ['Native American powwow regalia', 'Hawaiian Aloha shirt and muʻumuʻu', 'Cajun Mardi Gras costume'],

    // --- Asia ---
    'Afghanistan': ['Pashtun Khet partug', 'Hazara traditional dress'],
    'Bhutan': ['Gho for men', 'Kira for women'],
    'China': ['Hanfu', 'Qipao (Cheongsam)', 'Tibetan Chuba', 'Miao ethnic embroidery'],
    'India': [
        "Andhra Pradesh - Langa Voni / Saree",
        "Arunachal Pradesh - Adi traditional attire",
        "Arunachal Pradesh - Apatani traditional attire",
        "Arunachal Pradesh - Nyishi traditional attire",
        "Arunachal Pradesh - Galo traditional attire",
        "Arunachal Pradesh - Monpa traditional attire",
        "Assam - Bodo traditional attire (Dokhona)",
        "Assam - Mishing traditional attire (Ege)",
        "Assam - Karbi traditional attire (Pini-pekok)",
        "Assam - Dimasa traditional attire (Rigu)",
        "Bihar - Saree (Seedha Anchal style)",
        "Chhattisgarh - Lugda Saree / Polkha",
        "Goa - Pano Bhaju / Nav-Vari Saree",
        "Gujarat - Chaniya Choli / Ghagra",
        "Haryana - Ghagra / Odhni",
        "Himachal Pradesh - Pattu / Salwar Kameez",
        "Jharkhand - Saree / Panchi Parhan",
        "Karnataka - Ilkal & Mysore Silk Sarees",
        "Kerala - Mundum Neriyathum / Kasavu Saree",
        "Madhya Pradesh - Chanderi & Maheshwari Sarees",
        "Maharashtra - Nauvari Saree / Paithani Saree",
        "Manipur - Meitei (Phanek, Innaphi)",
        "Manipur - Tangkhul Naga attire",
        "Manipur - Rongmei (Kabui) Naga attire",
        "Manipur - Thadou Kuki attire",
        "Meghalaya - Khasi (Jainsem)",
        "Meghalaya - Garo (Dakmanda)",
        "Meghalaya - Jaintia (Pnar) attire",
        "Mizoram - Puan (Lushai, Hmar, Lai)",
        "Mizoram - Chakma traditional attire",
        "Nagaland - Angami Naga shawls",
        "Nagaland - Ao Naga warrior attire",
        "Nagaland - Konyak Naga traditional dress",
        "Nagaland - Sumi (Sema) Naga attire",
        "Nagaland - Lotha Naga shawls",
        "Odisha - Sambalpuri & Bomkai Sarees",
        "Punjab - Patiala Salwar Kameez",
        "Rajasthan - Ghagra Choli / Rajputi Poshak",
        "Sikkim - Bhutia (Bakhu/Kho)",
        "Sikkim - Lepcha (Dumdyám)",
        "Sikkim - Limbu traditional attire",
        "Tamil Nadu - Kanjeevaram Saree / Pavadai Dhavani",
        "Telangana - Pochampally & Gadwal Sarees",
        "Tripura - Tripuri (Rignai, Risa)",
        "Tripura - Reang (Bru) traditional attire",
        "Tripura - Chakma traditional attire",
        "Uttar Pradesh - Chikankari Saree / Salwar Kameez",
        "Uttarakhand - Ghagri / Pichora",
        "West Bengal - Tant & Baluchari Sarees"
    ],
    'Indonesia': ['Batik shirt', 'Kebaya', 'Balinese temple dress'],
    'Iran': ['Persian traditional clothing', 'Kurdish traditional dress'],
    'Japan': ['Kimono formal wear', 'Yukata summer wear', 'Ainu traditional dress', 'Ryukyuan from Okinawa'],
    'Kazakhstan': ['Shapan (caftan)', 'Saukele headdress'],
    'Korea': ['Hanbok formal wear', 'Jeogori and Chima'],
    'Malaysia': ['Baju Melayu for men', 'Baju Kurung for women'],
    'Mongolia': ['Deel', 'Gutal boots'],
    'Nepal': ['Daura-Suruwal and Gunyu-Cholo', 'Newari traditional wear'],
    'Pakistan': ['Shalwar Kameez', 'Sindhi Ajrak'],
    'Philippines': ['Barong Tagalog for men', 'Maria Clara Gown for women', 'Igorot traditional wear'],
    'Saudi Arabia': ['Thobe and Ghutra for men', 'Abaya and Niqab for women'],
    'Thailand': ['Chut Thai (Thai formal dress)', 'Hill tribe traditional clothing'],
    'Turkey': ['Ottoman-style Kaftan', 'Anatolian folk dress'],
    'Vietnam': ['Áo Dài', 'Áo Tứ Thân (four-part dress)'],

    // --- Europe ---
    'Austria': ['Lederhosen', 'Dirndl'],
    'England': ['Morris dancing costume', 'Beefeater uniform'],
    'Finland': ['Kansallispuku (national costume)'],
    'France': ['Breton traditional dress', 'Alsatian costume'],
    'Germany': ['Bavarian Lederhosen and Dirndl', 'Black Forest Tracht'],
    'Greece': ['Foustanella', 'Amalia costume'],
    'Hungary': ['Matyó embroidery', 'Kalocsai folk dress'],
    'Iceland': ['Þjóðbúningurinn (national costume)'],
    'Ireland': ['Aran sweater', 'Irish dancing dress'],
    'Italy': ['Sardinian traditional dress', 'Sicilian folk costume'],
    'Netherlands': ['Volendam traditional costume', 'Zeeland regional dress'],
    'Norway': ['Bunad (national costume)'],
    'Poland': ['Kraków folk costume', 'Goral (highlander) outfit'],
    'Portugal': ['Minho region Traje de Viana', 'Nazaré fishermen clothing'],
    'Romania': ['Ie (traditional blouse)', 'Carpathian folk costume'],
    'Russia': ['Sarafan', 'Kosovorotka shirt', 'Ushanka hat'],
    'Scotland': ['Highland kilt and tartan', 'Shetland Fair Isle knitwear'],
    'Spain': ['Andalusian Flamenco dress', 'Traje de Fallera (Valencia)', 'Basque traditional clothing'],
    'Sweden': ['Sverigedräkten (national costume)', 'Sami Gákti'],
    'Switzerland': ['Appenzeller Tracht', 'Berner Tracht'],
    'Ukraine': ['Vyshyvanka (embroidered shirt)', 'Sharovary trousers'],

    // --- Oceania ---
    'Australia': ['Aboriginal ceremonial dress', 'Akubra hat and Driza-Bone coat'],
    'Fiji': ['Sulu (sarong)', 'Tapa cloth'],
    'New Zealand': ['Māori Kākahu (cloak)', 'Piupiu skirt'],
    'Papua New Guinea': ['Highlands ceremonial dress', 'Trobriand Islands grass skirts'],
    'Samoa': ['Lavalava', 'Puletasi'],
};

const PREDEFINED_STYLES = [
    'Photorealistic', 'Cinematic', 'Oil Painting', 'Watercolor',
    'Pencil Sketch', 'Anime / Manga', 'Concept Art', 'Pixel Art',
    'Cyberpunk', 'Steampunk', 'Vintage Photo', 'Minimalist'
];

const FIGURE_SIZE_OPTIONS = [
    "Unspecified", "Slim", "Athletic", "Average", "Curvy", "Muscular", "Broad-shouldered", "Petite"
];

const ASPECT_RATIO_OPTIONS = ["Portrait (3:4)", "Landscape (4:3)", "Widescreen (16:9)", "Square (1:1)"];

const IMAGE_FRAMING_OPTIONS = ["Full Body Shot", "Medium Shot (Waist Up)", "Cowboy Shot (Mid-thigh Up)", "Close-up Portrait", "Extreme Close-up"];


const FILTERS_DATA = [
    { name: 'Vintage Film', description: 'Classic, grainy look with faded colors, reminiscent of old film stock.' },
    { name: 'Noir B&W', description: 'High-contrast black and white with deep shadows and dramatic lighting.' },
    { name: 'Sepia Tone', description: 'Warm, brownish monochrome for an antique, historical photograph feel.' },
    { name: 'Golden Hour', description: 'Soft, warm, and diffused lighting as if shot during sunrise or sunset.' },
    { name: 'Sun Flare', description: 'Adds a bright, artistic lens flare effect, suggesting strong sunlight.' },
    { name: 'Light Leaks', description: 'Simulates streaks of colored light caused by an old camera\'s light leak.' },
    { name: 'Lomography', description: 'Vibrant, saturated colors, high contrast, and vignetting for a quirky look.' },
    { name: 'Cyanotype', description: 'A striking cyan-blue monochrome print, like an old architectural blueprint.' },
    { name: 'Ghibli Art', description: 'Transforms the photo into the beautiful, hand-drawn animation style of Studio Ghibli films, with lush backgrounds and soft characters.' },
    { name: 'Glitch Art', description: 'Digital distortion, pixelation, and color shifts for a modern, techy feel.' },
    { name: 'Double Exposure', description: 'Blends the original photo with a second, often thematic, image like a forest or cityscape.' },
    { name: 'Infrared Photo', description: 'Surreal look where foliage turns white and skies darken dramatically.' },
    { name: 'Anamorphic Lens Flare', description: 'Adds cinematic, horizontal blueish lens flares across the image.' },
];

const GHOST_POLAROIDS_CONFIG = [
  { initial: { x: "-150%", y: "-100%", rotate: -30 }, transition: { delay: 0.2 } },
  { initial: { x: "150%", y: "-80%", rotate: 25 }, transition: { delay: 0.4 } },
  { initial: { x: "-120%", y: "120%", rotate: 45 }, transition: { delay: 0.6 } },
  { initial: { x: "180%", y: "90%", rotate: -20 }, transition: { delay: 0.8 } },
  { initial: { x: "0%", y: "-200%", rotate: 0 }, transition: { delay: 0.5 } },
  { initial: { x: "100%", y: "150%", rotate: 10 }, transition: { delay: 0.3 } },
];


type ImageStatus = 'pending' | 'done' | 'error';
interface GeneratedImage {
    status: ImageStatus;
    url?: string;
    error?: string;
    prompt?: string;
}

type AppState = 'idle' | 'mode-selection' | 'era-selection' | 'cultural-builder' | 'imagination-builder' | 'filter-builder' | 'generating' | 'results-shown';
type GenerationMode = 'quick' | 'cultural' | 'imagination' | 'filter';
type SurpriseMeField = 'scenery' | 'attire' | 'pose' | 'hairStyle' | 'eyeStyle';

const primaryButtonClasses = "font-permanent-marker text-xl text-center text-black bg-yellow-400 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:-rotate-2 hover:bg-yellow-300 shadow-[2px_2px_0px_2px_rgba(0,0,0,0.2)]";
const secondaryButtonClasses = "font-permanent-marker text-xl text-center text-white bg-white/10 backdrop-blur-sm border-2 border-white/80 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:rotate-2 hover:bg-white hover:text-black";
const selectClasses = "w-full p-3 bg-neutral-800 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
const labelClasses = "text-lg font-permanent-marker text-neutral-400 mb-2 block";
const textAreaClasses = "w-full p-3 bg-neutral-800 border border-neutral-600 rounded-md text-neutral-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-200 resize-y h-24";


const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, [matches, query]);
    return matches;
};

function App() {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImage>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [appState, setAppState] = useState<AppState>('idle');
    const [generationMode, setGenerationMode] = useState<GenerationMode | null>(null);
    const [eras, setEras] = useState<string[]>([]);
    const [culturalSelections, setCulturalSelections] = useState({
        country: null as string | null,
        region: null as string | null,
    });
     const [imaginationInputs, setImaginationInputs] = useState({
        scenery: '',
        attire: '',
        pose: '',
        hairStyle: '',
        eyeStyle: '',
        figureSize: 'Unspecified',
        style: '',
        aspectRatio: 'Portrait (3:4)',
        imageFraming: 'Full Body Shot',
    });
    const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
    const [surpriseMeLoading, setSurpriseMeLoading] = useState<SurpriseMeField | null>(null);
    const [isRefiningPrompt, setIsRefiningPrompt] = useState<boolean>(false);
    const isMobile = useMediaQuery('(max-width: 768px)');

    const selectRandomEras = useCallback(() => {
        const shuffled = [...ALL_ERAS].sort(() => 0.5 - Math.random());
        setEras(shuffled.slice(0, 6));
    }, []);

    const toggleEraSelection = useCallback((eraToToggle: string) => {
        setEras(prevEras => {
            const isSelected = prevEras.includes(eraToToggle);
            if (isSelected) {
                return prevEras.filter(era => era !== eraToToggle);
            } else if (prevEras.length < 6) {
                return [...prevEras, eraToToggle];
            }
            return prevEras;
        });
    }, []);

    const handleCountrySelect = (e: ChangeEvent<HTMLSelectElement>) => {
        const country = e.target.value;
        setCulturalSelections({ country: country || null, region: null }); // Reset region when country changes
    };

    const handleRegionSelect = (e: ChangeEvent<HTMLSelectElement>) => {
        const region = e.target.value;
        setCulturalSelections(prev => ({ ...prev, region: region || null }));
    };

    const handleImaginationInputChange = (e: ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setImaginationInputs(prev => ({ ...prev, [name]: value }));
    };

    const handleStyleButtonClick = (styleToAdd: string) => {
        setImaginationInputs(prev => {
            const currentStyles = prev.style.split(',').map(s => s.trim()).filter(Boolean);
            const styleSet = new Set(currentStyles);

            if (styleSet.has(styleToAdd)) {
                styleSet.delete(styleToAdd);
            } else {
                styleSet.add(styleToAdd);
            }

            return { ...prev, style: Array.from(styleSet).join(', ') };
        });
    };

    const handleSurpriseMe = async (field: SurpriseMeField) => {
        setSurpriseMeLoading(field);
        try {
            const suggestion = await generateSurpriseMeSuggestion(field);
            setImaginationInputs(prev => ({ ...prev, [field]: suggestion }));
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Could not get a suggestion. Please try again.");
        } finally {
            setSurpriseMeLoading(null);
        }
    };

    const buildCulturalPrompt = useCallback(() => {
        const { country, region } = culturalSelections;
        if (!country || !region) return "Please select a Country and a Region/Attire to build a prompt.";

        return `Reimagine the person in this photo wearing traditional ${region} attire from ${country}. The image should be a respectful and authentic representation. Place them in a setting that is culturally relevant, like a traditional marketplace, a scenic landscape typical of the region, or in front of classic local architecture. The final output should be an award-winning photograph of masterpiece quality, with cinematic composition and lighting. The image must be hyper-detailed, photorealistic, and in very high quality 8k resolution.`;
    }, [culturalSelections]);
    
    const buildImaginationPrompt = useCallback(async (inputs: typeof imaginationInputs): Promise<string> => {
        const { scenery, attire, pose, hairStyle, eyeStyle, figureSize, style, aspectRatio, imageFraming } = inputs;
        if (!scenery.trim() || !attire.trim()) {
            return "Please describe the scenery and attire (required fields) to build a prompt.";
        }
        
        const refinedPrompt = await refineImaginationPrompt(inputs);
        return `${refinedPrompt} The final output should be an award-winning photograph of masterpiece quality, with cinematic composition and lighting. The image must be hyper-detailed, photorealistic, and in very high quality 8k resolution, seamlessly integrating them into the described scene.`;
    }, []);
    
    const buildFilterPrompt = useCallback(() => {
        if (!selectedFilter) return "Select a filter to see the prompt.";
        return `Reimagine the person in this photo with a "${selectedFilter}" photographic filter effect. The overall composition and the person should remain the same, but the image should be transformed to have the distinct visual characteristics of that style, including color grading, grain, and lighting. The final output should be an award-winning photograph of masterpiece quality, with cinematic composition and lighting, perfectly capturing the filter's essence. The image must be in very high quality 8k resolution.`;
    }, [selectedFilter]);


    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setAppState('mode-selection');
                setGeneratedImages({});
                setEras([]);
                setGenerationMode(null);
                setCulturalSelections({ country: null, region: null });
                setImaginationInputs({ scenery: '', attire: '', pose: '', hairStyle: '', eyeStyle: '', figureSize: 'Unspecified', style: '', aspectRatio: 'Portrait (3:4)', imageFraming: 'Full Body Shot' });
                setSelectedFilter(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateQuickTripClick = async () => {
        if (!uploadedImage || eras.length === 0) return;
        setIsLoading(true);
        setAppState('generating');
        const initialImages: Record<string, GeneratedImage> = {};
        eras.forEach(era => {
            const prompt = `Reimagine the person in this photo in the style of "${era}". This includes appropriate clothing, hairstyle, accessories, background, photo/art style, and the overall aesthetic of that era. The final output should be an award-winning photograph of masterpiece quality, with cinematic composition and lighting. The image must be hyper-detailed, photorealistic, and in very high quality 8k resolution, showing the person clearly, consistent with the requested style.`;
            initialImages[era] = { status: 'pending', prompt };
        });
        setGeneratedImages(initialImages);
        const concurrencyLimit = 2;
        const erasQueue = [...eras];
        const processEra = async (era: string) => {
            try {
                const prompt = generatedImages[era]?.prompt || `Reimagine the person in this photo in the style of "${era}".`;
                const resultUrl = await generateDecadeImage(uploadedImage, prompt, era);
                setGeneratedImages(prev => ({ ...prev, [era]: { ...prev[era], status: 'done', url: resultUrl } }));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                setGeneratedImages(prev => ({ ...prev, [era]: { ...prev[era], status: 'error', error: errorMessage } }));
                console.error(`Failed to generate image for ${era}:`, err);
            }
        };
        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (erasQueue.length > 0) {
                const era = erasQueue.shift();
                if (era) await processEra(era);
            }
        });
        await Promise.all(workers);
        setIsLoading(false);
        setAppState('results-shown');
    };

    const handleGenerateSingleImage = async (prompt: string, themeKey: string, context: string) => {
        if (!uploadedImage) return;
        setIsLoading(true);
        setAppState('generating');
    
        const initialImages: Record<string, GeneratedImage> = {
            [themeKey]: { status: 'pending', prompt: prompt }
        };
        setGeneratedImages(initialImages);
    
        try {
            const resultUrl = await generateDecadeImage(uploadedImage, prompt, context);
            setGeneratedImages({ [themeKey]: { status: 'done', url: resultUrl, prompt: prompt } });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            console.error(`Failed to generate image for ${themeKey}:`, err);
            setGeneratedImages({ [themeKey]: { status: 'error', error: errorMessage, prompt: prompt } });
        }
        
        setIsLoading(false);
        setAppState('results-shown');
    };
    
    const handleGenerateCulturalLookClick = async () => {
        if (!culturalSelections.country || !culturalSelections.region) return;
        const prompt = buildCulturalPrompt();
        const themeKey = `${culturalSelections.region}, ${culturalSelections.country}`;
        await handleGenerateSingleImage(prompt, themeKey, themeKey);
    };

    const handleGenerateImaginationClick = async () => {
        const { scenery, attire, style } = imaginationInputs;
        if (!scenery.trim() || !attire.trim()) return;
        setIsRefiningPrompt(true);
        const prompt = await buildImaginationPrompt(imaginationInputs);
        const themeKey = `Your Imagination`;
        const context = style || scenery || attire || "a custom scene";
        await handleGenerateSingleImage(prompt, themeKey, context.substring(0, 50));
        setIsRefiningPrompt(false);
    };

    const handleGenerateFilterClick = async () => {
        if (!selectedFilter) return;
        const prompt = buildFilterPrompt();
        const themeKey = selectedFilter;
        await handleGenerateSingleImage(prompt, themeKey, themeKey);
    };


    const handleRegenerateEra = async (era: string) => {
        if (!uploadedImage) return;
        const imageToRegen = generatedImages[era];
        if (!imageToRegen || imageToRegen.status === 'pending') return;
        
        const promptToUse = imageToRegen.prompt;
        if (!promptToUse) {
            console.error(`Regeneration failed: No prompt found for "${era}"`);
            setGeneratedImages(prev => ({ ...prev, [era]: { ...prev[era], status: 'error', error: 'Could not find original prompt to regenerate.' } }));
            return;
        }
        
        setGeneratedImages(prev => ({ ...prev, [era]: { status: 'pending', prompt: promptToUse } }));

        try {
            const context = era; // The key itself serves as the context for fallback
            const resultUrl = await generateDecadeImage(uploadedImage, promptToUse, context);
            setGeneratedImages(prev => ({ ...prev, [era]: { status: 'done', url: resultUrl, prompt: promptToUse } }));
        } catch (err)
 {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setGeneratedImages(prev => ({ ...prev, [era]: { status: 'error', error: errorMessage, prompt: promptToUse } }));
            console.error(`Failed to regenerate image for ${era}:`, err);
        }
    };
    
    const handleReset = () => {
        setUploadedImage(null);
        setGeneratedImages({});
        setEras([]);
        setAppState('idle');
        setGenerationMode(null);
        setCulturalSelections({ country: null, region: null });
        setImaginationInputs({ scenery: '', attire: '', pose: '', hairStyle: '', eyeStyle: '', figureSize: 'Unspecified', style: '', aspectRatio: 'Portrait (3:4)', imageFraming: 'Full Body Shot' });
        setSelectedFilter(null);
        setIsRefiningPrompt(false);
    };

    const handleDownloadIndividualImage = (era: string) => {
        const image = generatedImages[era];
        if (image?.status === 'done' && image.url) {
            const link = document.createElement('a');
            link.href = image.url;
            link.download = `kritrim-${era.toLowerCase().replace(/\s+/g, '-')}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadAlbum = async () => {
        setIsDownloading(true);
        try {
            const imageData = Object.entries(generatedImages)
                .filter(([, image]) => image.status === 'done' && image.url)
                .reduce((acc, [era, image]) => {
                    acc[era] = image!.url!;
                    return acc;
                }, {} as Record<string, string>);

            if (Object.keys(imageData).length === 0) {
                 alert("No successful images to download.");
                 return;
            }

            const albumDataUrl = await createAlbumPage(imageData);
            const link = document.createElement('a');
            link.href = albumDataUrl;
            link.download = 'kritrim-album.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to create or download album:", error);
            alert("Sorry, there was an error creating your album. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    const resultEras = (appState === 'generating' || appState === 'results-shown') 
        ? Object.keys(generatedImages)
        : [];
        

    return (
        <main className="bg-black text-neutral-200 min-h-screen w-full flex flex-col items-center justify-center p-4 pb-24 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.05]"></div>
            
            <div className="z-10 flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
                <AnimatePresence>
                {(appState === 'idle' || appState === 'generating' || appState === 'results-shown') && (
                    <motion.div 
                        key="header"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center mb-10"
                    >
                        <h1 className="text-6xl md:text-8xl font-caveat font-bold text-neutral-100">Kritrim</h1>
                        <p className="font-permanent-marker text-neutral-300 mt-2 text-xl tracking-wide">Generate yourself through time.</p>
                    </motion.div>
                 )}
                 </AnimatePresence>

                {appState === 'idle' && (
                     <div className="relative flex flex-col items-center justify-center w-full">
                        {GHOST_POLAROIDS_CONFIG.map((config, index) => (
                             <motion.div key={index} className="absolute w-80 h-[26rem] rounded-md p-4 bg-neutral-100/10 blur-sm" initial={config.initial} animate={{ x: "0%", y: "0%", rotate: (Math.random() - 0.5) * 20, scale: 0, opacity: 0 }} transition={{ ...config.transition, ease: "circOut", duration: 2 }} />
                        ))}
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2, duration: 0.8, type: 'spring' }} className="flex flex-col items-center">
                            <label htmlFor="file-upload" className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                                 <PolaroidCard caption="Click to begin" status="done" />
                            </label>
                            <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                            <p className="mt-8 font-permanent-marker text-neutral-500 text-center max-w-xs text-lg"> Click the polaroid to upload your photo and start your journey through time. </p>
                        </motion.div>
                    </div>
                )}
                
                { (appState === 'mode-selection' || appState === 'era-selection' || appState === 'cultural-builder' || appState === 'imagination-builder' || appState === 'filter-builder') && uploadedImage && (
                    <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="flex flex-col items-center gap-6 w-full max-w-4xl">
                         <PolaroidCard imageUrl={uploadedImage} caption="Your Photo" status="done" isDraggable={false} />
                         <AnimatePresence mode="wait">
                            {appState === 'mode-selection' && (
                                <motion.div key="mode-selection" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="text-center w-full">
                                    <h2 className="font-permanent-marker text-3xl text-neutral-200 tracking-wide mb-6">Choose Your Journey</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 justify-center items-stretch gap-6 max-w-3xl mx-auto">
                                        <div onClick={() => { setGenerationMode('quick'); setAppState('era-selection'); }} className="p-6 bg-white/5 border border-white/20 rounded-lg cursor-pointer hover:bg-white/10 hover:border-white/40 transition-all duration-300 transform hover:-translate-y-1">
                                            <h3 className="font-permanent-marker text-2xl text-yellow-400">Quick Trip</h3>
                                            <p className="text-neutral-400 mt-2">Select up to 6 pre-defined eras and generate them all at once. Fun, fast, and full of surprises!</p>
                                        </div>
                                        <div onClick={() => { setGenerationMode('cultural'); setAppState('cultural-builder'); }} className="p-6 bg-white/5 border border-white/20 rounded-lg cursor-pointer hover:bg-white/10 hover:border-white/40 transition-all duration-300 transform hover:-translate-y-1">
                                            <h3 className="font-permanent-marker text-2xl text-yellow-400">Cultural Look</h3>
                                            <p className="text-neutral-400 mt-2">Explore traditional attire from around the world. Select a country and region to generate a unique cultural portrait.</p>
                                        </div>
                                         <div onClick={() => { setGenerationMode('imagination'); setAppState('imagination-builder'); }} className="p-6 bg-white/5 border border-white/20 rounded-lg cursor-pointer hover:bg-white/10 hover:border-white/40 transition-all duration-300 transform hover:-translate-y-1">
                                            <h3 className="font-permanent-marker text-2xl text-yellow-400">Imagination</h3>
                                            <p className="text-neutral-400 mt-2">Bring your own vision to life. Describe the scene, attire, and style to generate a completely custom image.</p>
                                        </div>
                                        <div onClick={() => { setGenerationMode('filter'); setAppState('filter-builder'); }} className="p-6 bg-white/5 border border-white/20 rounded-lg cursor-pointer hover:bg-white/10 hover:border-white/40 transition-all duration-300 transform hover:-translate-y-1">
                                            <h3 className="font-permanent-marker text-2xl text-yellow-400">Filter</h3>
                                            <p className="text-neutral-400 mt-2">Apply famous photographic and artistic filters to your image with a single click.</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            {appState === 'era-selection' && (
                                <motion.div key="era-selection" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="w-full">
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h2 className="font-permanent-marker text-2xl text-neutral-200 tracking-wide"> Explore & Choose Eras ({eras.length}/6) </h2>
                                        <button onClick={selectRandomEras} className="text-neutral-400 hover:text-white transition-colors duration-200 flex items-center gap-2 text-lg hover:scale-105 transform">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.899 2.186l-1.42.71a5.002 5.002 0 00-8.479-1.554H10a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm12 14a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.899-2.186l1.42-.71a5.002 5.002 0 008.479 1.554H10a1 1 0 110-2h6a1 1 0 011 1v6a1 1 0 01-1 1z" clipRule="evenodd" /></svg>
                                            Shuffle Selection
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-6 mb-6 p-4 bg-black/20 rounded-lg max-h-80 overflow-y-auto">
                                        {ERA_CATEGORIES.map((category) => (
                                            <div key={category.name}>
                                                <h3 className="text-lg font-permanent-marker text-neutral-400 mb-3 text-left px-2">{category.name}</h3>
                                                <div className="flex flex-wrap justify-start gap-3">
                                                    {category.eras.map((era) => {
                                                        const isSelected = eras.includes(era);
                                                        const isDisabled = !isSelected && eras.length >= 6;
                                                        return (
                                                            <motion.button key={era} onClick={() => toggleEraSelection(era)} disabled={isDisabled} className={cn("py-2 px-4 rounded-full text-sm font-semibold border shadow-md transition-colors duration-200", {"bg-yellow-400 text-black border-yellow-500 hover:bg-yellow-300": isSelected, "bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700": !isSelected && !isDisabled, "bg-neutral-800 text-neutral-600 border-neutral-700 cursor-not-allowed opacity-50": isDisabled })} whileTap={{ scale: 0.95 }}>
                                                                {era}
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 justify-center">
                                        <button onClick={handleReset} className={secondaryButtonClasses}> Different Photo </button>
                                        <button onClick={handleGenerateQuickTripClick} className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:rotate-0 disabled:bg-yellow-400`} disabled={eras.length === 0 || isLoading}>
                                            {`Generate ${eras.length > 0 ? eras.length : ''} Image${eras.length !== 1 ? 's' : ''}`}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                             {appState === 'cultural-builder' && (
                                <motion.div key="cultural-builder" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="w-full flex flex-col gap-6">
                                    <h2 className="font-permanent-marker text-2xl text-neutral-200 tracking-wide text-center">Create a Cultural Look</h2>
                                    <div className="p-4 bg-black/20 rounded-lg space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="country-select" className={labelClasses}>Country</label>
                                                <select id="country-select" value={culturalSelections.country || ''} onChange={handleCountrySelect} className={selectClasses}>
                                                    <option value="">-- Choose a Country --</option>
                                                    {Object.keys(CULTURAL_LOOKS_DATA).sort().map(country => <option key={country} value={country}>{country}</option>)}
                                                </select>
                                            </div>
                                             <div>
                                                <label htmlFor="region-select" className={labelClasses}>Region / Attire</label>
                                                <select id="region-select" value={culturalSelections.region || ''} onChange={handleRegionSelect} disabled={!culturalSelections.country} className={selectClasses}>
                                                    <option value="">-- Choose a Region/Attire --</option>
                                                    {culturalSelections.country && CULTURAL_LOOKS_DATA[culturalSelections.country]?.sort().map(region => (
                                                        <option key={region} value={region}>{region}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-black/30 rounded-lg border border-neutral-700">
                                        <h3 className="font-permanent-marker text-lg text-neutral-400 mb-2">Prompt Preview</h3>
                                        <p className="text-neutral-300 text-sm h-24 overflow-y-auto">{buildCulturalPrompt()}</p>
                                    </div>
                                     <div className="flex items-center gap-4 mt-2 justify-center">
                                        <button onClick={handleReset} className={secondaryButtonClasses}> Different Photo </button>
                                        <button onClick={handleGenerateCulturalLookClick} className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:rotate-0 disabled:bg-yellow-400`} disabled={!culturalSelections.region || isLoading}>
                                            Generate Image
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                             {appState === 'imagination-builder' && (
                                <motion.div key="imagination-builder" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="w-full flex flex-col gap-6">
                                    <h2 className="font-permanent-marker text-2xl text-neutral-200 tracking-wide text-center">Describe Your Vision</h2>
                                    <div className="p-4 bg-black/20 rounded-lg">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label htmlFor="scenery-input" className={labelClasses}>Scenery<span className="text-red-500">*</span></label>
                                                    <button type="button" onClick={() => handleSurpriseMe('scenery')} disabled={!!surpriseMeLoading} className="text-sm text-yellow-400 hover:text-yellow-300 font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait">
                                                        {surpriseMeLoading === 'scenery' ? 'Generating...' : 'Surprise Me ✨'}
                                                    </button>
                                                </div>
                                                <textarea id="scenery-input" name="scenery" value={imaginationInputs.scenery} onChange={handleImaginationInputChange} className={textAreaClasses} placeholder="e.g., An enchanted forest at dusk with glowing mushrooms..."></textarea>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label htmlFor="attire-input" className={labelClasses}>Attire <span className="text-red-500">*</span></label>
                                                    <button type="button" onClick={() => handleSurpriseMe('attire')} disabled={!!surpriseMeLoading} className="text-sm text-yellow-400 hover:text-yellow-300 font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait">
                                                        {surpriseMeLoading === 'attire' ? 'Generating...' : 'Surprise Me ✨'}
                                                    </button>
                                                </div>
                                                <textarea id="attire-input" name="attire" value={imaginationInputs.attire} onChange={handleImaginationInputChange} className={textAreaClasses} placeholder="e.g., A flowing, ethereal gown made of starlight..."></textarea>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label htmlFor="pose-input" className={labelClasses}>Pose</label>
                                                    <button type="button" onClick={() => handleSurpriseMe('pose')} disabled={!!surpriseMeLoading} className="text-sm text-yellow-400 hover:text-yellow-300 font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait">
                                                        {surpriseMeLoading === 'pose' ? 'Generating...' : 'Surprise Me ✨'}
                                                    </button>
                                                </div>
                                                <textarea id="pose-input" name="pose" value={imaginationInputs.pose} onChange={handleImaginationInputChange} className={textAreaClasses} placeholder="e.g., Looking confidently at the camera..."></textarea>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label htmlFor="hairStyle-input" className={labelClasses}>Hair Style</label>
                                                    <button type="button" onClick={() => handleSurpriseMe('hairStyle')} disabled={!!surpriseMeLoading} className="text-sm text-yellow-400 hover:text-yellow-300 font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait">
                                                        {surpriseMeLoading === 'hairStyle' ? 'Generating...' : 'Surprise Me ✨'}
                                                    </button>
                                                </div>
                                                <textarea id="hairStyle-input" name="hairStyle" value={imaginationInputs.hairStyle} onChange={handleImaginationInputChange} className={textAreaClasses} placeholder="e.g., Long, flowing silver hair..."></textarea>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <label htmlFor="eyeStyle-input" className={labelClasses}>Eye Style</label>
                                                    <button type="button" onClick={() => handleSurpriseMe('eyeStyle')} disabled={!!surpriseMeLoading} className="text-sm text-yellow-400 hover:text-yellow-300 font-semibold transition-colors disabled:opacity-50 disabled:cursor-wait">
                                                        {surpriseMeLoading === 'eyeStyle' ? 'Generating...' : 'Surprise Me ✨'}
                                                    </button>
                                                </div>
                                                <textarea id="eyeStyle-input" name="eyeStyle" value={imaginationInputs.eyeStyle} onChange={handleImaginationInputChange} className={textAreaClasses} placeholder="e.g., Glowing with a soft, blue light..."></textarea>
                                            </div>
                                            <div>
                                                <label htmlFor="figureSize-select" className={labelClasses}>Figure Size</label>
                                                 <select id="figureSize-select" name="figureSize" value={imaginationInputs.figureSize} onChange={handleImaginationInputChange} className={selectClasses}>
                                                    {FIGURE_SIZE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="aspectRatio-select" className={labelClasses}>Aspect Ratio</label>
                                                 <select id="aspectRatio-select" name="aspectRatio" value={imaginationInputs.aspectRatio} onChange={handleImaginationInputChange} className={selectClasses}>
                                                    {ASPECT_RATIO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="imageFraming-select" className={labelClasses}>Image Framing</label>
                                                 <select id="imageFraming-select" name="imageFraming" value={imaginationInputs.imageFraming} onChange={handleImaginationInputChange} className={selectClasses}>
                                                    {IMAGE_FRAMING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-3">
                                                <label htmlFor="style-input" className={labelClasses}>Artistic Style</label>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {PREDEFINED_STYLES.map(style => {
                                                        const isSelected = imaginationInputs.style.split(',').map(s => s.trim()).includes(style);
                                                        return (
                                                            <button 
                                                                key={style} 
                                                                onClick={() => handleStyleButtonClick(style)}
                                                                className={cn(
                                                                    "py-1 px-3 rounded-full text-xs font-semibold border shadow-sm transition-colors duration-200",
                                                                    {
                                                                        "bg-yellow-400 text-black border-yellow-500 hover:bg-yellow-300": isSelected,
                                                                        "bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700": !isSelected
                                                                    }
                                                                )}
                                                            >
                                                                {style}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <textarea id="style-input" name="style" value={imaginationInputs.style} onChange={handleImaginationInputChange} className={textAreaClasses} placeholder="Select from above or type your own style... e.g., 8k, highly detailed..."></textarea>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "p-4 bg-black/30 rounded-lg border border-neutral-700 relative overflow-hidden transition-all duration-300",
                                        isRefiningPrompt && "border-yellow-400/50"
                                    )}>
                                        <AnimatePresence>
                                            {isRefiningPrompt && (
                                                <motion.div
                                                    key="shimmer"
                                                    initial={{ x: "-100%" }}
                                                    animate={{ x: "100%" }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                                    style={{
                                                        background: 'linear-gradient(to right, transparent 0%, rgba(250, 204, 21, 0.1) 50%, transparent 100%)',
                                                    }}
                                                />
                                            )}
                                        </AnimatePresence>
                                        <h3 className="font-permanent-marker text-lg text-neutral-400 mb-2">Prompt Preview (AI Enhanced)</h3>
                                        <p className="text-neutral-400 text-xs italic mb-2">Note: Your inputs are automatically refined by AI to create a more detailed prompt for better results.</p>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 justify-center">
                                        <button onClick={handleReset} className={secondaryButtonClasses}> Different Photo </button>
                                        <button 
                                            onClick={handleGenerateImaginationClick} 
                                            className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:rotate-0 disabled:bg-yellow-400`} 
                                            disabled={!imaginationInputs.scenery.trim() || !imaginationInputs.attire.trim() || isLoading || isRefiningPrompt}
                                        >
                                            {isRefiningPrompt ? 'Refining Prompt...' : 'Generate Image'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                             {appState === 'filter-builder' && (
                                <motion.div key="filter-builder" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="w-full flex flex-col gap-6">
                                    <h2 className="font-permanent-marker text-2xl text-neutral-200 tracking-wide text-center">Apply a Filter</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-black/20 rounded-lg max-h-80 overflow-y-auto">
                                        {FILTERS_DATA.map(filter => {
                                            const isSelected = selectedFilter === filter.name;
                                            return (
                                                <div 
                                                    key={filter.name} 
                                                    onClick={() => setSelectedFilter(filter.name)}
                                                    className={cn(
                                                        "p-4 border rounded-lg cursor-pointer transition-all duration-200 transform hover:scale-105",
                                                        isSelected ? "bg-yellow-400 border-yellow-300 text-black" : "bg-neutral-800 border-neutral-700 hover:border-neutral-500"
                                                    )}
                                                >
                                                    <h4 className={cn("font-bold text-lg", isSelected ? "text-black" : "text-neutral-200")}>{filter.name}</h4>
                                                    <p className={cn("text-sm mt-1", isSelected ? "text-neutral-800" : "text-neutral-400")}>{filter.description}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 justify-center">
                                        <button onClick={handleReset} className={secondaryButtonClasses}> Different Photo </button>
                                        <button onClick={handleGenerateFilterClick} className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:rotate-0 disabled:bg-yellow-400`} disabled={!selectedFilter || isLoading}>
                                            Generate Image
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}


                {(appState === 'generating' || appState === 'results-shown') && (
                     <>
                        <div className="w-full max-w-7xl flex-1 overflow-y-auto mt-4 p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12 justify-items-center">
                                {resultEras.map((era) => (
                                    <PolaroidCard
                                        key={era}
                                        caption={era}
                                        status={generatedImages[era]?.status || 'pending'}
                                        imageUrl={generatedImages[era]?.url}
                                        error={generatedImages[era]?.error}
                                        onShake={handleRegenerateEra}
                                        onDownload={handleDownloadIndividualImage}
                                        isDraggable={!isMobile && resultEras.length > 4} // Only allow drag for quick trip on desktop
                                    />
                                ))}
                            </div>
                        </div>

                         <div className="h-20 mt-4 flex items-center justify-center">
                            {appState === 'results-shown' && (
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    {generationMode === 'quick' && (
                                         <button onClick={handleDownloadAlbum} disabled={isDownloading} className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                            {isDownloading ? 'Creating Album...' : 'Download Album'}
                                        </button>
                                    )}
                                    <button onClick={handleReset} className={secondaryButtonClasses}>
                                        Start Over
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            <Footer />
        </main>
    );
}

export default App;