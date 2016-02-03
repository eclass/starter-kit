/**
 * Gulpfile Setup
 * @author Raul Hernandez <raulghm@gmail.com>
 * @since 2015-08-31
 */

'use strict';

/**
 * Import modules
 */
var gulp = require('gulp');
var del = require('del');
var runSequence = require('run-sequence');
var gulpLoadPlugins = require('gulp-load-plugins');
var merge = require('merge-stream');
var minimist = require('minimist');
var pngquant = require('imagemin-pngquant');
var browserSync = require('browser-sync').create();

/**
 * Setting constants
 */
var $ = gulpLoadPlugins();
var argv = minimist(process.argv.slice(2));
var SRC = './src/'; // The source input folder
var DEST = './dist/'; // The build output folder
var BOWER = './bower_components/'; // The bower input folder
var RELEASE = !!argv.dist; // Minimize and optimize during the build?

/**
 * jshint and jscs linter
 * See the .jscsrc and .eslintrc file for based rules
 */
gulp.task('jscs', function() {
	return gulp.src(SRC + '/scripts/**/*.js')
		.pipe($.jscs())
		.pipe($.jscsStylish());
});

gulp.task('lint', function() {
	runSequence(['jscs']);
});

/**
 * Vendor scripts
 */
gulp.task('vendorScripts', function() {
	var VENDOR_SCRIPTS = require('./vendor-scripts.js');

	return merge(
		gulp.src(BOWER + '/modernizr/modernizr.js')
			.pipe($.if(RELEASE, $.uglify({preserveComments: 'some'})))
			.pipe(gulp.dest(DEST + '/scripts')),
		gulp.src(BOWER + '/jquery-legacy/dist/jquery.min.js')
			.pipe($.rename('jquery-legacy.min.js'))
			.pipe(gulp.dest(DEST + '/scripts')),
		gulp.src(BOWER + '/jquery-modern/dist/jquery.min.js')
			.pipe($.rename('jquery-modern.min.js'))
			.pipe(gulp.dest(DEST + '/scripts')),
		gulp.src(VENDOR_SCRIPTS)
			.pipe($.concat('vendor.js'))
			.pipe($.if(RELEASE, $.uglify({preserveComments: 'some'})))
			.pipe(gulp.dest(DEST + 'scripts'))
	);
});

/**
 * Fonts
 */
gulp.task('fonts', function() {
	return gulp.src(BOWER + 'font-awesome/fonts/**/*')
		.pipe($.size({title: 'fonts'}))
		.pipe(gulp.dest(DEST + 'fonts/font-awesome'));
});

/**
 * Images
 */
gulp.task('images', function() {
	return gulp.src([SRC + 'images/**/**'])
		.pipe($.if(RELEASE, $.imagemin({
			progressive: true,
			svgoPlugins: [{removeViewBox: false}],
			use: [pngquant()],
		})))
		.pipe($.size({title: 'Size images:'}))
		.pipe(gulp.dest(DEST + 'images'));
});

/**
 * Styles
 */
gulp.task('styles', function() {
	var AUTOPREFIXER_BROWSERS = [
		'ff >= 30',
		'chrome >= 34',
		'safari >= 7',
		'opera >= 23',
		'ie >= 9',
		'ie_mob >= 10',
		'ios >= 7',
		'android >= 4.4',
		'bb >= 10',
	];
	return gulp.src(SRC + '/styles/styles.scss')
		.pipe($.plumber({
			errorHandler: $.notify.onError('Error: <%= error.message %>'),
		}))
		.pipe($.if(RELEASE,
			$.sass.sync({
				errLogToConsole: false,
				onError: function(err) {
					return $.notify().write(err);
				},
			}).on('error', $.sass.logError),
			$.sass.sync({
				sourceComments: 'normal',
				outputStyle: 'nested',
				errLogToConsole: false,
				onError: function(err) {
					return $.notify().write(err);
				},
			}).on('error', $.sass.logError)
		))
		.pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
		.pipe($.changed(DEST))
		.pipe($.if(RELEASE, $.cssnano()))
		.pipe($.size({title: 'Size CSS:', showFiles: true}))
		.pipe($.if(RELEASE, $.size({title: 'Size CSS:', gzip:true, showFiles: true})))
		.pipe($.if(RELEASE, $.replace('/*!', '/*'))) // remove special comments
		.pipe($.if(RELEASE, $.stripCssComments())) // remove comments
		.pipe(gulp.dest(DEST + 'styles'))
		.pipe(browserSync.stream({match: '**/*.css'}));
});

/**
 * Scripts
 */
gulp.task('scripts', function() {
	var SCRIPTS = [
		SRC + 'scripts/**/*.js',
	];

	return gulp.src(SCRIPTS)
		.pipe($.concat('scripts.js'))
		.pipe($.if(RELEASE, $.uglify({preserveComments: 'some'})))
		.pipe($.size({title: 'scripts'}))
		.pipe(gulp.dest(DEST + 'scripts'));
});

/**
 * Pages
 */
gulp.task('pages', function() {
	return gulp.src(SRC + '/templates/pages/*.hbs')
		.pipe($.changed(SRC + '/templates', {extension: '.hbs'}))
		.pipe($.plumber())
		.pipe($.frontMatter({ property: 'meta' }))
		.pipe($.hb({
			debug: false,
			bustCache: true,
			data: {
				// rev: require('./rev-manifest.json'),
				data: require(SRC + 'data/data.json'),
				dist: RELEASE,
			},
			helpers: SRC + 'helpers/*.js',
			partials: SRC + 'templates/partials/**/*.hbs',
		}))
		.pipe($.if(RELEASE, $.htmlmin({
			// collapseWhitespace: true,
			// minifyCSS: true,
			// minifyJS: true,
		})))
		.pipe($.size({title: 'HTML'}))
		.pipe($.rename({ extname: '.html' }))
		.pipe(gulp.dest(DEST))
		.pipe($.if(!RELEASE, browserSync.stream()));
 });

/**
 * Clean task
 */
gulp.task('clean', function() {
	del([DEST]);
});

/**
 * Default task
 */
gulp.task('default', ['serve', 'watch']);

/**
 * Build task
 */
gulp.task('build', function() {
	runSequence([
		'fonts',
		'images',
		'vendorScripts',
		'scripts',
		'styles',
		'pages',
	], function() {
		'pages';
	});
});

/**
 * Watch task
 */
gulp.task('watch', function() {
	gulp.watch('src/images/**/**', ['images']);
	gulp.watch(['src/styles/**/*.scss', 'src/vendor/styles/**/*.scss'], ['styles']);
	gulp.watch(['src/scripts/**/*.js', 'src/vendor/scripts/**/*.js'], ['scripts']);
	gulp.watch(['src/data/**/**', 'src/templates/**/**'], ['pages']);
});

/**
 * Serve task
 */
gulp.task('serve', ['build'], function() {
	if (!RELEASE) {
		browserSync.init({
			notify: false,
			open: false,
			server: {
				baseDir: DEST,
			},
		});
	}
});
