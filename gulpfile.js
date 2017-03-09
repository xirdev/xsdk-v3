var gulp = require('gulp');
var concat = require('gulp-concat')
var rename = require('gulp-rename')
var uglify = require('gulp-uglify')


var jsFiles = 'lib/**/*.js',
    jsDest = 'quickstart';

gulp.task('xsdk', function() {
    return gulp.src(jsFiles)
        .pipe(concat('xsdk.js'))
        .pipe(gulp.dest(jsDest))
        // .pipe(rename('xsdk.js'))
        // .pipe(uglify())
        // .pipe(gulp.dest(jsDest))
});