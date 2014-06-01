/**
 *  class Trail
 *
 *  Public container class for holding paths and extensions.
 **/


'use strict';


// stdlib
var path = require('path');


// internal
var Index = require('./index');
var Paths = require('./paths');
var Extensions = require('./extensions');
var Aliases = require('./aliases');
var prop = require('./common').prop;


// internal helper that makes function proxies to index methods
function index_proxy(proto, func) {
  proto[func] = function () {
    var index = this.index;
    return index[func].apply(index, arguments);
  };
}

/**
 *  new Trail(root = '.')
 *
 *  A Trail accepts an optional root path that defaults to your
 *  current working directory. Any relative paths added to
 *  [[Trail#paths]] will expanded relative to the root.
 **/
var Trail = module.exports = function Trail(root) {
  /** internal, read-only
   *  Trail#root -> String
   *
   *  Root path. This attribute is immutable.
   **/
  prop(this, 'root', path.resolve(root || '.'));

  /**
   *  Trail#paths -> Paths
   *
   *  Mutable [[Paths]] collection.
   *
   *      trail = new Trail();
   *      trail.paths.append("/home/ixti/Projects/hike/lib",
   *                         "/home/ixti/Projects/hike/test");
   *
   *  The order of the paths is significant. Paths in the beginning of
   *  the collection will be checked first. In the example above,
   *  `/home/ixti/Projects/hike/lib/hike.rb` would shadow the existent of
   *  `/home/ixti/Projects/hike/test/hike.rb`.
   **/
  prop(this, 'paths', new Paths(this.root));

  /**
   *  Trail#extensions -> Extensions
   *
   *  Mutable [[Extensions]] collection.
   *
   *      trail = new Trail();
   *      trail.paths.append("/home/ixti/Projects/hike/lib");
   *      trail.extensions.append(".rb");
   *
   *  Extensions allow you to find files by just their name omitting
   *  their extension. Is similar to Ruby's require mechanism that
   *  allows you to require files with specifiying `foo.rb`.
   **/
  prop(this, 'extensions', new Extensions());

  /**
   *  Trail#aliases -> Aliases
   *
   *  Mutable mapping of an extension aliases.
   *
   *      trail = new Trail();
   *      trail.paths.append("/home/ixti/Projects/hike/site");
   *      trail.aliases.append('html', ['.htm', '.xhtml', '.php']);
   *
   *  Aliases provide a fallback when the primary extension is not
   *  matched. In the example above, a lookup for "foo.html" will
   *  check for the existence of "foo.htm", "foo.xhtml", or "foo.php".
   **/
  prop(this, 'aliases', new Aliases());
};


/**
 *  Trail#index -> Index
 *
 *  Returns an [[Index]] object that has the same interface as [[Trail]].
 *  An [[Index]] is a cached [[Trail]] object that does not update when
 *  the file system changes. If you are confident that you are not making
 *  changes the paths you are searching, `index` will avoid excess system
 *  calls.
 *
 *      index = trail.index;
 *      index.find("hike/trail");
 *      index.find("test_trail");
 **/
Object.defineProperty(Trail.prototype, 'index', {
  get: function () {
    return new Index(this.root, this.paths, this.extensions, this.aliases);
  }
});


/**
 *  Trail#find(logical_paths[, options][, fn]) -> String
 *  - logical_paths (String|Array): One or many (fallbacks) logical paths.
 *  - options (Object): Options hash. See description below.
 *  - fn (Function): Block to execute on each matching path. See description below.
 *
 *  Returns the expanded path for a logical path in the path collection.
 *
 *      trail = new Trail("/home/ixti/Projects/hike-js");
 *
 *      trail.extensions.append(".js");
 *      trail.paths.append("lib", "test");
 *
 *      trail.find("hike/trail");
 *      // -> "/home/ixti/Projects/hike-js/lib/hike/trail.js"
 *
 *      trail.find("test_trail");
 *      // -> "/home/ixti/Projects/hike/test/test_trail.js"
 *
 *  `find` accepts multiple fallback logical paths that returns the
 *  first match.
 *
 *      trail.find(["hike", "hike/index"]);
 *
 *  is equivalent to
 *
 *      trail.find("hike") || trail.find("hike/index");
 *
 *  Though `find` always returns the first match, it is possible
 *  to iterate over all shadowed matches and fallbacks by supplying
 *  a _block_ function (`fn`).
 *
 *      trail.find(["hike", "hike/index"], function (path) {
 *        console.warn(path);
 *      });
 *
 *  This allows you to filter your matches by any condition.
 *
 *      trail.find("application", function (path) {
 *        if ("text/css" == mime_type_for(path)) {
 *          return path;
 *        }
 *      });
 *
 *
 *  ##### Options
 *
 *  - **basePath** (String): You can specify "alternative" _base path_ to be
 *    used upon searching. Default: [[Trail#root]].
 *
 *  ##### Block function
 *
 *  Some kind of iterator that is called on each matching pathname. Once this
 *  function returns anything but `undefned` - iteration is stopped and the
 *  value of this function returned.
 *
 *  Default:
 *
 *      function (path) { return path; }
 **/
index_proxy(Trail.prototype, 'find');


/**
 *  Trail#entries(pathname) -> Array
 *
 *  Wrapper over [[Index#entries]] using one-time instance of [[Trail#index]].
 **/
index_proxy(Trail.prototype, 'entries');


/**
 *  Trail#stat(pathname) -> Stats|Null
 *
 *  Wrapper over [[Index#stat]] using one-time instance of [[Trail#index]].
 **/
index_proxy(Trail.prototype, 'stat');
