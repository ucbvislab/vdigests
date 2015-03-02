/**
 * GET /screenshot
 * Return a screenshot of the given video at the given time
 */
/*global require exports Buffer*/
var fs = require('fs'),
    VDigest = require('../models/VDigest'),
    path = require('path'),
    pathUtils = require('../utils/fpaths'),
    spaths = require('../config/settings').paths,
    exec = require('child_process').exec,
    returnError = require('../utils/errors').returnError;

exports.getScreenShot = function (req, res, next) {
  var vdid = req.query.id,
      time = req.query.time.substr(0, 6) || 0,
      usetime;

  try {
    usetime = Number(time);
    if (usetime < 0) {
      throw new Error("screenshot time is out of bounds");
    }
  } catch (e) {
    returnError(res, "time must be a nonegative number and indicate the the second value of the screenshot", next);
  }

  VDigest.findById(vdid, function (err, vd) {
    if (err || !vd || !vd.videoName) {
      returnError(res, "cannot create a screenshot: unable to find the given video digest", next);
      return;
    }
    usetime = Math.min(usetime, vd.videoLength - 0.3); // TODO fix the screenshot edge case
    var videoFile = vd.getVideoFile(),
        outssFile = pathUtils.getScreenShotFile(vd.videoName, usetime),
        cmd = "nice -n 10 ffmpeg -ss " + usetime + " -i " + videoFile + " -f image2 -vframes 1 -y " + outssFile;
    console.log( cmd );

    exec(cmd, function (err2) {
      console.log( "finished execution" );

      if (err2) {
        returnError(res, "system error while taking screenshot", next);
        return;
      }
      fs.readFile(outssFile, function (err3, img) {
        if (err2) {
          returnError(res, "system error while taking screenshot", next);
          return;
        }
        var base64Image = "data:image/jpeg;base64," + (new Buffer(img, 'binary').toString('base64'));
        res.writeHead(200, {'content-type': 'text/plain'});
        res.end(base64Image);
      });
    });
  });
};
