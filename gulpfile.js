'use strict';

var fs    = require('fs'),
  gulp    = require('gulp'),
  batch   = require('gulp-batch'),
  concat  = require('gulp-concat'),
  ignore  = require('gulp-ignore'),
  jshint  = require('gulp-jshint'),
  jscs    = require('gulp-jscs'),
  replace = require('gulp-replace'),
  watch   = require('gulp-watch'),
  path    = require('path');

var dist = 'dist/hypermedia.js';

gulp.task('default', function () {
  var distDir = path.dirname(dist);
  var pkg = JSON.parse(fs.readFileSync('package.json'));

  return gulp.src('src/*.js')
    // jshint
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'))
    // jscs
    .pipe(jscs())
    .pipe(jscs.reporter())
    .pipe(jscs.reporter('fail'))
    // build
    .pipe(ignore.exclude('*.spec.js'))
    .pipe(concat(path.basename(dist)))
    .pipe(replace(/@version \S+/, '@version ' + pkg.version))
    .pipe(gulp.dest(distDir));
});

gulp.task('watch', function () {
  gulp.start('default');
  watch('src/**', batch(function (events, done) {
    gulp.start('default', done);
  }));
});
