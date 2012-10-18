
var mustache = require('mustache');
var fs       = require('fs');
var walk     = require('walk');
var path     = require('path');

module.exports = (function(){

  var templates = {};
  var dataSets  = {};

  var render = function(tmpl, data) {
    return mustache.render(tmpl, data);
  };

  var inject = function(src, point) {

      var tmpl = templates[point.template];
      var data = dataSets[point.data];

      data.params = point.params;

      if (!tmpl)     throw { msg: point.template + "template not found" };
      if (!dataName) throw { msg: point.data + " data not found" };

      return src.substring(0, point.start)
           + render(tmpl, point.data)
           + src.substring(end, src.length);
  };

  var findInjectionPoints = function(src) {
    
    var pat     = /\/\*{([^}]*)}\*\//g,
        points  = [];

    while (true) {

      var start = pat.exec(src),
          end   = pat.exec(src),
          params;

      if (!start) break;
      if (!end)   throw { msg: "open/close mismatch error", idx: start.index };

      var startContent = start[1].trim(),
          endContent = end[1].trim();

      if (startContent == "end") throw { msg: "open order error",  idx: start.index };
      if (endContent   != "end") throw { msg: "close order error", idx: end.index   };

      try {
        params = eval('({'+startContent+'})');
      } catch (e) {
        throw { msg: "invalid open syntax", idx: start.index };
      }

      try {
        if (!params)          throw { msg: "invalid open syntax" };
        if (!params.data)     throw { msg: "missing data parameter" }
        if (!params.template) throw { msg: "missing template parameter" };
      catch (e) {
        e.idx = start.index;
        throw e;
      }

      points.push({
        start:    start.index + start[0].length,
        end:      end.index,
        template: params.template,
        data:     params.data,
        params:   params
      });
    }

    return points;
  };

  var loadTemplates = function(dir, cb) {
    walk.walk(dir).on("file", function(root, stat, next) {

      var fpath = path.join(dir, stat.name);
      var ext   = path.extname(fpath);
      var name  = path.basename(fpath, ext);

      fs.readFile(fpath, 'utf-8', function(err, data) {
        if (!err) {
          templates[name] = data;
        } else {
          console.log('failed to read' + fpath);
        }
      });
      next();
    }).on("end", function() {
      cb();
    });
  };

  var loadData = function(dir, cb) {
    walk.walk(dir).on("file", function(root, stat, next) {

      var ext   = path.extname(stat.name);
      var name  = path.basename(stat.name, ext);
      var fpath = path.join(dir, name);
      if (ext == '.js') {
        dataSets[name] = require(fpath);
      }
      next();
    }).on("end", function() {
      cb();
    });

    var getLineNumber = function(src, idx) {
      var m = src.substr(0. idx).match(/(^|\r*\n)/g);
      return m ? m.length + 1 : null;
    };
  };

  return {

    addTemplate: function(name, template) {
      templates[name] = template;
    },

    addData: function(name, data) {
      dataSets[name] = data;
    },

    getDataNames: function() {
      return Object.keys(dataSets);
    },

    getTemplateNames: function() {
      return Object.keys(templates);
    },

    load: function(dir) {
      dir = path.join(dir || process.cwd(), "swap");

      var templatePath = path.join(dir, 'templates'),
          dataPath     = path.join(dir, 'data');

      loadTemplates(templatePath, function() {

      });

      loadData(dataPath, function() {

      });
    },

    process: function(src) {
      return findInjectionPoints(src).reduce(function(s, point) {
        return inject(s, point);
      }, src);
    },

    processFile: function(fname, fn) {
      var _this = this;
      fs.readFile(fname, 'utf-8', function(err, src) {
        if (!err) {
          try {
            fn(_this.process(src));
          } catch (e) {
            e.fname = fname;
            e.line  = e.idx ? getLineNumber(src, e.idx) : null;
            throw e;
          }
        }
        else throw { msg: "error reading", fname: fname };
      });
    }
  };

}());