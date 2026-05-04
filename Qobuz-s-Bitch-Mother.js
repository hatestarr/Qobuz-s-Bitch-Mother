// ==Windmill==
// @name         Qobuz-s-Bitch-Mother
// @author       bacardii
// @description  Strict 24-bit Hi-Res only Qobuz (No 16-bit allowed) - The Bitch Mother of Qobuz
// @version      1.5
// @target       8SPINE
// ==/Windmill==

const API_BASE = "https://api.qobuz.com";

// Multiple public App IDs with fallback
const APP_IDS = [
    "938743293",    // Main one
    "502849582",
    "100000000",
    "785465821",
    "443066616"
];

async function makeRequest(endpoint, params = {}, retry = 0) {
    const appId = APP_IDS[retry % APP_IDS.length];
    
    const url = new URL(`${API_BASE}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(url.toString(), {
            signal: controller.signal,
            headers: {
                "User-Agent": "8SPINE-Qobuz-Bitch-Mother/1.5",
                "X-App-Id": appId
            }
        });

        clearTimeout(timeout);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        console.log(`[Qobuz Bitch Mother] ${endpoint} → Success (AppID: ${appId})`);
        return data;
    } catch (e) {
        console.error(`[Qobuz Bitch Mother] Failed ${endpoint} with AppID ${appId}:`, e.message);
        
        if (retry < APP_IDS.length - 1) {
            return makeRequest(endpoint, params, retry + 1);
        }
        return null;
    }
}

function isTrueHiRes(track) {
    if (!track?.bit_depth) return false;
    const bitDepth = parseInt(track.bit_depth);
    const sampleRate = parseInt(track.sampling_rate || 0);
    return bitDepth >= 24 && sampleRate >= 96000;   // Strict Hi-Res only
}

const QobuzBitchMother = {
    id: "qobuz-bitch-mother",
    name: "Qobuz-s-Bitch-Mother",
    version: "1.5",

    async search(query, type = "track", limit = 40) {
        const data = await makeRequest("/search", {
            query: query,
            type: type,
            limit: limit
        });

        if (!data?.tracks?.items) return [];

        return data.tracks.items
            .filter(isTrueHiRes)
            .map(track => ({
                id: track.id.toString(),
                title: track.title,
                artist: track.artist?.name || "Unknown",
                album: track.album?.title || "",
                duration: track.duration,
                bitDepth: track.bit_depth,
                sampleRate: track.sampling_rate,
                artwork: track.album?.image?.large || null
            }));
    },

    async getAlbum(albumId) {
        const data = await makeRequest(`/album/${albumId}`);
        if (!data) return null;

        const tracks = (data.tracks?.items || [])
            .filter(isTrueHiRes)
            .map(track => ({
                id: track.id.toString(),
                title: track.title,
                artist: track.artist?.name || data.artist?.name,
                duration: track.duration,
                bitDepth: track.bit_depth,
                sampleRate: track.sampling_rate
            }));

        return {
            id: data.id,
            title: data.title,
            artist: data.artist?.name,
            artwork: data.image?.large,
            year: data.release_date?.split('-')[0],
            tracks: tracks
        };
    },

    async getStreamUrl(trackId) {
        const data = await makeRequest(`/track/${trackId}/getFileUrl`, {
            format_id: "27"   // Hi-Res
        });
        return data?.url || null;
    }
};

QobuzBitchMother;