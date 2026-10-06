// Web version of HtmlView: the thread page is rendered in an iframe.
import { useEffect, useRef } from 'react';

// inject: {postIndex: html} added under posts after the page has loaded.
export default function HtmlView({ html, background, onMessage, inject }) {
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

  const send = () => {
    if (inject && Object.keys(inject).length) frame.current?.contentWindow?.postMessage({ alamenInject: inject }, '*');
  };
  useEffect(send, [inject]);

  return (
    <iframe
      ref={frame}
      onLoad={send}
      srcDoc={html}
      title="thread"
      allow="autoplay; fullscreen; encrypted-media"
      allowFullScreen
      style={{ flex: 1, width: '100%', height: '100%', border: 0, background }}
    />
  );
}
