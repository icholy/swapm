var common = require('../lib/common');
var assert = require('assert');
var fs     = require('fs');
var path   = require('path');
var wrench = require('wrench');

describe('common', function() {
  
  describe('#getNumLines(src)', function() {
    it("\"test\" should be 1 line", function() {
      assert.equal(1, common.getNumLines("test"))
    });
    it("\"\\n\" should be 2 lines", function() {
      assert.equal(2, common.getNumLines("\n"));
    });
    it("\"\\n\\n\" should be 3 lines", function() {
      assert.equal(3, common.getNumLines("\n\n"));
    });
    it("\"\\r\\nline\\n\\n\" should be 4 lines", function() {
      assert.equal(4, common.getNumLines("\r\nline\n\n"));
    });
  });

  describe('#getLineNumber(src, idx)', function() {

      var text  = "this\n"; //1 : 5 : 5
          text += "is\n";   //2 : 3 : 8
          text += "a\n";    //3 : 2 : 10
          text += "test\n"; //4 : 5 : 15

    it('should be line 1', function() {
      assert.equal(1, common.getLineNumber(text, 0));
      assert.equal(1, common.getLineNumber(text, 2));
      assert.equal(1, common.getLineNumber(text, 4));
    });

    it('should be line 2', function() {
      assert.equal(2, common.getLineNumber(text, 5));
      assert.equal(2, common.getLineNumber(text, 7));
    });

    it('should be line 3', function() {
      assert.equal(3, common.getLineNumber(text, 8));
      assert.equal(3, common.getLineNumber(text, 9));
    });

    it('should be line 4', function() {
      assert.equal(4, common.getLineNumber(text, 10));
      assert.equal(4, common.getLineNumber(text, 14));
    });

    it.only('should handle lines with no newline', function() {
      var text = "1\n2";
      assert.equal(2, common.getLineNumber(text, 2));
    });

  });

  describe('#getAllMatches(src, re)', function() {
    it('should find all the tag openings', function() {
      var re = /\[(@|#)?(\w*)?=\[/g;
      var text = "[#foo_s=[ [@what=[ [@dsfhi_us_a_test=[";
      assert(3, common.getAllMatches(text, re));
    });

    it('should find all the tag closings', function() {
      var re = /\]=\]/g;
      var text = "]=] ]=] ]=]";
      assert(3, common.getAllMatches(text, re));
    });
  });

  describe('#errorToString(e)', function() {
    it('should use "?" when there is no line number', function() {
      var err = { msg: "msg", fname: "file" };
      var str = common.errorToString(err);
      assert.equal(str, "[-] ERROR : msg : file : ?");
    });
    it('should use message when no msg exists', function() {
      var err = { message: "msg", fname: "file", line: "line"};
      var str = common.errorToString(err);
      assert.equal(str, "[-] ERROR : msg : file : line");
    });
    it('should use "unknown" when no msg or message exist', function() {
      var err = { fname: "file", line: "line"};
      var str = common.errorToString(err);
      assert.equal(str, "[-] ERROR : unknown : file : line");
    });
    it('should use "?" when there is no line number', function() {
      var err = { msg: "msg", fname: "file" };
      var str = common.errorToString(err);
      assert.equal(str, "[-] ERROR : msg : file : ?");
    });
    it('should use "" when there is no file', function() {
      var err = { msg: "msg", line: "line" };
      var str = common.errorToString(err);
      assert.equal(str, "[-] ERROR : msg :  : line");
    });
  });

  describe('#loadFiles(dir, callback)', function() {

    it('should load all the files', function(next) {
      var tmpPath = path.normalize('./test/tmp');
      var file1 = path.join(tmpPath, 'file1');
      var file2 = path.join(tmpPath, 'file2');

      fs.mkdirSync(tmpPath);
      fs.writeFileSync(file1, 'file1');
      fs.writeFileSync(file2, 'file2');

      common.loadFiles(tmpPath, function(err, files) {

        wrench.rmdirSyncRecursive(tmpPath);

        assert.equal(files['file1'], 'file1');
        assert.equal(files['file2'], 'file2');

        next();
      });
    });
  });

  describe('#initialize(dir)', function() {
    it('should initialize the required directories', function() {

      var tmpPath = path.normalize('./test/tmp');
      fs.mkdirSync(tmpPath);

      common.initialize(tmpPath, false);
      
      var newPaths = ['swapm', 'swapm/templates', 'swapm/data'];

      newPaths.forEach(function(newPath) {
        var exists = fs.existsSync(path.join(tmpPath, newPath));
        assert.ok(exists);
      });

      wrench.rmdirSyncRecursive(tmpPath);
    });
  });
});