
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/output-digest-template.html", "editing-interface/utils/player"], function (Backbone, _, $, tmpl, Player) {
  return Backbone.View.extend({
    template: _.template(tmpl),
    events: {
      // listen for click events on sections, hover events on images
      // listen for video time changes and update the sections accordingly
    },
    className: "output-digest",
    render: function () {
      var thisView = this;
      thisView.rendered = false;
      thisView.$el.html(thisView.template(thisView.model.attributes));
      // now insert the youtube videos
      thisView.vplayers = {};
      var $vids = thisView.$el.find(".video-wrap"),
          nvids = $vids.length;
      var inputVid = function (vel, startTime) {
        Player.inputVideo(vel, "usdJgEwMinM", thisView.vplayers, startTime);
      };
      var lastEl = 0,
          siid = window.setInterval(function () {
        if (lastEl < nvids){
          inputVid($vids[lastEl], Math.floor(Number($vids.eq(lastEl).parent().parent().data("start"))));
          lastEl += 1;
        } else {
          window.clearInterval(siid);
        }
      }, 100);

      $vids.each(function (i, vel) {

      });
      // TODO add a proper loading screen
      var thisInterval = window.setInterval(function () {
        if (Object.keys(thisView.vplayers).length >= nvids) {
          window.clearInterval(thisInterval);
          thisView.rendered = true;
          thisView.addVPlayerEvents();
        }
      }, 100);

      return thisView;
    },

    addVPlayerEvents: function () {
      var thisView = this;
      console.log( "adding vplayer events" );

      // listen for state changes
      _.each(thisView.vplayers, function (vp) {
        vp.addEventListener("onStateChange", function (stobj) {
          if (stobj.data === 1) {
            // playing a each
            _.each(thisView.vplayers, function (vpe) {
              if (stobj.target != vpe) {
                vpe.stopVideo();
              }
            });
          }
        });
      });

      // monitor the current playing time of the currently playing video
      // play/focus-on the appropriate chapter for the given playing time
      if (thisView.checkPlayInterval) {window.clearInterval(thisView.checkPlayInterval);}
      // TODO is there a better way to do this?
      var curPlaying = null,
          curPlayEnd = Infinity,
          curPlayStart = 0;
      thisView.checkPlayInterval = window.setInterval(function () {
        if (curPlaying && curPlaying.getPlayerState() === 1) {
          var curTime = curPlaying.getCurrentTime();
          if ( curTime > curPlayEnd || curTime < curPlayStart) {
            // start the next video if it exists
            var nextVP = null,
                curNextEndTime = Infinity,
                curNextStartTime = 0,
                isEarly = curTime < curPlayStart;
            _.each(thisView.vplayers, function (vpe) {
              var gp = vpe.a.parentElement.parentElement,
                  endTime = Number(gp.getAttribute("data-end")),
                  startTime = Number(gp.getAttribute("data-start"));
              if ((isEarly && curTime > startTime && startTime >= curNextStartTime)
                  || (!isEarly && curTime < endTime && (endTime <= curNextEndTime))) {
                nextVP = vpe;
                curNextEndTime = endTime;
                curNextStartTime = startTime;
              }
            });
            if (nextVP) {
              curPlaying.pauseVideo();
              curPlaying = nextVP;
              curPlayStart = curNextStartTime;
              curPlayEnd = curNextEndTime;
              curPlaying.seekTo(curTime - 0.1, true);
              $.smoothScroll($(curPlaying.a.parentElement).offset().top - 300);
              //curPlaying.playVideo();
              window.setTimeout(function () {
                curPlaying.playVideo();
              }, 100);
            }
          }
          // check if it's exceeded it's playing time and find the next video
          var x = 5;
        } else {
          _.each(thisView.vplayers, function (vp) {
            if (vp.getPlayerState && vp.getPlayerState() === 1) {
              curPlaying = vp;
              var gpEl = curPlaying.a.parentElement.parentElement;
              curPlayEnd = gpEl.getAttribute("data-end");
              curPlayStart = gpEl.getAttribute("data-start");
            };
          });
        }
      }, 100);
    }
  });
});
