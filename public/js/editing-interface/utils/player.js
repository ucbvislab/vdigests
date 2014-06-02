
/*global define YT*/
define(['jquery'], function($) {
  var player = {
    inputVideo: function(container, videoId, vplayerObj, startTime, exactStartTime, setAttr) {
      if (typeof(window.YT) == 'undefined' || typeof(window.YT.Player) == 'undefined') {
        window.onYouTubeIframeAPIReady = function() {
          player.loadPlayer(container, videoId, vplayerObj, startTime, exactStartTime, setAttr);
        };

        $.getScript('//www.youtube.com/iframe_api');
      } else {
          player.loadPlayer(container, videoId, vplayerObj, startTime, exactStartTime, setAttr);
      }
    },

    loadPlayer: function(container, videoId, vplayerObj, startTime, exactStartTime, setAttr) {

      var pobj = new window.YT.Player(container, {
        videoId: videoId,
        playerVars: {
          controls: 1,
          autohide: 1,
          enablejsapi: 1,
          rel: 0,
          modestbranding: 1,
          rel: 0,
          showInfo: 0,
          start: startTime
        },
        events: {
          'onReady': function (event) {
              window.preppingVideo = true;
              event.target.playVideo();
              event.target.mute();
              window.setTimeout(function () {
                event.target.unMute();
                event.target.pauseVideo();
                event.target.seekTo(exactStartTime);
                window.preppingVideo = false;
              }, 500);
          }
        }
      });

      // TODO fix edit/output hack
      if (setAttr) {
        vplayerObj[setAttr] = pobj;
      } else {
        vplayerObj[container.id] = pobj;
      }
    }
  };

  return player;
});
