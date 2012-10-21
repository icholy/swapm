var fs     = require('fs');
var path   = require('path');
var wrench = require('wrench');
var assert = require('assert');
var swapm  = require('../lib/core');
var common = require('../lib/common');

describe('core', function() {
  describe('#load(dir, callback)', function() {
    it('should load the data file', function(next) {
      swapm.reset();
      
      var tmpPath = path.normalize('./test/tmp');
      var templatePath = path.join(tmpPath, 'swapm', 'templates');
      fs.mkdirSync(tmpPath);      
      
      common.initialize(tmpPath, false);

      fs.writeFileSync(path.join(templatePath, 't1.tmpl'), 't1');
      fs.writeFileSync(path.join(templatePath, 't2.tmpl'), 't2');
      fs.writeFileSync(path.join(templatePath, 't3.tmpl'), 't3');


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

    beforeEach(function() {
      swapm.reset();
    });

    it('should parse the template source block', function() {
      var text = "[@foo=[foo]=]";
      swapm.process(text, false);
      var templates = swapm.getTemplates();
      assert.equal(templates['foo'], 'foo');
    });

    it('should parse the multi-line template source block', function() {
      var text = "\n[@foo=[\nfoo\n]=]\n";
      swapm.process(text, false);
      var templates = swapm.getTemplates();
      assert.equal(templates['foo'], '\nfoo\n');
    });

    it('should parse data source blocks', function() {
      var text = " [#foo=[{ foo: 123 }]=] ";
      swapm.process(text, false);
      var data = swapm.getData();
      assert.equal(data['foo'].foo, 123);
    });

    it('should parse multi-line data and source blocks', function() {
      var text = "[#foo=[{\n foo: 123,\nt: [1, 2, 3, 4]\n}]=]";
      swapm.process(text, false);
      var data = swapm.getData();
      assert.equal(data['foo'].foo, 123);
    });

    it('should parse multi-line data & templates blocks with junk', function() {
      var text = "[df=[fdr\n[@bob=[hello]=] }=[dfjkdf-=3[\n\r[[#foo=[{\n foo: 123,\nt: [1, 2, 3, 4]\n}]=]}]]";
      swapm.process(text, false);
      var data = swapm.getData();
      var templates = swapm.getTemplates();
      assert.equal(data['foo'].foo, 123);
      assert.equal(templates['bob'], 'hello')
    });

    it('should inject the result on its own line', function() {
      var text = "[@my_template=[{{#items}}{{.}}{{/items}}]=]";
      swapm.process(text, false);
      var src = "//[=[template: 'my_template', data:{items:[1,2]}]=]\n//[=[end]=]";
      var res = swapm.process(src, false);
      assert.equal(res, "//[=[template: 'my_template', data:{items:[1,2]}]=]\n12\n//[=[end]=]")
    });

    it('should inject the result on its own line when there is already data', function() {
      var text = "[@my_template=[{{#items}}{{.}}{{/items}}]=]";
      swapm.process(text, false);
      var src = "//[=[template: 'my_template', data:{items:[1,2]}]=]\n\n\n\n\n\n/* [=[end]=] */";
      var res = swapm.process(src, false);
      assert.equal(res, "//[=[template: 'my_template', data:{items:[1,2]}]=]\n12\n/* [=[end]=] */")
    });

    it('should handle multiline injection tags', function() {
      var text = "[@my_template=[{{#items}}{{.}}{{/items}}]=]";
      swapm.process(text, false);
      var src = "//[=[template: 'my_template', data:{\n\titems:[1,2]\n}]=]\n\n\n\n\n\n/* [=[end]=] */";
      var res = swapm.process(src, false);
      assert.equal(res, "//[=[template: 'my_template', data:{\n\titems:[1,2]\n}]=]\n12\n/* [=[end]=] */")
    });

    it('should throw an exception when open and close inj tags are on the same line', function() {
      var text = "[@my_template=[hello]=][=[template: 'my_template', data: {}]=] [=[end]=]"
      assert.throws(function() {
        swapm.process(text);
      });
    });

    it('should work with an empty template', function() {
      var text = "[@foo=[]=] [=[template: 'foo', data: {}]=]\n[=end=]";
      var res = swapm.process(text);
      assert.equal(res, "[@foo=[]=] [=[template: 'foo', data: {}]=]\n[=end=]");
    });

    it('should throw an exception when an end tag is found with no open tag', function() {
      var text = "[=[end]=]";
      assert.throws(function(){
        swapm.process(text, false);
      });
    });

    it('should throw an exception when an open inj tag is found with no close tag', function() {
      var text = "[=[template: 'foo', data: 'foo']=]";
      assert.throws(function(){
        swapm.process(text, false);
      });
    });

    it('should throw an exception when an open & close inj tags are out of order', function() {
      var text = "[=[end]=] \n\n [=[template: 'foo', data: 'foo']=]";
      assert.throws(function(){
        swapm.process(text, false);
      });
    });

    it('should throw an exception when open inj tag does not have a data parameter', function() {
      var text = "[=[template: 'foo']=]\n\n[=[end]=]";
      assert.throws(function(){
        swapm.process(text, false);
      });
    });

    it('should throw an exception when open inj tag does not have a template parameter', function() {
      var text = "[=[data: 'foo']=]\n\n[=[end]=]";
      assert.throws(function(){
        swapm.process(text, false);
      });
    });

    it('should throw an exception when another open inj tag is found before the last one is closed', function() {
      var text = "[=[data: 'foo', template: 'foo']=]\n\n[=[data: 'foo', template: 'foo']=]";
      assert.throws(function(){
        swapm.process(text, false);
      });
    });

    it('should throw an exception when finding a dangling tag delimiter', function() {
      var text = "[=[data: 'foo', template: 'foo']=]\n\n[=[end]=]";
      assert.throws(function(){
        swapm.process(text + " [=[", false);
      });
      assert.throws(function(){
        swapm.process(text + " ]=]", false);
      });
    });

    it('should throw an exception when trying to add a template with an existing name', function() {
      var text = "[@my_template=[{{foo}}]=]";
      swapm.process(text, false);
      assert.throws(function() {
        swapm.process(text, false);
      });
    });

    it('should throw an exception when trying to add data with an existing name', function() {
      var text = "[#my_template=[{foo:123}]=]";
      swapm.process(text, false);
      assert.throws(function() {
        swapm.process(text, false);
      });
    });

    it('show throw an exception when trying to use a block template from another file', function() {
      var file1Text = "[@foo=[\ntest\n]=]";
      var file2Text = "[=[template:'foo', data: {}]=]";

      swapm.process(file1Text);

      assert.throws(function() {
        swapm.process(file2Text);
      });
    });

  });
});