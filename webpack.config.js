const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env="production") => {
    const production = env === "production";

    return {
        entry: './client/index.ts',
        mode: 'development',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: [
                        'babel-loader',
                        'ts-loader',
                    ],
                    exclude: /node_modules/
                },
                {
                    test: /\.s?[ac]ss$/i,
                    use: [
                        // Creates `style` nodes from JS strings
                        'style-loader',
                        // Translates CSS into CommonJS
                        {
                            loader: 'css-loader',
                            options: {
                                modules: false,
                            },
                        },
                        // compatibility and stuff
                        {
                            loader: 'postcss-loader', // Run post css actions
                            options: {
                                plugins: function () { // post css plugins, can be exported to postcss.config.js
                                    return [
                                        require('precss'),
                                        require('autoprefixer')
                                    ];
                                }
                            }
                        },
                        // Compiles Sass to CSS
                        'sass-loader',
                    ],
                },
            ],
        },
        devtool: production ? "source-map" : 'inline-source-map',
        optimization: {
            minimize: production,
            minimizer: [new TerserPlugin()],
        },
        resolve: {
            extensions: [ '.tsx', '.ts', '.js', '.scss', '.css' ]
        },
        output: {
            filename: 'uwp.js',
            path: path.resolve(__dirname, `build/${env}`),
            publicPath: 'js',
            libraryTarget: 'umd',
            library: 'uwp',
        },
        devServer: {
            hot: false,
            inline: false,
            contentBase: 'static/',
            historyApiFallback: true,
            port: 9000,
        },
    }
}
