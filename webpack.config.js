const path = require('path');

module.exports = (env, argv) => ({
  mode: argv.mode || 'production',

  // Entry point for your browser script
  entry: path.resolve(__dirname, 'src/client/index.js'),

  // Output into dist/client/index.js
  output: {
    path: path.resolve(__dirname, 'dist/client'),
    filename: 'index.js',
    // so that PeerTube can require() it as a CommonJS module
    libraryTarget: 'commonjs2',
  },

  module: {
    rules: [
      {
        test: /\.m?js$/,
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            // transpile to support older browsers PeerTube may run on
            presets: [
              ['@babel/preset-env', {
                targets: '> 0.25%, not dead',
                useBuiltIns: false
              }]
            ]
          }
        }
      }
    ]
  },

  resolve: {
    extensions: ['.js']
  },

  // generate source-maps in dev mode
  devtool: argv.mode === 'development' ? 'source-map' : false,
});