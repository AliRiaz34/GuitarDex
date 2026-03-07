const YT_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

let playerReady = false;
let onAPIReady = null;

// Load the YouTube IFrame API script once
export function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      // Script loading, wait for callback
      onAPIReady = resolve;
      return;
    }
    onAPIReady = resolve;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      playerReady = true;
      if (onAPIReady) onAPIReady();
    };
  });
}

export async function searchYouTube(title, artist) {
  if (!YT_API_KEY) return null;

  const q = encodeURIComponent(`${title} ${artist} audio`);
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&videoCategoryId=10&maxResults=1&key=${YT_API_KEY}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.items?.[0]?.id?.videoId || null;
  } catch {
    return null;
  }
}
