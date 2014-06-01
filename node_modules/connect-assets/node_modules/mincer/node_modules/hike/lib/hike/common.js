'use strict';


// provides shortcut to define data property
module.exports.prop = function (obj, name, val) {
  Object.defineProperty(obj, name, {value: val});
};


// helper that stubs `obj` with methods throwing error when they are called
module.exports.stub = function (obj, methods, msg) {
  msg = !!msg ? (': ' + msg) : '';

  methods.forEach(function (func) {
    obj[func] = function () {
      throw new Error('Can\'t call `' + func + '()`' + msg);
    };
  });
};
