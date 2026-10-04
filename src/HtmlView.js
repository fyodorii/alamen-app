// Shows a thread's HTML page. onMessage receives the page's {type, ...} messages.
import { WebView } from 'react-native-webview';
import { BASE_URL } from './api';
import { Loading } from './ui';

export default function HtmlView({ html, background, onMessage }) {
  return (
    <WebView
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
