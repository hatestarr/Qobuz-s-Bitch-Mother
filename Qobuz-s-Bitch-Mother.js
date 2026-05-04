const QOBUZ_BITCH = {
    id: 'qobuz-bacardii-hires',
    name: "Qobuz’s bitch",
    version: '1.4.1',
    author: "bacardii",
    labels: ['HI-RES', '24-BIT', 'QOBUZ', 'STRICT'],

    BASE_URL: "https://www.qobuz.com/api.json/0.2",

    cache: new Map(),
    CACHE_TTL: 300000, // 5 minutes

    async fetchWithTimeout(url, timeout = 15000) {
        const cached = this.cache.get(url);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) return cached.data;

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.cache.set(url, { data, timestamp: Date.now() });
            return data;
        } catch (e) {
            clearTimeout(id);
            console.error(`[Qobuz Bitch] Error ${url}`, e.message);
            throw e;
        }
    },

    isHiRes(track) {
        if (!track) return false;
        const bits = track.bit_depth || track.bits_per_sample || 0;
        const khz = track.sampling_rate || track.sample_rate || 0;
        return bits >= 24 && khz >= 88.2;
    },

    // Updated search using correct endpoint
    searchTracks: async (query, limit = 15) => {
        try {
            const encoded = encodeURIComponent(query);
            const url = `${QOBUZ_BITCH.BASE_URL}/catalog/search?query=${encoded}&type=tracks&limit=${limit}`;

            const data = await QOBUZ_BITCH.fetchWithTimeout(url);

            if (!data.tracks?.items?.length) return { tracks: [], total: 0 };

            const filtered = data.tracks.items
                .filter(item => QOBUZ_BITCH.isHiRes(item))
                .map(item => ({
                    id: item.id.toString(),
                    title: item.title,
                    artist: item.performer?.name || 'Unknown',
                    album: item.album?.title || '',
                    duration: item.duration,
                    albumCover: item.album?.image?.large || '',
                    audioQuality: 'HI_RES'
                }));

            return { tracks: filtered.slice(0, limit), total: filtered.length };
        } catch (e) {
            console.error("[Qobuz Bitch] Search failed:", e.message);
            return { tracks: [], total: 0 };
        }
    },

    getTrackStreamUrl: async (trackId) => {
        try {
            // First get track info
            const info = await QOBUZ_BITCH.fetchWithTimeout(
                `${QOBUZ_BITCH.BASE_URL}/track/get?track_id=${trackId}`
            );

            if (!QOBUZ_BITCH.isHiRes(info.track)) {
                throw new Error("Not strict 24-bit Hi-Res");
            }

            // Get stream URL (may need signature later)
            const streamUrl = `${QOBUZ_BITCH.BASE_URL}/track/getFileUrl?track_id=${trackId}&format_id=27`;

            return {
                streamUrl: streamUrl,
                track: { id: trackId, audioQuality: 'HI_RES_24BIT' }
            };
        } catch (e) {
            console.error(`[Qobuz Bitch] Stream failed for ${trackId}:`, e.message);
            throw e;
        }
    },

    getAlbum: async (albumId) => {
        try {
            const data = await QOBUZ_BITCH.fetchWithTimeout(
                `${QOBUZ_BITCH.BASE_URL}/album/get?album_id=${albumId}`
            );

            const tracks = (data.tracks?.items || [])
                .filter(t => QOBUZ_BITCH.isHiRes(t))
                .map(item => ({
                    id: item.id.toString(),
                    title: item.title,
                    artist: item.performer?.name || data.album?.artist?.name || 'Unknown',
                    album: data.album.title,
                    duration: item.duration,
                    albumCover: data.album.image?.large || '',
                    audioQuality: 'HI_RES'
                }));

            return {
                album: {
                    id: albumId,
                    title: data.album.title,
                    artist: data.album.artist?.name || 'Unknown',
                    cover: data.album.image?.large || '',
                    year: data.album.release_year
                },
                tracks
            };
        } catch (e) {
            console.error("[Qobuz Bitch] Album error:", e.message);
            throw e;
        }
    }
};

QOBUZ_BITCH;