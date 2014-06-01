
/*global define */
define(["underscore", "jquery", "canvas2Image"], function (_, $, Canvas2Image) {

  var Utils = {};

  /**
   * Seek then capture a time in a video
   */
  Utils.seekThenCaptureImgTime = function($video, time, callback, w, h) {
    var vid = $video[0];
    w = w || 59;
    h = h || 43;

    // USE STATS
    window.imgSeek = true;

    // when the video has seeked to that time

    $video.one('seeked', function(){
      // return a capture
      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(vid, 0, 0, canvas.width, canvas.height);
      var imdata = canvas.toDataURL();
      callback(imdata, w, h);
      window.setTimeout(function () {
        // USE STATS
        window.imgSeek = false;
      }, 200);

    });
    // change the vid time;
    try {
      vid.currentTime = time;
    } catch (e) {
      console.log("video not ready");
      $video.one("canplay", function () {
        vid.currentTime =  time;
      });
    }

  };

  return Utils;
});
