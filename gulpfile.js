var config = {

  server: {
    port: 5580,
    host: 'angular-swellrt'
  },
}

/*-----  End of Configuration  ------*/

var gulp = require('gulp');
var karma = require('karma').server;
var connect = require('gulp-connect');

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
