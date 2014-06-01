
/*global define YT*/
define(['jquery'], function($) {
  var player = {
    inputVideo: function(container, videoId, vplayerObj, startTime, exactStartTime) {
      if (typeof(window.YT) == 'undefined' || typeof(window.YT.Player) == 'undefined') {
        window.onYouTubeIframeAPIReady = function() {
          player.loadPlayer(container, videoId, vplayerObj, startTime, exactStartTime);
        };

        $.getScript('//www.youtube.com/iframe_api');
      } else {
          player.loadPlayer(container, videoId, vplayerObj, startTime, exactStartTime);
      }
    },

    loadPlayer: function(container, videoId, vplayerObj, startTime, exactStartTime) {
      vplayerObj[container.id] = new window.YT.Player(container, {
        videoId: videoId,
        width: 566,
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
              event.target.playVideo();
              event.target.mute();
              window.setTimeout(function () {
                event.target.unMute();
                event.target.pauseVideo();
                event.target.seekTo(exactStartTime);
              }, 500);
          }
        }
      });
    }
  };

  return player;
});
