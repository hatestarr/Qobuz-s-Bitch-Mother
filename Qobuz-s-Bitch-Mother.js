// ==Windmill==
// @name         Qobuz-s-Bitch-Mother
// @author       bacardii
// @description  Strict 24-bit Hi-Res only Qobuz (no 16-bit allowed) - The Bitch Mother of Qobuz
// @version      1.2
// @target       8SPINE
// ==/Windmill==

const API_BASE = "https://api.qobuz.com";
const APP_ID = "your_app_id_here"; // You may need a real one, many modules use public ones

async function makeRequest(endpoint, params = {}) {
    const url = new URL(`${API_BASE}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    try {
        const response = await fetch(url.toString(), {
            headers: {
                "User-Agent": "8SPINE-Qobuz-Bitch",
                "X-App-Id": APP_ID
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error("[Qobuz Bitch] Request failed:", e);
        return null;
    }
}

function isTrueHiRes(track) {
    if (!track || !track.bit_depth) return false;
    return parseInt(track.bit_depth) >= 24;
}

const QobuzBitch = {
    id: "qobuz-bitch-mother",
    name: "Qobuz-s-Bitch-Mother",
    version: "1.2",

    async search(query, type = "track", limit = 30) {
        const data = await makeRequest("/search", {
            query: query,
            type: type,
            limit: limit
        });

        if (!data || !data.tracks || !data.tracks.items) return [];

        return data.tracks.items
            .filter(track => isTrueHiRes(track))
            .map(track => ({
                id: track.id,
                title: track.title,
                artist: track.artist?.name || "Unknown",
                album: track.album?.title || "",
                duration: track.duration,
                bitDepth: track.bit_depth,
                sampleRate: track.sampling_rate,
                url: track.url || null,
                artwork: track.album?.image?.large || track.image?.large
            }));
    },

    async getAlbum(albumId) {
        const data = await makeRequest(`/album/${albumId}`);
        if (!data) return null;

        const tracks = (data.tracks?.items || [])
            .filter(track => isTrueHiRes(track))
            .map(track => ({
                id: track.id,
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
            tracks: tracks
        };
    },

    async getStreamUrl(trackId) {
        const data = await makeRequest(`/track/${trackId}/getFileUrl`, {
            format_id: "27" // Hi-Res formats
        });

        if (data && data.url) {
            return data.url;
        }
        return null;
    },

    // Required methods for 8SPINE
    async getTrack(trackId) {
        // Implement if needed
        return null;
    }
};

// Export the module
QobuzBitch;