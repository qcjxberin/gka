/**
 * image trim
 */

var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    PNG = require('pngjs').PNG;

function createPng(width, height) {
    var png = new PNG({ width: width, height: height });

    for (var y = 0; y < png.height; y++) {
        for (var x = 0; x < png.width; x++) {
            var idx = (png.width * y + x) << 2;
            png.data[idx] = 0;
            png.data[idx + 1] = 0;
            png.data[idx + 2] = 0;
            png.data[idx + 3] = 0;
        }
    }
    return png;
}

function crop(isCrop, tmpDir, src2id, callback) {
    if (!isCrop) {
        callback(src2id, {});
        return;
    }

    var len = Object.keys(src2id).length,
        j = 0,
        src2idcut = {},
        src2info = {};

    mkdirp(tmpDir, function (err) {
        for(var src in src2id) {
            ((src, id) => {
                var filename = path.basename(src),
                    trimFilepath = path.join(tmpDir, filename);

                src2idcut[trimFilepath] = src2id[src];

                fs.createReadStream(src)
                    .pipe(new PNG({
                        filterType: 4
                    }))
                    .on('parsed', function() {

                        var xx = [],yy = [];

                        for (var y = 0; y < this.height; y++) {
                            for (var x = 0; x < this.width; x++) {
                                var idx = (this.width * y + x) << 2;
                                if(this.data[idx+3] !== 0) {
                                    xx.push(x);
                                    yy.push(y);
                                }
                            }
                        }
                      
                        var top = Math.min(...yy),
                            bottom = Math.max(...yy),
                            left = Math.min(...xx),
                            right = Math.max(...xx);

                            top = top > 0? top - 1: top,
                            bottom = bottom < this.height? bottom + 1: bottom,
                            left = left > 0? left - 1: left,
                            right = right < this.width? right + 1: right;

                        var width = right - left,
                            height = bottom - top;

                        var png = createPng(width, height);
                        this.bitblt(png, left, top, width, height, 0, 0);

                        src2info[trimFilepath] = {
                            offX: left,
                            offY: top,
                            w: width,
                            h: height,
                            sourceW: this.width,
                            sourceH: this.height,
                            // data: png.data,
                        };

                        var writeStream = fs.createWriteStream(trimFilepath).on('finish', function(){
                            ++j;
                            if (j === len) {
                                console.log(' ✔ image crop generated');
                                callback && callback(src2idcut, src2info);
                            }
                        });

                        png.pack().pipe(writeStream);
                    });

            })(src, src2id[src]);
        }
    });
}

module.exports = crop;