const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    entry: './src/panel/index.tsx',
    output: {
        path: path.resolve(__dirname, 'out', 'webview'),
        filename: 'bundle.js',
        clean: true
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            'react': path.resolve(__dirname, 'node_modules/react'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
        }
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: 'node_modules/highlight.js/lib/languages/*.js',
                    to: 'highlightjs/languages/[name][ext]',
                    globOptions: {
                        ignore: ['**/test*']
                    }
                },
                {
                    from: 'node_modules/highlight.js/lib/core.js',
                    to: 'highlightjs/core.js'
                },
                {
                    from: 'node_modules/highlight.js/lib/highlight.js',
                    to: 'highlightjs/highlight.js'
                }
            ]
        })
    ],
    devtool: 'source-map',
    externals: {
        vscode: 'commonjs vscode'
    }
};
