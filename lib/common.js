var walk = require('walk');
var fs   = require('fs');
var path = require('path');

module.exports = {
    loadFiles: function(dir, callback) {
        var files = {};

        walk.walk(dir).on("file", function(root, stat, next) {

          var fpath = path.join(dir, stat.name),
              ext   = path.extname(fpath),
              name  = path.basename(fpath, ext);

          fs.readFile(fpath, 'utf-8', function(err, data) {
            if (!err) {
              files[name] = data;
            } else {
              console.log('failed to read' + fpath);
            }
          });
          next();
        }).on("end", function() {
          callback(null, files);
        });
    },

    getNumLines: function(src) {
      var m = src.match(/(^|\r*\n)/g);
      return m ? m.length: 0;
    },

    getLineNumber: function(src, idx) {
        var sub = src.substr(0, idx);
        return this.getNumLines(sub) + 1;
    },

    initialize: function(dir) {

      var paths = ['swap', 'swap/templates', 'swap/data']
      return paths.forEach(function(p) {

        var fullPath = path.join(dir, p),
            stat = fs.lstatSync(fullPath);

          if (!stat.isDirectory()) {
            if (stat.exists()) fs.unlink(fullPath);
            else               fs.mkdirSync(fullPath);
          }

        });
    },

    errorToString: function(e) {
      var msg   = e.msg || 'unknown',
          file  = (e.fname || '').toString(),
          line  = (e.line || '?').toString();

      return ["[-] ERROR", msg, file, line ].join(" : ");
    }
};