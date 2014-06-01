/*global describe, it, beforeEach*/


'use strict';


// stdlib
var path    = require('path');
var assert  = require('assert');


// internal
var Trail = require('../lib/hike/trail');


describe('Trail', function () {
  var trail;


  beforeEach(function () {
    trail = new Trail(path.join(__dirname, 'fixtures'));
    trail.paths.append('assets/css');
    trail.aliases.append('css', 'styl');
  });


  it('should find pathname respecting extension aliases', function () {
    assert.ok(trail.find('app.css'), 'Asset found');
  });
});
