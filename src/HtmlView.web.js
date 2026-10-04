// Web version of HtmlView: the thread page is rendered in an iframe.
import { useEffect, useRef } from 'react';

export default function HtmlView({ html, background, onMessage }) {
  const frame = useRef(null);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    const listen = (e) => {
      if (e.source !== frame.current?.contentWindow || typeof e.data?.alamen !== 'string') return;
      handler.current(JSON.parse(e.data.alamen));
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);

  return (
    <iframe
      ref={frame}
      srcDoc={html}
      title="thread"
      allow="autoplay; fullscreen; encrypted-media"
      allowFullScreen
      style={{ flex: 1, width: '100%', height: '100%', border: 0, background }}
    />
  );
}
