'use strict';

module.exports = function (config) {
  config.set({

    files: [
      'node_modules/angular/angular.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'node_modules/linkheader-parser/dist/linkheader-parser-browser.js',
      'node_modules/mediatype-parser/dist/mediatype-parser-browser.js',
      'node_modules/uri-templates/uri-templates.js',
      'src/*.js'
    ],

    autoWatch: true,

    frameworks: ['jasmine'],

    browsers: ['PhantomJS2'],

    preprocessors: {
      'src/**/!(*.spec)+(.js)': ['coverage']
    },

    reporters: ['progress', 'coverage'],

    coverageReporter: {
      dir: 'build/coverage',
      reporters: [
        {type: 'text-summary'},
        {type: 'html', subdir: '.'},
        {type: 'lcovonly', subdir: '.'}
      ]
    }
  });
};
