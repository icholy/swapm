
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

  var getAllTags = function(src) {
    var openRe       = /\[(@|#)?(\w*)?=\[/g,
        closeRe      = /\]=\]/g,
        openMatches  = common.getAllMatches(src, openRe),
        closeMatches = common.getAllMatches(src, closeRe),
        lastIndex    = 0,
        tags         = [];

    openMatches = openMatches.filter(function(m) {
      return ((!!m[1] && !!m[2]) || (!m[1] && !m[2]));
    });

    if (openMatches.length != closeMatches.length)
      throw { msg: "unballanced tags" };

    for (var i = 0; i < openMatches.length; i++) {
      var open  = openMatches[i],
          close = closeMatches[i];

      if (open.index > close.index)
        throw { msg: "close tag before open", idx: close.index };

      var content = getTagContent(src, open, close);
      
      tags.push({
        startIdx: open.index,
        endIdx:   close.index,
        str:      open[0] + content + close[0],
        content:  content,
        modifier: open[1],
        name:     open[2]
      });
    }

    return tags;
  };

  var parseTagsWithModifiers = function(tags, verbose) {

    verbose = typeof verbose != 'undefined' ? verbose : true;

    tags.forEach(function(tag) {
        switch (tag.modifier) {
          case "#":
            try {

              if (dataSets[tag.name])
                throw { msg: tag.name + " data already defined" };

              if (verbose)
                console.log('[+] DATA :', tag.name);

              dataSets[tag.name] = eval('('+tag.content+')');
            } catch (e) {
              e.idx = tag.startIdx;
              throw e;
            }

            break;
          case "@":

            if (templates[tag.name])
              throw { msg: tag.name + " template already defined", idx: tag.startIdx };

            if (verbose)
              console.log('[+] TEMPLATE :', tag.name)
  
            templates[tag.name] = tag.content;
            break;
          default:
            throw { msg: "invalid modifier " + tag.modifier, idx: tag.startIdx };
        }
    });
  };

  var findInjectionPoints = function(src, verbose) {

    verbose = typeof verbose != 'undefined' ? verbose : true;

    var tags   = getAllTags(src),
        points = [],
        index  = 0; 

    parseTagsWithModifiers(tags.filter(function(tag) {
      return !!tag.modifier;
    }), verbose);

    var injTags = tags.filter(function(tag) {
      return !tag.modifier;
    });

    if (injTags.length % 2 != 0)
      throw { msg: "unbalaced injection tags" };

    while (injTags.length != 0) {

      var tmp       = injTags.splice(0, 2),
          startTag  = tmp[0],
          endTag    = tmp[1],
          params;

      if (startTag.startIdx < index)            throw { msg: "tags out of order", idx: startTag.startIdx };
      if (endTag.startIdx < index)              throw { msg: "tags out of order", idx: endTag.startIdx };
      if (startTag.startIdx > endTag.startIdx)  throw { msg: "tags out of order", idx: endTag.startIdx };
      if (startTag.content.trim() == "end")     throw { msg: "invalid start tag", idx: startTag.startIdx };
      if (endTag.content.trim() != "end")       throw { msg: "invalid end tag ",  idx: endTag.endIdx }

      try {
        params = eval('({'+startTag.content+'})');
      } catch (e) {
        e.idx = startTag.startIdx;
        throw e;
      }

      try {
        if (!params)          throw { msg: "invalid open tag syntax" };
        if (!params.data)     throw { msg: "missing data parameter" };
        if (!params.template) throw { msg: "missing template parameter" };
      } catch (e) {
        e.idx = startTag.startIdx;
        throw e;
      }

      var injStart = src.indexOf("\n", startTag.startIdx + startTag.str.length) + 1,
          injEnd   = src.substr(0, endTag.startIdx).lastIndexOf("\n");

      points.push({
        start:    injStart,
        end:      injEnd,
        template: params.template,
        data:     params.data,
        params:   params
      });

      index = endTag.endIdx;
      
    }

    return points;
  };

  return {

    reset: function() {
      templates = {};
      dataSets  = {};
    },

    getTemplates: function() {
      return templates;
    },

    getData: function() {
      return dataSets;
    },

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

    process: function(src, verbose) {

      verbose = typeof verbose != 'undefined' ? verbose : true;

      var points = findInjectionPoints(src, verbose);

      if (points.length === 0) {
        return null;
      } else {
        return points.reduceRight(function(s, point) {
          if (verbose) {
            console.log("[+] INJECTING",
                        ": LINE =>", common.getLineNumber(src, point.start),
                        ": DATA =>", typeof point.data == 'object' ? 'inline' : point.data,
                        ": TEMPLATE =>", point.template);
          }
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