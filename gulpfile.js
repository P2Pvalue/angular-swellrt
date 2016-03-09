'use strict';

var config = {

  server: {
    port: 5580,
    host: 'angular-swellrt'
  },
};

/*-----  End of Configuration  ------*/

var gulp = require('gulp');
var karma = require('karma').server;
var connect = require('gulp-connect');
var babel = require('gulp-babel');
var release = require('gulp-release-tasks')(gulp);


// default task is to run test
gulp.task('default', function(done) {
  connect.server({
    port: config.server.port,
    host: config.server.host
  });
  karma.start({
    configFile: __dirname + '/karma.conf.js',
        singleRun: true
   }, done);
  connect.serverClose();
});

gulp.task('test', function(done) {
  connect.server({
    port: config.server.port,
    host: config.server.host
  });
  gulp.src('config.js');
   karma.start({
     configFile: __dirname + '/karma.conf.js'
   }, done);
  connect.serverClose();
});

gulp.task('live:dist', function(){
  gulp.start('dist');
  gulp.watch(__dirname + '/angular-swellrt.js',
  function(){
    gulp.start('dist');
  });
});

gulp.task('dist', function(){
  gulp.src(__dirname + '/angular-swellrt.js')
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest(__dirname + '/dist'));
});
