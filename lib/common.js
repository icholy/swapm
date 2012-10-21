var walk = require('walk');
var fs   = require('fs');
var path = require('path');

module.exports = {

  loadFiles: function(dir, callback) {
    var result = {};

    walk.walk(dir).on("file", function(root, stat, next) {

      var fpath = path.join(dir, stat.name),
          ext   = path.extname(fpath),
          name  = path.basename(fpath, ext);

      fs.readFile(fpath, 'utf-8', function(err, data) {
        if (!err) {
          result[name] = data;
        } else {
          console.log('[-] ERROR: failed to read' + fpath);
        }
        next();
      });
    }).on("end", function() {
      callback.call(this, null, result);
    });
  },

  getNumLines: function(src) {
    var m = src.match(/\r*\n/g);
    return (m ? m.length: 0) + 1;
  },

  getLineNumber: function(src, idx) {
    var sub = src.substr(0, idx);
    return this.getNumLines(sub);
  },

  getAllMatches: function(src, re) {
    var matches = [];

    re.lastIndex = 0;

    while(true) {
      var m = re.exec(src);
      if (!m) break;
      matches.push(m);
    }

    return matches;
  },

  initialize: function(dir, config, verbose) {

    verbose = typeof verbose != 'undefined' ? verbose : true;

    var paths = ['swapm', 'swapm/templates', 'swapm/data'];
    paths.forEach(function(p) {
      var fullPath = path.join(dir, path.normalize(p));
      if (fs.existsSync(fullPath)) {
        if(!fs.lstatSync(fullPath).isDirectory()) {
          throw { msg: fullPath + " path already exists and isn't a directory" };
        } else if (verbose) {
          console.log("[+] EXISTS:", fullPath);
        }
      } else {
        if (verbose) {
          console.log("[+] MKDIR:", fullPath);
        }
        fs.mkdirSync(fullPath);
      }
    });

    var configPath = path.join(dir, 'swapm', 'config.json');
    if (fs.existsSync(configPath)) {
      if (fs.lstatSync(configPath).isDirectory()) {
        throw { msg: 'config.json exists but is not a file' };
      } else if (verbose) {
        console.log("[+] EXISTS:", configPath);
      }
    } else {
      if (verbose)
        console.log("[+] CREATING:", configPath);
      fs.writeFileSync(configPath, JSON.stringify(config || {}));
    }
  },

  errorToString: function(e) {
    var msg   = e.msg || e.message || 'unknown',
        file  = (e.fname || '').toString(),
        line  = (e.line || '?').toString();

    return ["[-] ERROR", msg, file, line ].join(" : ");
  }
};