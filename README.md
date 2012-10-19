# Swapm

> Code generation for the rest of us

## Features

* Language agnostic
* [Mustache](https://github.com/janl/mustache.js) Templates + JSON
* Inline templates & data
* Simple project integration

## Install

    npm install -g swapm

## Initialize Project

    cd project/
    swapm --init

this will create a `project/swapm` directory where your data & templates live.

## Injection

An injection point consists of an open and close tag.
The open tag must state the template and data to use.

    [=[template: "template_name", data: "data_name"]=]

    [=[end]=]

* The template is rendered and injected between the two tags.
* Injection tags can span multiple lines. 
* The syntax used to comment out a tag cannot be on their own line.

### Good

    /* [=[template: "foo", data:{
      baz: "hello world"
    }]=] */

    // [=[end]=]

### Bad

    /*
    [=[template: "foo", data:{
      baz: "hello world"
    }]=]
     */ <-- this will get cut
    
    /* <-- this too
    [=[end]=]
    */
   
## Data

* All data is in JSON format. 
* There are three ways to define data.

### Inline

    [=[template: "my_template", data:{
      foo: "bar",
      bar: [1, 2, 3, 4]
    }]=]

    [=[end]=]

### Source block

    [#my_data=[{
      foo: "bar",
      bar: [1, 2, 3, 4]
    }]=]

### Json file

**File:** `project/swapm/data/my_data.json`

    {
      foo: "bar",
      bar: [1, 2, 3, 4]
    }

## Templates

* Mustache is the templating engine used.
* There are two ways of defining a template

### Source block

    [@my_template=[
      Foo: {{foo}}
      Bars: {{#bar}}{{.}}{{/bar}}
    ]=]

### .tmpl file

**File:** `project/swapm/templates/my_template.tmpl`

    Foo: {{foo}}
    Bars: {{#bar}}{{.}}{{/bar}}

### Computed Properties

This is a mustache feature but it's essential to know when using swapm.

    /*
    
    [#foo_data=[{
      items: [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
        { a: 5, b: 6 }
      ],
      addAtoB: function() {
        return this.a + this.b;
      }
    }]=]

    [@foo_tmpl=[
      {{#items}}
        Sum: {{addAtoB}}
      {{/items}}
    ]=]
    
    */

    // [=[template: "foo_tmpl", data: "foo_data"]=]
    
    // [=[end]=]

## Example

**Source File:** `project/foo.h`

    #ifndef FOO_H_
    #define FOO_H_

    #include <libpq-fe.h>
    #include <libpqtypes.h>

    /*
    [@foo_mysql=[
    #define QUERY "SELECT {{#stuff}}{{name}}{{^last}}, {{/last}}{{/stuff}} FROM my_table"
    ]=]
    */

    // [=[template: "foo_sql", data: "my_data"]=]

    // [=[end]=]

    class Foo {
    private:

    // [=[template: "foo_members", data: "my_data"]=]

    // [=[end]=]

    public:
      Foo(PGresult * res);
      virtual ~Foo();
    };

    #endif /* FOO_H_ */

**Data File:** `project/swapm/data/my_data.json`

    {
      stuff: [
        { name: "id", type: "int8"  },
        { name: "bar",type: "float4", last: true }
      ],
      pgType: function() {
        return ["\tPG", this.type, " * _", this.name, ";"].join('');
      }
    }

**Template:** `project/swapm/templates/foo_members.tmpl`

    {{#stuff}}
      PG{{type}} * _{{name}};
    {{/stuff}}

this will have the same result

    {{#stuff}}
      {{pgType}}
    {{/stuff}}

### Generate

    swapm *.h

### Output

    #ifndef FOO_H_
    #define FOO_H_

    #include <libpq-fe.h>
    #include <libpqtypes.h>

    /*
    [@foo_mysql=[
    #define QUERY "SELECT {{#stuff}}{{name}}{{^last}}, {{/last}}{{/stuff}} FROM my_table"
    ]=]
    */

    // [=[template: "foo_sql", data: "my_data"]=]

    #define QUERY "SELECT id, bar FROM my_table"

    // [=[end]=]

    class Foo {
    private:

    // [=[template: "foo_members", data: "my_data"]=]
    
        PGint8 * _id;
        PGfloat4 * _bar;

    // [=[end]=]

    public:
      Foo(PGresult * res);
      virtual ~Foo();
    };

    #endif /* FOO_H_ */
