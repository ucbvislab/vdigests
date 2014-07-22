
/**
 * Main function to kick off the app, set to data-main with require.js
 */

/*global requirejs */

// configure require.js
requirejs.config({
  baseUrl: "/js",
  paths: {
    jquery:"lib/jquery-1.11.0.min",
    underscore: "lib/underscore-min",
    backbone: "lib/backbone-min",
    canvas2Image: "lib/canvas2image",
    text: "lib/text",
    jquerySmoothScroll: "lib/jquery.smooth-scroll",
    jscrollpane: "lib/jquery.jscrollpane.min",
    filesaver: "lib/FileSaver",
    jmousewheel: "lib/jquery.mousewheel",
    jform: "lib/jquery.form.min",
    toastr: "lib/toastr",
    jmenu: "lib/jquery.contextmenu"
  },
  shim: {
    jmenu: ["jquery"],
    jmousewheel: ["jquery"],
    jform: ["jquery"],
    filesaver: {
      exports: ["saveAs", "Blob"]
    },
    jscrollpane: ["jquery", "jmousewheel"],
    underscore: {
      exports: "_"
    },
    jquerySmoothScroll: {
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
requirejs(["jquery", "underscore", "backbone", "editing-interface/routers/router", "editing-interface/utils/utils", "editing-interface/utils/player", "jquerySmoothScroll", "jscrollpane", "jmousewheel", "filesaver", "jform", "jmenu"],
          function ($, _, Backbone, AppRouter, Utils, Player) {
            "use strict";

            // set jquery csrf token
            var csrftoken = Utils.getCookie("csrftoken");
            function csrfSafeMethod(method) {
              // these HTTP methods do not require CSRF protection
              return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
            }
            $.ajaxSetup({
              beforeSend: function(xhr, settings) {
                if (!csrfSafeMethod(settings.type)) {
                  xhr.setRequestHeader("X-CSRFToken", window._csrf);
                }
              }
            });

            // setup YouTube object
            window.toLoadPlayers = [];
            $.getScript('//www.youtube.com/iframe_api');
            window.onYouTubeIframeAPIReady = function() {
              _.each(window.toLoadPlayers, function (pargs) {
                Player.loadPlayer.apply(this, pargs);
              });
            };

            var appRouter = new AppRouter();
            // FIXME HACK for video count
            window.vct = 0;

            Backbone.history.start();

            // pull in the youtube api

            // keep body size to the size of the viewport
            var $body = $(window.body),
                $maincon= $("#main-container");
            var setMCHeight = function (inHeight) {
              $maincon.height(inHeight);
            };
            var setBodyHeight = function (inHeight) {
              $body.height(inHeight);
            };
            var $window = $(window),
                navHeight = $(".navbar").eq(0).height();

            $window.resize(function () {
              setMCHeight($window.height() - navHeight);
              setBodyHeight($window.height());
            });
            setMCHeight($window.height() - navHeight);
            setBodyHeight($window.height());
            if (window.onbeforeunload !== null) {
              window.onbeforeunload = function () {
                return "are you finished creating a digest?";
              };
            }

            // USE STATS collection for interface study
            window.vdstats = {
              nChapCreation: [],
              nSecCreation: [],
              nChapDeletion: [],
              nSecDeletion: [],
              nChapMoves: [],
              nSecMoves: [],
              nSec2Chap: [],
              nChap2Sec: [],
              nKeyFrameChanges: [],
              nVideoStartsFromTrans: [],
              nVideoStartsFromVideo: [],
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
          }
         );
