export default {
  entry: './dist/src/server.js',
  output: {
    filename: 'app.min.js',
    path: __dirname + '/dist',
  },
  target: "node",
  module: {
    rules: [
      {
        test: /^node\:/,
        loader: "node-loader",
      },
    ],
  },
};
