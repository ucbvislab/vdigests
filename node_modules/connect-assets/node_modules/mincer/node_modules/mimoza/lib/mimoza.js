'use strict';


var path  = require('path');
var fs    = require('fs');


// leaves only extension from the given string
//   normalize('foo/bar.js')  // -> '.js'
//   normalize('bar.js')      // -> '.js'
//   normalize('.js')         // -> '.js'
//   normalize('js')          // -> '.js'
function normalize(extension) {
  extension = 'prefix.' + path.basename(extension);
  return path.extname(extension).toLowerCase();
}


// merges two or more objects
function merge() {
  var args = Array.prototype.slice.call(arguments), dst, src;

  // copy descriptor from src to dst
  function copyDescriptor(name) {
    var descriptor = Object.getOwnPropertyDescriptor(src, name);
    Object.defineProperty(dst, name, descriptor);
  }

  dst = args.shift() || {};

  while (args.length) {
    src = args.shift();
    if (src) {
      Object.getOwnPropertyNames(src).forEach(copyDescriptor);
    }
  }

  return dst;
}


/**
 *  new Mimoza([options])
 *
 *  Initiates new instance of Mimoza.
 *
 *  ##### Options
 *
 *  - **normalize** _(Function):_ Function used to normalize pathnames.
 *  - **defaultType** _(String):_ Default mime type used as last-resort
 *    for [[Mimoza#getMimeType]]. By default: `undefined`.
 *
 *  ##### Normalization
 *
 *  By default, normalization tries to guess the input and alwasy returns
 *  an extension string:
 *
 *      mime.normalize('foo/bar.js')  // -> '.js'
 *      mime.normalize('bar.js')      // -> '.js'
 *      mime.normalize('.js')         // -> '.js'
 *      mime.normalize('js')          // -> '.js'
 **/
var Mimoza = module.exports = function Mimoza(options) {
  options = merge(
    {normalize: normalize},
    ('object' === typeof options) ? options : {defaultType: options}
  );

  /*[nodoc]* internal
   *  Mimoza#types -> Object
   *
   *  Map of `extension -> mimeType` pairs.
   **/
  Object.defineProperty(this, 'types',        {value: Object.create(null)});


  /*[nodoc]* internal
   *  Mimoza#extensions -> Object
   *
   *  Map of `mimeType -> extensions` pairs.
   **/
  Object.defineProperty(this, 'extensions',   {value: Object.create(null)});


  /*[nodoc]* internal
   *  Mimoza#normalize(str) -> String
   *
   *  Extension normalization function.
   **/
  Object.defineProperty(this, 'normalize',    {value: options.normalize});


  /*[nodoc]* internal
   *  Mimoza#defaultType -> String
   *
   *  Used as last-resort for [[Mimoza#getMimeType]].
   **/
  Object.defineProperty(this, 'defaultType',  {value: options.defaultType});
};


/**
 *  Mimoza#define(map) -> Void
 *
 *  Batch version of [[Mimoza#register]].
 *
 *  ##### Example
 *
 *      mime.define({
 *        'audio/ogg':  ['oga', 'ogg', 'spx'],
 *        'audio/webm': ['weba']
 *      });
 *
 *      // equals to:
 *
 *      mime.register('audio/ogg', ['oga', 'ogg', 'spx']);
 *      mime.register('audio/webm', ['weba']);
 **/
Mimoza.prototype.define = function define(map) {
  Object.getOwnPropertyNames(map).forEach(function (type) {
    this.register(type, map[type]);
  }, this);
};


/**
 *  Mimoza#register(mimeType, extensions[, overrideDefault = false]) -> Void
 *  - mimeType (String):
 *  - extensions (String|Array):
 *  - overrideDefault (Boolean):
 *
 *  Register given `extensions` as representatives of `mimeType` and register
 *  first element of `extensions` as default extension for the `mimeType`.
 *
 *
 *  ##### Example
 *
 *      mime.register('audio/ogg', ['oga', 'ogg', 'spx']);
 *
 *      mime.getMimeType('.oga');       // -> 'audio/ogg'
 *      mime.getMimeType('.ogg');       // -> 'audio/ogg'
 *      mime.getExtension('audio/ogg'); // -> '.oga'
 *
 *
 *  ##### Overriding default extension
 *
 *  `mimeType -> extension` is set only once, if you wnt to override it,
 *  pass `overrideDefault` flag as true. See example below:
 *
 *      mime.register('audio/ogg', ['oga']);
 *      mime.getExtension('audio/ogg');
 *      // -> '.oga'
 *
 *      mime.register('audio/ogg', ['spx']);
 *      mime.getExtension('audio/ogg');
 *      // -> '.oga'
 *
 *      mime.register('audio/ogg', ['ogg'], true);
 *      mime.getExtension('audio/ogg');
 *      // -> '.ogg'
 **/
Mimoza.prototype.register = function register(mimeType, extensions, overrideDefault) {
  extensions = Array.isArray(extensions) ? extensions : [extensions];

  if (!mimeType || !extensions || 0 === extensions.length) {
    return;
  }

  // pollute `extension -> mimeType` map
  extensions.forEach(function (ext) {
    this.types[this.normalize(ext)] = mimeType;
  }, this);


  if (overrideDefault || undefined === this.extensions[mimeType]) {
    this.extensions[mimeType] = this.normalize(extensions[0]);
  }
};


/**
 *  Mimoza#loadFile(file) -> Void
 *
 *  Load an Apache2-style ".types" file
 *
 *  This may be called multiple times (it's expected).
 *  Where files declare overlapping types/extensions, the last one wins.
 **/
Mimoza.prototype.loadFile = function loadFile(file) {
  // Read file and split into lines
  var content = fs.readFileSync(file, 'ascii');

  content.split(/[\r\n]+/).forEach(function(line) {
    // TODO: fix this buggy RegExp as it produce lots of "empty" data
    // Clean up whitespace/comments, and split into fields
    var fields = line.replace(/\s*#.*|^\s*|\s*$/g, '').split(/\s+/);
    this.register(fields.shift(), fields);
  }, this);
};


/**
 *  Mimoza#getMimeType(path[, fallback]) -> String
 *
 *  Lookup a mime type based on extension
 **/
Mimoza.prototype.getMimeType = function getMimeType(path, fallback) {
  return this.types[this.normalize(path)] || fallback || this.defaultType;
};


/**
 *  Mimoza#getExtension(mimeType) -> String
 *
 *  Return file extension associated with a mime type.
 **/
Mimoza.prototype.getExtension = function getExtension(mimeType) {
  return this.extensions[mimeType];
};


// builtin instance of mimoza
var builtin = new Mimoza();


// Load local copy of
// http://svn.apache.org/repos/asf/httpd/httpd/trunk/docs/conf/mime.types
builtin.loadFile(path.join(__dirname, '../types/mime.types'));


// Load additional types from node.js community
builtin.loadFile(path.join(__dirname, '../types/node.types'));


/**
 *  Mimoza.getMimeType(path, fallback) -> String
 *
 *  Proxy to [[Mimoza#getMimeType]] of internal, built-in instance of [[Mimoza]]
 *  filled with some default types.
 **/
Mimoza.getMimeType = function getMimeType(path, fallback) {
  return builtin.getMimeType(path, fallback);
};


/**
 *  Mimoza.getExtension(mimeType) -> String
 *
 *  Proxy to [[Mimoza#getExtension]] of internal, built-in instance of [[Mimoza]]
 *  filled with some default types.
 **/
Mimoza.getExtension = function getExtension(mimeType) {
  return builtin.getExtension(mimeType);
};
