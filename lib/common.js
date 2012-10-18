var walk = require('walk');
var fs   = require('fs');

module.exports = {
    loadFiles: function(dir, callback) {
        var files = {};

        walk.walk(dir).on("file", function(root, stat, next) {

          var fpath = path.join(dir, stat.name);
          var ext   = path.extname(fpath);
          var name  = path.basename(fpath, ext);

          fs.readFile(fpath, 'utf-8', function(err, data) {
            if (!err) {
              files[name] = data;
            } else {
              console.log('failed to read' + fpath);
            }
          });
          next();
        }).on("end", function() {
          callback(files);
        });
    },

    getLineNumber: function(src, idx) {
        var m = src.substr(0, idx).match(/(^|\r*\n)/g);
        return m ? m.length + 1 : null;
    }
};