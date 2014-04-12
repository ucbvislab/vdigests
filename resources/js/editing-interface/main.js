/**
 * Main function to kick off the app, set to data-main with require.js
 */

/*global requirejs */

// configure require.js
requirejs.config({
  baseUrl: "resources/js",
  paths: {
    jquery:"lib/jquery-1.11.0.min",
    underscore: "lib/underscore-min",
    backbone: "lib/backbone-min",
    jqueryScrollIntoView: "lib/jquery.scrollintoview",
    canvas2Image: "lib/canvas2image",
    text: "lib/text",
    jscrollpane: "lib/jquery.jscrollpane.min",
    filesaver: "lib/FileSaver",
    jmousewheel: "lib/jquery.mousewheel"
  },
  shim: {
  jmousewheel: ["jquery"],
  filesaver: {
    exports: ["saveAs", "Blob"]
  },
  jscrollpane: ["jquery", "jmousewheel"],
    underscore: {
      exports: "_"
    },
    jqueryScrollIntoView: {
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
requirejs(["jquery", "underscore", "backbone", "editing-interface/routers/router", "jqueryScrollIntoView", "jscrollpane", "jmousewheel", "filesaver"], function ($, _, Backbone, AppRouter) {
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
  window.onbeforeunload = function () {
    return "are you finished creating a digest?";
  };

  // USE STATS collection for interface study
  window.vdstats = {
    nChapCreation: [], // done
    nSecCreation: [], // done
    nChapDeletion: [],  // done
    nSecDeletion: [],  // done
    nChapMoves: [], // done
    nSecMoves: [], // done
    nSec2Chap: [], // done
    nChap2Sec: [], // done
    nKeyFrameChanges: [], // done
    nVideoStartsFromTrans: [], // done
    nVideoStartsFromVideo: [], // done
    nSummaryEdits: [],
    nSubtitleEdits: []
  };
  var lastTime = (new Date()).getTime();
  $(window).on("keyup", function (e) {
    if (e.keyCode == 119) {
      alert("elapsed seconds: " + ((new Date()).getTime() - lastTime)/1000);
      // lastTime = (new Date()).getTime();
    } else if (e.keyCode == 120) {
      // export the user stats
      window.vdstats.compTime = ((new Date()).getTime() - lastTime)/1000;
      var blob = new window.Blob([window.JSON.stringify(window.vdstats)], {type: "text/plain;charset=utf-8"});
      window.saveAs(blob, "use-stats.json");
    }
  });

  var saveToLocalStorage = function () {
     window.setTimeout(function () {
       var jvd = window.JSON.stringify(window.vdstats),
           jdm = window.JSON.stringify(window.editorModel.getOutputJSON());
       window.localStorage["vdstats"] = jvd;
       window.localStorage["editorData"] = jdm;
       console.log("saved to local");
     }, 30000);
  };

  saveToLocalStorage();

});
