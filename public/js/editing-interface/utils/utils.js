
/*global define */
define(["underscore", "jquery", "canvas2Image"], function (_, $, Canvas2Image) {

  var Utils = {};

  /**
   * Obtain a video screenshot from the server
   */
  Utils.getScreenShot = function (vidid, time, callback) {
    if (vidid === undefined || time === undefined){
      throw Error("must set vidid and time parameters");
    }
    var url = "/screenshot?id=" + vidid + "&time=" + time;
    $.get(url, callback);
  };
  return Utils;
});
