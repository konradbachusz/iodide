const webpack = require('webpack')
const path = require('path')
const CreateFileWebpack = require('create-file-webpack')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const _ = require('lodash')

const editorHtmlTemplate = require('./src/html-template.js')
const evalFrameHtmlTemplate = require('./src/eval-frame/html-template.js')

const editorHtmlTemplateCompiler = _.template(editorHtmlTemplate)
const evalFrameHtmlTemplateCompiler = _.template(evalFrameHtmlTemplate)

let DEV_SERVER_PORT
let BUILD_DIR
let APP_PATH_STRING
let EVAL_FRAME_PATH_STRING
let CSS_PATH_STRING
let APP_VERSION_STRING
let EVAL_FRAME_ORIGIN
let EDITOR_ORIGIN


const APP_DIR = path.resolve(__dirname, 'src/')
const EXAMPLE_DIR = path.resolve(__dirname, 'examples/')

const plugins = []

// const config
module.exports = (env) => {
  if (env === 'production') {
    BUILD_DIR = path.resolve(__dirname, 'prod/')
    const gitRev = require('git-rev-sync')
    if (gitRev.isTagDirty()) {
      if (process.env.TRAVIS_BRANCH !== undefined) {
        // On Travis-CI, the git branches are detached so use env variable instead
        APP_VERSION_STRING = process.env.TRAVIS_BRANCH
      } else {
        APP_VERSION_STRING = gitRev.branch()
      }
      APP_PATH_STRING = 'https://iodide.io/master/'
    } else {
      APP_VERSION_STRING = gitRev.tag()
      APP_PATH_STRING = 'https://iodide.io/dist/'
    }
    CSS_PATH_STRING = APP_PATH_STRING
    plugins.push(new UglifyJSPlugin())
  } else if (env === 'server') {
    BUILD_DIR = path.resolve(__dirname, 'prod/')
    DEV_SERVER_PORT = 8000
    APP_VERSION_STRING = 'iodide-server'
    // APP_PATH_STRING = ''
    // CSS_PATH_STRING = APP_PATH_STRING
    EDITOR_ORIGIN = `http://localhost:${DEV_SERVER_PORT}`
    EVAL_FRAME_ORIGIN = `http://localhost:${DEV_SERVER_PORT}`
    APP_PATH_STRING = ''
    EVAL_FRAME_PATH_STRING = ''
    CSS_PATH_STRING = ''
    plugins.push(new UglifyJSPlugin())
  } else if (env === 'dev') {
    BUILD_DIR = path.resolve(__dirname, 'dev/')
    DEV_SERVER_PORT = 8888
    EDITOR_ORIGIN = `http://localhost:${DEV_SERVER_PORT}`
    EVAL_FRAME_ORIGIN = `http://localhost:${DEV_SERVER_PORT}`
    APP_VERSION_STRING = 'dev'
    APP_PATH_STRING = `${EDITOR_ORIGIN}/`
    EVAL_FRAME_PATH_STRING = `${EVAL_FRAME_ORIGIN}/`
    CSS_PATH_STRING = `${EDITOR_ORIGIN}/`
  }

  return {
    entry: {
      iodide: `${APP_DIR}/index.jsx`,
      'iodide.eval-frame': `${APP_DIR}/eval-frame/index.jsx`,
    },
    output: {
      path: BUILD_DIR,
      filename: `[name].${APP_VERSION_STRING}.js`,
    },
    devtool: 'source-map',
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    module: {
      rules: [
        {
          enforce: 'pre',
          test: /\.jsx?$/,
          exclude: /node_modules/,
          loader: 'eslint-loader',
          options: {
            // eslint options (if necessary)
            emitWarning: true,
            emitError: true,
            extensions: ['.jsx', '.js'],
          },
        },
        {
          test: /\.jsx?/,
          include: APP_DIR,
          loader: 'babel-loader',
        },
        {
          test: /\.css$/,
          use: ExtractTextPlugin.extract({
            fallback: 'style-loader',
            use: 'css-loader',
            // filename: `iodide.${APP_VERSION_STRING}.css`,
          }),
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
          loader: `file-loader?name=iodide.${APP_VERSION_STRING}.fonts/[name].[ext]`,
        },
        {
          test: /\.jsmd$/,
          include: EXAMPLE_DIR,
          loader: 'raw-loader',
        },
      ],
    },
    watchOptions: { poll: true },
    plugins: [
      ...plugins,
      new CreateFileWebpack({
        path: BUILD_DIR,
        fileName: (env === 'server') ? 'index.html' : `iodide.${APP_VERSION_STRING}.html`,
        content: editorHtmlTemplateCompiler({
          APP_VERSION_STRING,
          APP_PATH_STRING,
          EVAL_FRAME_PATH_STRING,
          CSS_PATH_STRING,
          NOTEBOOK_TITLE: 'new notebook',
          JSMD: '',
        }),
      }),
      new CreateFileWebpack({
        path: BUILD_DIR,
        fileName: `iodide.eval-frame.${APP_VERSION_STRING}.html`,
        content: evalFrameHtmlTemplateCompiler({
          APP_VERSION_STRING: `eval-frame.${APP_VERSION_STRING}`,
          EVAL_FRAME_PATH_STRING,
          CSS_PATH_STRING,
          NOTEBOOK_TITLE: 'new notebook',
          JSMD: '',
        }),
      }),
      new webpack.DefinePlugin({
        IODIDE_VERSION: JSON.stringify(APP_VERSION_STRING),
        IODIDE_EVAL_FRAME_PATH: JSON.stringify(EVAL_FRAME_PATH_STRING),
        IODIDE_EVAL_FRAME_ORIGIN: JSON.stringify(EVAL_FRAME_ORIGIN),
        IODIDE_EDITOR_ORIGIN: JSON.stringify(EDITOR_ORIGIN),
        IODIDE_JS_PATH: JSON.stringify(APP_PATH_STRING),
        IODIDE_CSS_PATH: JSON.stringify(CSS_PATH_STRING),
        IODIDE_BUILD_MODE: JSON.stringify(env),
      }),
      new ExtractTextPlugin(`[name].${APP_VERSION_STRING}.css`),
    ],
    devServer: {
      contentBase: path.join(__dirname, 'dev'),
      // compress: true,
      port: DEV_SERVER_PORT,
      hot: false,
      inline: false,
    },
  }
}

// module.exports = config
