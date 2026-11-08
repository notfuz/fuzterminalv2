const manifestUrl = "./images/gallery/albums/manifest.json";

async function loadAlbums() {
    try {
        const response = await fetch(manifestUrl);
        if (!response.ok) {
            return [];
        }

        const manifest = await response.json();
        return Array.isArray(manifest) ? manifest : [];
    } catch (error) {
        console.error("Failed to load gallery manifest.", error);
        return [];
    }
}

export default loadAlbums;