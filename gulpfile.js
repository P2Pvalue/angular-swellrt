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
var git = require('gulp-git');
var bump = require('gulp-bump');
var filter = require('gulp-filter');
var tagVersion = require('gulp-tag-version');
var request = require('request-json').createClient('https://api.github.com/');


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

gulp.task('bump', function(done) {
  request.get('repos/P2Pvalue/swellrt/tags', function(err, res, json) {
    if (err || res.statusCode !== 200) {
      done(-1);
    }
    var latest = json[0].name;
    // First 3 swellrt tags were prefixed with wave-*
    if (latest.startsWith('wave')) {
      latest = json[3].name;
    }
    // Tags should bring a `v` prefixed
    if (latest.startsWith('v')) {
      latest = latest.substring(1);
    }
    gulp.src('swellrt.json')
    .pipe(bump({version: latest}))
    .pipe(gulp.dest('./'));
    done();
  });
});

/**
 * Bumping version number and tagging the repository with it.
 * Please read http://semver.org/
 *
 * You can use the commands
 *
 *     gulp patch     # makes v0.1.0 → v0.1.1
 *     gulp feature   # makes v0.1.1 → v0.2.0
 *     gulp release   # makes v0.2.1 → v1.0.0
 *
 * To bump the version numbers accordingly after you did a patch,
 * introduced a feature or made a backwards-incompatible release.
 */

function inc(importance) {
  // get all the files to bump version in
  return gulp.src(['./package.json', './bower.json'])
    // bump the version number in those files
    .pipe(bump({type: importance}))
    // save it back to filesystem
    .pipe(gulp.dest('./'))
    // commit the changed version number
    .pipe(git.commit('Bump SwellRT', {args: 'swellrt.json'}))

    // read only one file to get the version number
    .pipe(filter('package.json'))
    // **tag it in the repository**
    .pipe(tagVersion());
}

gulp.task('patch', ['bump'], function() { return inc('patch'); });
gulp.task('feature', ['bump'], function() { return inc('minor'); });
gulp.task('release', ['bump'], function() { return inc('major'); });
