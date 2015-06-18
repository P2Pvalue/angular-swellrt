module.exports = function(config) {

  config.set({
    basePath: './',

    files: [
      'config.js',
      'node_modules/angular/angular.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'angular-swellrt.js',
      'test/spec/angular-swellrt/**/*[sS]pec.js',
      {
        pattern: 'http://swellrt:9898/swellrt/swellrt.nocache.js',
        watched: true,
        served: true,
        included: true,
      }
    ],

    exclude: [
    ],

    autoWatch: true,

    frameworks: ['jasmine'],

    browsers: [// 'PhantomJS',
               'Chrome'
              ],

    plugins: [
      'karma-jasmine',
      'karma-junit-reporter',
      'karma-chrome-launcher'
      // 'karma-phantomjs-launcher'
    ],

    junitReporter: {
      outputFile: 'unit.xml',
      suite: 'unit'
    },

    browserDisconnectTimeout : 10000, // default 2000
    browserDisconnectTolerance : 1, // default 0
    browserNoActivityTimeout : 60000, //default 10000
  })
}
