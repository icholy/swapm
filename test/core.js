var fs     = require('fs');
var path   = require('path');
var wrench = require('wrench');
var assert = require('assert');
var swapm  = require('../lib/core');
var common = require('../lib/common');

describe('core', function() {
  describe('#load(dir, callback)', function() {
    it('should load the data file', function(next) {
      
      var tmpPath = path.normalize('./test/tmp');
      var templatePath = path.join(tmpPath, 'swapm', 'templates');
      fs.mkdirSync(tmpPath);      
      
      common.initialize(tmpPath);

      fs.writeFileSync(path.join(templatePath, 't1.tmpl'), 't1');
      fs.writeFileSync(path.join(templatePath, 't2.tmpl'), 't2');
      fs.writeFileSync(path.join(templatePath, 't3.tmpl'), 't3');

      swapm.reset();

      swapm.load(tmpPath, function() {
        var templates = swapm.getTemplates();

        assert.equal(templates['t1'], 't1');
        assert.equal(templates['t2'], 't2');
        assert.equal(templates['t3'], 't3');
        
        wrench.rmdirSyncRecursive(tmpPath);
        next();
      });
    });
  });

  describe('#process(src)', function() {
    it('should parse the template source block', function() {
      var text = "[@foo=[foo]=]";
      swapm.reset();
      swapm.process(text);
      var templates = swapm.getTemplates();
      assert.equal(templates['foo'], 'foo');
    });

    it('should parse the multi-line template source block', function() {
      var text = "\n[@foo=[\nfoo\n]=]\n";
      swapm.reset();
      swapm.process(text);
      var templates = swapm.getTemplates();
      assert.equal(templates['foo'], '\nfoo\n');
    });

    it('should parse data source blocks', function() {
      var text = " [#foo=[{ foo: 123 }]=] ";
      swapm.reset();
      swapm.process(text);
      var data = swapm.getData();
      assert.equal(data['foo'].foo, 123);
    });

    it('should parse multi-line data and source blocks', function() {
      var text = "[#foo=[{\n foo: 123,\nt: [1, 2, 3, 4]\n}]=]";
      swapm.reset();
      swapm.process(text);
      var data = swapm.getData();
      assert.equal(data['foo'].foo, 123);
    });

    it('should parse multi-line data & templates blocks with junk', function() {
      var text = "[df=[fdr\n[@bob=[hello]=] }=[dfjkdf-=3[\n\r[[#foo=[{\n foo: 123,\nt: [1, 2, 3, 4]\n}]=]}]]";
      swapm.reset();
      swapm.process(text);
      var data = swapm.getData();
      var templates = swapm.getTemplates();
      assert.equal(data['foo'].foo, 123);
      assert.equal(templates['bob'], 'hello')
    });

    // it('should inject the source block template', function() {
    //   var text = "[@my_template=[{{#items}}{{.}}{{/items}}]=]";
    //   swapm.reset();  
    //   swapm.process(text);

    //   var src = "// [=[template: 'my_template', data: { items:[1,2]}]=]\n// [=[end]=]";

    //   var res = swapm.process(src);

    // });

  });
});