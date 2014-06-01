hike
====

[![Build Status](https://secure.travis-ci.org/nodeca/hike-js.png?branch=master)](http://travis-ci.org/nodeca/hike-js)

Javascript port of [Hike (Ruby)][hike] - a library for finding files in a set
of paths. Use it to implement search paths, load paths, and the like.

See [API docs][apidoc] for details on methods.


Examples
--------

Find JavaScript files in this project:

    trail = new hike.Trail("/home/ixti/Projects/hike-js");
    trail.extensions.append(".js");
    trail.paths.append("lib", "test");

    trail.find("hike/trail");
    # => "/home/ixti/Projects/hike-js/lib/hike/trail.js"

    trail.find("test_trail");
    # => "/home/ixti/Projects/hike-js/test/test_trail.rb"

Explore your shell path:

    trail = new hike.Trail("/");
    trail.paths.append(process.env.PATH.split(":"));

    trail.find("ls");
    # => "/bin/ls"

    trail.find("gem");
    # => "/home/ixti/.rvm/rubies/ruby-1.9.2-p290/bin/gem"


Installation
------------

    $ npm install hike


License
-------

Copyright (c) 2012 Vitaly Puzrin

Released under the MIT license. See [LICENSE][license] for details.


[hike]:     https://github.com/sstephenson/hike/
[apidoc]:   http://nodeca.github.com/hike-js/
[license]:  https://raw.github.com/nodeca/hike-js/master/LICENSE
