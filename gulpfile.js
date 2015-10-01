var gulp = require('gulp');
var gls = require('gulp-live-server');
var less = require('gulp-less');
var open = require('gulp-open');
var concat = require('gulp-concat');
var path = require('path');
var Server = require('karma').Server;

var server;


gulp.task('server', function() {
  server = gls.static('./', 9000);
  server.start();
});


gulp.task('watch', function() {
  gulp.watch(['./demos/index.html', './demos/app.js'], function(file) {
  	if(server) {
  		server.notify.apply(server);
  	}
  });

  gulp.watch(['./src/*.js'], function(file) {
  	gulp.start('dist-js');
  });

  gulp.watch(['./demos/*.less'], function(file) {
  	gulp.start('dist-css');
  });
});


gulp.task('dist-js', function() {
	gulp.src([
			'./src/ssCarousel.directive.js',
			'./src/ssCarousel.controller.js',
			'./src/ssCarousel.service.js',
			'./src/ssNavigation.directive.js',
			'./src/ssPagination.directive.js',
			'./src/ssSlide.directive.js'
		])
  	.pipe(concat('ss-carousel.js'))
  	.pipe(gulp.dest('./dist/'))
    .on('error', onError)
    .on('end', function() {
    	if(server) {
    		server.notify.apply(server);
    	}
    });
});


gulp.task('dist-css', function() {
	gulp.src('./demos/*.less')
  .pipe(less({
    paths: [ path.join(__dirname, 'less', 'includes') ]
  }))
  .pipe(gulp.dest('./demos'))
  .on('error', onError)
  .on('end', function() {
		if(server) {
			server.notify.apply(server);
		}
  });
});


gulp.task('open', function() {
  gulp.src('./demos/index.html')
    .pipe(open({ uri: 'http://localhost:3000/demos/' }))
    .on('error', onError);
});


gulp.task('test', function (done) {
  new Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: false
  }, done).start();
});

gulp.task('serve', ['server', 'watch']);


function onError(err) {
  console.log(err);
  this.emit('end');
}