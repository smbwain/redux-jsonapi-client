const gulp = require('gulp');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');

gulp.task('build', function() {
    return gulp.src('src/**/*.es6')
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ["es2015", 'react'],
            plugins: ['transform-object-rest-spread']
        }))
        .pipe(sourcemaps.write('.', {
            sourceRoot: '/src'
        }))
        .pipe(gulp.dest('./dist'));
});