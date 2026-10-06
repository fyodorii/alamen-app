// Shows a thread's HTML page. onMessage receives the page's {type, ...} messages.
import { useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { BASE_URL } from './api';
import { Loading } from './ui';

// inject: {postIndex: html} added under posts after the page has loaded.
export default function HtmlView({ html, background, onMessage, inject }) {
  const view = useRef(null);
  const send = () => {
    if (inject && Object.keys(inject).length) view.current?.injectJavaScript(`window.__alamenInject(${JSON.stringify(inject)});true;`);
  };
  useEffect(send, [inject]);
  return (
    <WebView
      ref={view}
      onLoadEnd={send}
      originWhitelist={['*']}
      source={{ html, baseUrl: BASE_URL }}
      style={{ backgroundColor: background }}
      onMessage={(e) => onMessage(JSON.parse(e.nativeEvent.data))}
      // Links are reported by the page script; only the document itself and
      // embedded players (SoundCloud, YouTube) may load inside the WebView.
      onShouldStartLoadWithRequest={(req) => {
        if (req.url === BASE_URL || req.url.startsWith('about:') || req.isTopFrame === false) return true;
        onMessage({ type: 'link', url: req.url });
        return false;
      }}
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction
      startInLoadingState
      renderLoading={() => <Loading />}
    />
  );
}
