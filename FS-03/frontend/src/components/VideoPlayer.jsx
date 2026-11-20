import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

const HOST = import.meta.env.VITE_SOCKET_URL;

export default function VideoPlayer({ src }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    const url = HOST + src;
    let hls;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    }
    return () => hls?.destroy();
  }, [src]);

  return <video ref={ref} controls className="w-full rounded-xl bg-black aspect-video" />;
}