var gulp = require('gulp');
var karma = require('karma').server;

gulp.task('default', function(done) {
  karma.start({      
    configFile: __dirname + '/karma.conf.js', 
        singleRun: true 
   }, done);
});

gulp.task('test', function (done) { 
   karma.start({ 
     configFile: __dirname + '/karma.conf.js' 
   }, done); 
}); 
