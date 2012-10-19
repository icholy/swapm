
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

  var getAllMatches = function(src, re) {
    var matches = [];

    re.lastIndex = 0;

    while(true) {
      var m = re.exec(src);
      if (!m) break;
      matches.push(m);
    }

    return matches;
  }

  var getAllTags = function(src) {
    var openRe       = /\[(@|#)?(\w*)?=\[/g,
        closeRe      = /\]=\]/g,
        openMatches  = getAllMatches(src, openRe),
        closeMatches = getAllMatches(src, closeRe),
        lastIndex    = 0,
        tags         = [];

    if (openMatches.length != closeMatches.length)
      throw { msg: "unballanced tags" };

    for (var i = 0; i < openMatches.length; i++) {
      var open  = openMatches[i],
          close = closeMatches[i];

      if (open.index > close.index)
        throw { msg: "close tag before open", idx: close.index };

      var content = getTagContent(src, open, close);
      
      tags.push({
        open:     open,
        close:    close,
        content:  content,
        modifier: open[1],
        name:     open[2]
      });
    }

    return tags;
  };

  var parseTagsWithModifiers = function(tags) {
    tags.forEach(function(tag) {
        switch (tag.modifier) {
          case "#":
            try {
              dataSets[tag.name] = eval('('+tag.content+')');
            } catch (e) {
              e.idx = tag.open.idx;
              throw e;
            }
            console.log('[+] DATA :', tag.name);
            break;
          case "@":
            templates[tag.name] = tag.content;
            console.log('[+] TEMPLATE :', tag.name)
            break;
          default:
            throw { msg: "invalid modifier " + tag.modifier, idx: tag.open.index };
        }
    });
  };

  var findInjectionPoints = function(src) {

    var tags   = getAllTags(src),
        points = []; 

    parseTagsWithModifiers(tags.filter(function(tag) {
      return !!tag.modifier;
    }));

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

      if (endTag.content.trim() != "end")
        throw { msg: "invalid end tag ", idx: endTag.close.index }

      try {
        params = eval('({'+startTag.content+'})');
      } catch (e) {
        e.idx = startTag.open.index;
        throw e;
      }

      try {
        if (!params)          
          throw { msg: "invalid open tag syntax" };
        if (!params.data)     
          throw { msg: "missing data parameter" };
        if (!params.template) 
          throw { msg: "missing template parameter" };
      } catch (e) {
        e.idx = startTag.open.index;
        throw e;
      }

      // prevent the comment character from being wiped. This is a hack ... :(
      var startClosePos = startTag.close.index + startTag.close[0].length;
      var startPos = src.substr(startClosePos).indexOf("\n") + startClosePos;
      var endPos = src.substr(0, endTag.open.index).lastIndexOf("\n") + 1;

      points.push({
        start:    startPos,
        end:      endPos,
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