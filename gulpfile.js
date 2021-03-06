'use strict';

var fileinclude = require('gulp-file-include'),
        htmlhint = require("gulp-htmlhint"),
        compass = require('gulp-compass'),
        minifyCSS = require('gulp-minify-css'),
        rename = require('gulp-rename'),
        thotypous = require('gulp-uglify'), /* S2 */
        sass = require('gulp-sass'),
        htmlMinifier = require('gulp-html-minifier'),
        imageop = require('gulp-image-optimization'),
        clean = require('gulp-clean'),
        jshint = require("gulp-jshint"),
        concat = require('gulp-concat'),
        browserify = require('browserify'),
        stylish = require('jshint-stylish'),
        transform = require('vinyl-transform'),
	gulp = require('gulp'),
        livereload = require('gulp-livereload'),
	s3 = require("gulp-s3"),
	plumber = require('gulp-plumber'),
	ghPages = require('gulp-gh-pages'),
        streamqueue = require('streamqueue');

gulp.task('clean', function () {
    return gulp.src('Server/web', {read: false}).pipe(clean({force: true}));
});

gulp.task('bower-swf', function () {
    return gulp.src([
        'bower_components/zeroclipboard/dist/ZeroClipboard.swf'
    ]).pipe(gulp.dest("Server/web/assets"));
});

gulp.task('manifest', function () {
    return gulp.src([
        'src/manifest.json',
        'src/robots.txt'
    ]).pipe(gulp.dest("Server/web"));
});

gulp.task('app-html', function () {
    return gulp.src('src/**/*.html')
            .pipe(fileinclude({
                prefix: '@@',
                basepath: '@file'
            }))
            .pipe(htmlhint())
            .pipe(htmlhint.reporter())
            .pipe(htmlMinifier({
                collapseWhitespace: true,
                removeComments: true
            }))
            .pipe(gulp.dest("Server/web"))
            .pipe(livereload());
});

gulp.task('build-external-scripts', function () {

    return gulp.src('src/external-js/*.js')
            .pipe(jshint())
            .pipe(jshint.reporter(stylish))
            .pipe(thotypous())
            .pipe(gulp.dest('Server/web/js'));
});

gulp.task('deploy', function() {
	return gulp.src('./Server/web/**/*').pipe(ghPages());
});

gulp.task('jslint', function () {
    return gulp.src('src/js/**/*.js')
            .pipe(jshint())
            .pipe(jshint.reporter(stylish));
});

gulp.task('build-scripts', function () {
    var browserified = transform(function (filename) {
        var b = browserify(filename)
        return b.bundle();
    });

    return streamqueue({objectMode: true}, gulp.src([
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/mustache/mustache.min.js',
        'bower_components/jquery.bipbop/dist/jquery.bipbop.js',
        'bower_components/toastr/toastr.js',
        'bower_components/zeroclipboard/dist/ZeroClipboard.min.js',
        'bower_components/oauth.io/dist/oauth.js',
        'bower_components/jquery.finger/dist/jquery.finger.js',
        'bower_components/jquery.maskedinput/dist/jquery.maskedinput.js',
        'bower_components/d3/d3.js',
        'bower_components/nvd3/build/nv.d3.js'
    ]), gulp.src('src/js/*.js')
            .pipe(plumber())
            .pipe(browserified))
            .pipe(thotypous())
            .pipe(concat("app.min.js"))
            .pipe(gulp.dest('Server/web/js'))
            .pipe(livereload());

});

gulp.task('app-images', function () {
    return streamqueue({objectMode: true}, gulp.src(['src/**/*.png', 'src/**/*.jpg', 'src/**/*.gif', 'src/**/*.jpeg']).pipe(imageop({
        optimizationLevel: 5,
        progressive: true,
        interlaced: true
    })).pipe(gulp.dest('Server/web')), gulp.src(["src/**/*.svg"]).pipe(gulp.dest('Server/web')));
});


gulp.task('watch', function () {
    livereload.listen();

    gulp.watch('src/scss/*.scss', ['build-styles']);
    gulp.watch('src/js/**/*.js', ['jslint', 'build-scripts']);
    gulp.watch(['src/**/*.html', 'src/**/*.tpl'], ['app-html']);
    gulp.watch('src/external-js/**/*.js', ['build-external-scripts']);
});

gulp.task('app-fonts', function () {
    return gulp.src('bower_components/font-awesome/fonts/*')
            .pipe(gulp.dest('Server/web/fonts'));
})

gulp.task('build-styles', function () {

    return streamqueue({objectMode: true}, gulp.src([
        'bower_components/font-awesome/scss/**/*.scss',
        'bower_components/toastr/*.scss'
    ]).pipe(sass()), gulp.src([
        "bower_components/animate.css/animate.css",
        "bower_components/nvd3/build/nv.d3.css"
    ]), gulp.src([
        'src/scss/screen.scss'
    ])
            .pipe(plumber())
            .pipe(compass({
                css: 'temp/css',
                sass: 'src/scss',
                image: 'Server/web/img',
                sourcemap: false
            })))
            .pipe(concat("app.css"))
            .pipe(minifyCSS())
            .pipe(rename({suffix: ".min"}))
            .pipe(gulp.dest("Server/web/css"))
            .pipe(livereload());
});


gulp.task('build', ['jslint', 'build-external-scripts', 'manifest', 'app-fonts', 'app-images', 'build-scripts', 'bower-swf', 'build-styles', 'app-images', 'app-html']);
gulp.task('default', ['build', 'watch']);
