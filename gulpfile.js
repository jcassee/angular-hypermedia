'use strict';

var gulp = require('gulp'),
  batch  = require('gulp-batch'),
  concat = require('gulp-concat'),
  ignore = require('gulp-ignore'),
  gulpIf = require('gulp-if'),
  jshint = require('gulp-jshint'),
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

gulp.task('jshint', function () {
  return gulp.src(['src/*.js'])
    .pipe(jshint('./.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});
