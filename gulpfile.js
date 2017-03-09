var gulp = require('gulp');
var concat = require('gulp-concat')
var rename = require('gulp-rename')
var uglify = require('gulp-uglify')



var jsFiles = ["lib/xirsys.core.js", "lib/xirsys.api.js", "lib/xirsys.signal.js", "lib/xirsys.p2p.js", "lib/xirsys.p2p.adapter.js", "lib/xirsys.databind.js", "lib/xirsys.simplewebrtc.connection.js", "lib/xirsys.ui.js", "lib/xirsys.model.js", "lib/xirsys.simplewebrtc.js", "lib.xirsys.quickstart.js"]

jsDest = 'quickstart';

gulp.task('xsdk', function() {
    return gulp.src(jsFiles)
        .pipe(concat('xsdk.js'))
        .pipe(gulp.dest(jsDest))
        .pipe(rename('xsdk.js'))
        .pipe(uglify())
        .pipe(gulp.dest(jsDest))
});