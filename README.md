# Swapm

> Code generation for the rest of us

## Features

* Language agnostic ( assuming /* comment syntax */ )
* [Mustache](https://github.com/janl/mustache.js) Templates + JSON
* Very simple to integrate

## Install

    npm install -g swapm

## Example

**Initialize Project**

    cd project/
    swapm --init

this will create a `project/swapm` directory where your data & templates live.

**Source File:** `project/foo.h`

    #ifndef FOO_H_
    #define FOO_H_

    #include <libpq-fe.h>
    #include <libpqtypes.h>

    /*{{template: "foo_sql", data: "my_data"}}*/

                              <-- generated code will go here

    /*{{end}}*/

    class Foo {
    private:
      /*{{template: "foo_members", data: "my_data"}}*/  

                              <-- and here

      /*{{end}}*/
    public:
      Foo(PGresult * res);
      virtual ~Foo();
    };

    #endif /* FOO_H_ */

**Data File:** `project/swapm/data/my_data.json`

    {
      stuff: [
        { name: "id", type: "int8"  },
        { name: "bar",type: "float4"}
      ],
      pgType: function() {
        return ["\tPG", this.type, " * _", this.name, ";"].join('');
      }
    }

**Template 1:** `project/swapm/templates/foo_members.tmpl`

    {{#stuff}}
      PG{{type}} * _{{name}};
    {{/stuff}}

this will have the same result

    {{#stuff}}
      {{pgType}}
    {{/stuff}}

**Template 2** `project/swapm/templates/foo_sql.tmpl`

    #define QUERY "SELECT {{#stuff}}{{name}}{{^last}}, {{/last}}{{/stuff}} FROM my_table"

## Generate

    swapm *.h

## Output

    #ifndef FOO_H_
    #define FOO_H_

    #include <libpq-fe.h>
    #include <libpqtypes.h>

    /*{{template: "foo_sql", data: "my_data"}}*/
    #define QUERY "SELECT id, bar FROM my_table"
    /*{{end}}*/

    class Foo {
    private:

    /*{{template: "foo_members", data: "my_data"}}*/
        PGint8 * _id;
        PGfloat4 * _bar;
    /*{{end}}*/
    public:
      Foo(PGresult * res);
      virtual ~Foo();
    };

    #endif /* FOO_H_ */





