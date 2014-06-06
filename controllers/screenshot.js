/**
 * GET /screenshot
 * Return a screenshot of the given video at the given time
 */
/*global require exports*/
  var fs = require('fs'),
      FFmpeg = require('fluent-ffmpeg');

  exports.getScreenShot = function (req, res) {
    var vid = req.query.vid,
        time = req.query.time || 0;

    if (vid === undefined || time === undefined) {
      res.writeHead(400);
      res.end();
      return;
    }

    var imgDir = "/tmp",
        imgName = "output",
        imgFullName = imgDir + "/" + imgName;
    var vidObj = new FFmpeg({source: '/tmp/tmpvid.mp4'}).withSize('566x312')
      .on("end", function () {
        debugger;
        var img = fs.readFileSync(imgFullName + ".jpg"),
            base64Image = "data:image/jpeg;base64," + (new Buffer(img, 'binary').toString('base64'));
        res.writeHead(200, {'content-type': 'text/plain'});
        res.end(base64Image, 'binary');
      })
      .on("error", function () {
        console.log( "error creating screenshot" );
        res.writeHead(500);
        res.end();
      });

    vidObj.takeScreenshots({count: 1, timemarks: ["" + time], filename: imgName}, imgDir);
  };
