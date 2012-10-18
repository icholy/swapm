# Swap (Not ready for the public yet)

> Code generation for the rest of us

## Example

**Source File:** `project/foo.h`

    #ifndef FOO_H_
    #define FOO_H_

    #include <libpq-fe.h>
    #include <libpqtypes.h>

    class Foo {
    private:
      /*{{template: "t1", data: "d1"}}*/

                          <-- generated code will go here

      /*{{end}}*/
    public:
      Foo(PGresult * res);
      virtual ~Foo();
    };

    #endif /* FOO_H_ */

**Data File:** `project/swap/data/d1.json`

    {
      stuff: [
        { name: "id", type: "int8"  },
        { name: "bar",type: "float4"}
      ]
    }

**Template File:** `project/swap/templates/t1.tmpl`

> Mustache templates are used by default, but the engine will be configurable :)  

    {{#stuff}}
      PG{{type}} * _{{name}};
    {{/stuff}}

## Generate

    swap foo.h

## Output

    #ifndef FOO_H_
    #define FOO_H_

    #include <libpq-fe.h>
    #include <libpqtypes.h>

    class Foo {
    private:
      /*{ template: "t1", data: "d1" }*/
      PGint8 * _id;
      PGfloat4 * _bar;
      /*{end}*/
    public:
      Foo(PGresult * res);
      virtual ~Foo();
    };

    #endif /* FOO_H_ */





