'use strict';

var gulp = require('gulp'),
  batch  = require('gulp-batch'),
  concat = require('gulp-concat'),
  ignore = require('gulp-ignore'),
  watch  = require('gulp-watch'),
  path   = require('path');

var dist = 'dist/hypermedia.js';

gulp.task('default', function(){
  var distDir = path.dirname(dist);
  return gulp.src('src/*.js')
    .pipe(ignore.exclude('*.spec.js'))
    .pipe(concat(path.basename(dist)))
    .pipe(gulp.dest(distDir));
});

gulp.task('watch', function () {
  gulp.start('default');
  watch('src/**', batch(function (events, done) {
    gulp.start('default', done);
  }));
});
