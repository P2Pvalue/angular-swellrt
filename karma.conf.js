module.exports = function(config) {
    config.set({
        basePath: './',

        files: [
            'node_modules/angular/angular.js',
            'node_modules/angular-mocks/angular-mocks.js',
            'angular-swellrt.js',
            'test/spec/angular-swellrt/**/*[sS]pec.js'
        ],

        exclude: [
        ],

        autoWatch: true,

        frameworks: ['jasmine'],

        browsers: ['PhantomJS'],

        plugins: [
            'karma-jasmine',
            'karma-junit-reporter',
//            'karma-chrome-launcher',
//            'karma-firefox-launcher',
            'karma-phantomjs-launcher'
        ],

        junitReporter: {
            outputFile: 'unit.xml',
            suite: 'unit'
        }

    })
}
