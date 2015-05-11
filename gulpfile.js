/*!
 * Gulpfile Setup
 * author: Raul Hernandez <raulghm@gmail.com, rhernandez@eclass.cl>
 */

'use strict';

// Include Gulp and other build automation tools and utilities.
// See: https://github.com/gulpjs/gulp/blob/master/docs/API.md
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var merge = require('merge-stream');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync').create();
var argv = require('minimist')(process.argv.slice(2));

// Settings
var SRC = './src';                    // The source input folder
var DEST = './dist';                  // The build output folder
var BOWER = './bower_components';     // The bower input folder
var RELEASE = !!argv.dist;            // Minimize and optimize during a build?

var AUTOPREFIXER_BROWSERS = [         // https://github.com/ai/autoprefixer
	'ie >= 9',
	'ie_mob >= 10',
	'ff >= 30',
	'chrome >= 34',
	'safari >= 7',
	'opera >= 23',
	'ios >= 7',
	'android >= 4.4',
	'bb >= 10'
];

var VENDOR_SCRIPTS = [
	SRC + '/scripts/**/*.js'
];

var src = {};
var watch = false;
var test = false;
var sassOutputStyle = RELEASE ? 'compressed' : 'nested';
var reload = browserSync.reload;

// Clean up
gulp.task('clean', del.bind(null, [DEST]));

// 3rd party libraries
gulp.task('vendor', function () {
	return merge(
		gulp.src(BOWER + '/respond/dest/respond.min.js')
			.pipe(gulp.dest(DEST + '/scripts')),
		gulp.src(BOWER + '/selectivizr/selectivizr.js')
			.pipe(gulp.dest(DEST + '/scripts')),
		gulp.src(BOWER + '/jquery-legacy/dist/jquery.min.js')
			.pipe($.rename('jquery-legacy.min.js'))
			.pipe(gulp.dest(DEST + '/scripts')),
		gulp.src(BOWER + '/jquery-modern/dist/jquery.min.js')
			.pipe($.rename('jquery-modern.min.js'))
			.pipe(gulp.dest(DEST + '/scripts'))
	);
});

// Images
gulp.task('images', function () {
	src.images = SRC + '/images/**/*';
	return gulp.src(src.images)
		.pipe(gulp.dest(DEST + '/images'))
		.pipe($.if(watch, reload({stream: true})));
});

// Fonts
gulp.task('fonts', function () {
	return merge(
		gulp.src(BOWER + '/font-awesome/fonts/**')
		.pipe(gulp.dest(DEST + '/fonts/font-awesome'))
	);
});

// HTML pages
gulp.task('templates', function () {
	src.pages = [SRC + '/templates/pages/**/*', SRC + '/templates/layouts/**/*', SRC + '/templates/partials/**/*'];
	return gulp.src(SRC + '/templates/pages/*.hbs')
		.pipe($.assemble({
			layout: 'default',
			layoutext: '.hbs',
			layoutdir: SRC + '/templates/layouts',
			partials: SRC + '/templates/partials/**/*.hbs'
		}))
		.pipe($.if(RELEASE, $.htmlmin({
			removeComments: true,
			collapseWhitespace: false,
		})))
		.pipe(gulp.dest(DEST))
		.pipe($.if(watch, reload({stream: true})));
});

// CSS stylesheets
gulp.task('styles', function () {
	src.styles = [SRC + '/styles/**/*.scss', '../base/src/styles/**/*.scss'];
	return gulp.src(SRC + '/styles/styles.scss')
		.pipe($.plumber())
		.pipe($.sass({
			sourceComments: "normal",
			outputStyle: sassOutputStyle,
			errLogToConsole: false,
			onError: function(err) { 
				return $.notify().write(err);
			}
		}))
		.pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
		.pipe($.changed(DEST))
		.pipe($.size({title: 'Size CSS:'}))
		.pipe($.if(RELEASE, $.replace('/*!', '/*'))) // remove special comments
		.pipe($.if(RELEASE, $.stripCssComments())) // remove comments
		.pipe($.if(RELEASE, $.minifyCss())) // minify
		.pipe(gulp.dest(DEST + '/styles'))
		.pipe($.filter('**/*.css'))
		.pipe($.if(watch, reload({stream: true})));
});

// Scripts
gulp.task('scripts', function () {
	src.scripts = [SRC + '/scripts/**/*.js'];
	return gulp.src(VENDOR_SCRIPTS)
		.pipe($.if(!RELEASE, $.sourcemaps.init()))
		.pipe($.concat('scripts.js'))
		.pipe(gulp.dest(DEST + '/scripts'))
		.pipe($.if(RELEASE, $.uglify()))
		.pipe($.if(RELEASE, $.stripDebug()))
		.pipe($.if(!RELEASE, $.sourcemaps.write('./')))
		.pipe($.size({title: 'Size JS:'}))
		.pipe(gulp.dest(DEST + '/scripts'))
		.pipe($.if(watch, reload({stream: true})));
});

// Default task
gulp.task('default', ['serve']);

// Build task
gulp.task('build', ['clean'], function (cb) {
	runSequence(['vendor', 'styles', 'scripts', 'templates', 'images'], cb);
});

// Watch task
gulp.task('watch', function () {
	gulp.watch(src.images, ['images']);
	gulp.watch(src.pages, ['templates']);
	gulp.watch(src.styles, ['styles']);
	gulp.watch(src.scripts, ['scripts']);
	watch = true;
});

// BrowserSync
gulp.task('serve', ['build'], function () {
	if (!RELEASE) {
		browserSync.init({
			notify: false,
			open: false,
			server: {
				baseDir: DEST
			}
		});
		runSequence('watch');
	}
});