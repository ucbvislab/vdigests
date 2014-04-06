/**
 * Main function to kick off the app, set to data-main with require.js
 */

/*global requirejs */

// configure require.js
requirejs.config({
  baseUrl: "resources/js",
  paths: {
    jquery:"lib/jquery-1.11.0.min",
    jqueryui: "lib/jquery-ui-1.10.4.min",
    underscore: "lib/underscore-min",
    backbone: "lib/backbone-min",
    jqueryScrollTo: "lib/jquery.scrollTo",
    canvas2Image: "lib/canvas2image",
    text: "lib/text"
  },
  shim: {
    underscore: {
      exports: "_"
    },
    jqueryui: ['jquery'],
    jqueryScrollTo: {
      deps: ['jquery']
    },
    backbone: {
      deps: ['underscore', 'jquery'],
      exports: 'Backbone'
    }
  },
  waitSeconds: 15
});

// launch the main application (start the router)
requirejs(["jquery", "underscore", "backbone", "editing-interface/routers/router", "jqueryScrollTo", "jqueryui"], function ($, _, Backbone, AppRouter) {
  "use strict";
  console.log("started main");
  var appRouter = new AppRouter();
  // FIXME HACK for video count
  window.vct = 0;

  Backbone.history.start();

  // keep body size to the size of the viewport
  var $body = $(document.body);
  var setBodyHeight = function (inHeight) {
    $body.height(inHeight);
  };
  var $window = $(window);
  $window.resize(function () {
    setBodyHeight($window.height());
  });
  setBodyHeight($window.height());

});
