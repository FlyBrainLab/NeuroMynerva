module.exports = {
    entry: './lib/index.js',
    mode: 'development',
    output: {
      path: require('path').join(__dirname, 'build'),
      filename: 'bundle.js',
      libraryTarget: 'amd'
    },
    module:{
      rules: [{
        // in css files, svg is loaded as a url formatted string
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: { test: /\.css$/ },
        use: {
          loader: 'svg-url-loader',
          options: { encoding: 'none', limit: 10000 }
        }
      },
      {
        // in js, jsx, ts, and tsx files svg is loaded as a raw string
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: { test: /\.(js|jsx|ts|tsx)$/ },
        use: {
          loader: 'raw-loader'
        }
      }
    ]
    },
    bail: true
};