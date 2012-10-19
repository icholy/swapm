
var mustache = require('mustache');
var fs       = require('fs');
var walk     = require('walk');
var path     = require('path');
var async    = require('async');
var common   = require('./common');

module.exports = (function(){

  var templates = {},
      dataSets  = {};

  var render = function(tmpl, data) {
    return mustache.render(tmpl, data);
  };

  var inject = function(src, point) {

    var tmpl = templates[point.template],
        data = typeof point.data == 'object' ? point.data : dataSets[point.data];

    try {
      if (!tmpl) 
        throw { msg: point.template + " template not found" };
      if (!data) 
        throw { msg: point.data + " data not found" };
    } catch (e) {
      e.idx = point.start;
      throw e;
    }

    data.params = point.params;

    return src.substring(0, point.start) + render(tmpl, data) + src.substring(point.end, src.length);
  };

  var checkTag = function(start, end) {
    return start[0].charAt(0) == '[' && end[0].charAt(0) == ']';
  };

  var getTagContent = function(src, start, end) {
    var startIdx = start.index + start[0].length;
    return src.substr(startIdx, end.index - startIdx);
  };

  var findInjectionPoints = function(src) {
    
    var pat     = /(\[\@?(\w*)=\[|\]=\])/g,
        points  = [];

    while (true) {

      var startOpen   = pat.exec(src),
          startClose  = pat.exec(src);

      if (!startOpen) 
        break;
      if (!startClose || !checkTag(startOpen, startClose)) 
        throw { msg: "invalid open tag syntax", idx: startOpen.index };

      var startContent = getTagContent(src, startOpen, startClose),
          params = null;
      
      if (startOpen[2] && startOpen[2].length > 0) {
        var templateName = startOpen[2].trim();
        templates[templateName] = startContent;
        console.log("[+] TEMPLATE :", templateName);
        continue;
      }

      var endOpen  = pat.exec(src),
          endClose = pat.exec(src);

      if (!endOpen) 
        throw { msg: "missing closing tag", idx: startOpen.index };
      if (!endClose || !checkTag(endOpen, endClose))
        throw { msg: "invalid close tag syntax", idx: endOpen.index };

      var endContent = getTagContent(src, endOpen, endClose).trim();

      if (endContent != "end") 
        throw { msg: "close order error", idx: end.index };

      try {
        params = eval('({'+startContent+'})');
      } catch (e) {
        throw { msg: e.message, idx: startOpen.index };
      }

      try {
        if (!params)          
          throw { msg: "invalid open tag syntax" };
        if (!params.data)     
          throw { msg: "missing data parameter" };
        if (!params.template) 
          throw { msg: "missing template parameter" };
      } catch (e) {
        e.idx = start.index;
        throw e;
      }

      points.push({
        start:    startClose.index + startClose[0].length,
        end:      endOpen.index,
        template: params.template,
        data:     params.data,
        params:   params
      });
    }

    return points;
  };

  return {

    load: function(dir, callback) {
      dir = path.join(dir || process.cwd(), "swapm");

      var templatePath = path.join(dir, 'templates'),
          dataPath     = path.join(dir, 'data');

      async.parallel([
        function(cb) {
          common.loadFiles(templatePath, function(err, files) {
            if (!err) {
              templates = files;
              cb.call(this, null, null);
            } else {
              cb.call(this, err, null);
            }
          });
        },
        function(cb) {
          common.loadFiles(dataPath, function(err, files) {
            if (!err) {
              Object.keys(files).forEach(function(key) {
                dataSets[key] = eval('('+files[key]+')');
              });
              cb.call(this, null, null);
            } else {
              cb.call(this, err, null);
            }
          });
        }], callback);
    },

    process: function(src) {

      var points = findInjectionPoints(src);

      if (points.length === 0) {
        return null;
      } else {
        return points.reduceRight(function(s, point) {
          console.log("[+] INJECTING",
                      ": LINE =>", common.getLineNumber(src, point.start),
                      ": DATA =>", typeof point.data == 'object' ? 'inline' : point.data,
                      ": TEMPLATE =>", point.template);
          return inject(s, point);
        }, src);
      }
    },

    processFile: function(fname, callback) {
      var _this = this;
      fs.readFile(fname, 'utf-8', function(err, src) {
        if (!err) {
          try {
            var res = _this.process(src);
            callback.call(this, null, res);
          } catch (e) {
            e.fname = fname;
            e.line  = e.idx ? common.getLineNumber(src, e.idx) : null;
            callback.call(this, e, null);
          }
        } else {
          var e = { msg: "error reading", fname: fname };
          callback.call(this, e, null);
        }
      });
    }
  };

}());