let AppRegistry = require('react-native').AppRegistry;

try {
  require('react-native-gesture-handler');
} catch (e) {
  console.warn('[init] gesture-handler failed:', e && e.message);
}

try {
  let App = require('./App').default;
  AppRegistry.registerComponent('main', function () { return App; });
} catch (e) {
  let React = require('react');
  let RN = require('react-native');
  let Fallback = function () {
    return React.createElement(RN.View, { style: { flex: 1, backgroundColor: '#111', padding: 20, justifyContent: 'center' } },
      React.createElement(RN.Text, { style: { color: 'red', fontSize: 18, fontWeight: 'bold', marginBottom: 12 } }, 'FATAL ERROR:'),
      React.createElement(RN.ScrollView, null,
        React.createElement(RN.Text, { style: { color: '#eee', fontFamily: 'monospace', fontSize: 12 } },
          (e && (e.stack || e.message)) || String(e)
        )
      )
    );
  };
  AppRegistry.registerComponent('main', function () { return Fallback; });
}
