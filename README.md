# Swap'Em [![Build Status](https://travis-ci.org/icholy/swapms.png?branch=master)](https://travis-ci.org/icholy/swapms)

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
* The syntax used to comment out a tag cannot be on its own line.

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

# Warning

this is a work in progress and it might eat your code.
