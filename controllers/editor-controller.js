/**
 * GET /editing-interface
 * Video digest editing interface
 */
/*global require exports*/

var fs = require('fs'),
    mkdirp = require('mkdirp'),
    ytdl = require('ytdl'),
    multiparty = require('multiparty'),
    url = require('url'),
    sys = require('sys'),
    exec = require('child_process').exec,
    User = require('../models/User'),
    util = require('util'),
    slug = require('slug'),
    querystring = require('querystring'),
    path = require('path'),
    VDigest = require('../models/VDigest'),
    settings = require('../config/settings'),
    spaths = settings.paths,
    pathUtils = require('../utils/fpaths'),
    returnError = require('../utils/errors').returnError,
    cache = require('memory-cache');

var nodemailer = require("nodemailer");
var secrets = require('../config/secrets');
var smtpTransport = nodemailer.createTransport('SMTP', {
  service: 'Mailgun',
  auth: {
    user: secrets.mailgun.user,
    pass: secrets.mailgun.password
  }
});


// Helper functions
var returnJson = function (res, data, code) {
  code = code || 200;
  res.writeHead(code, {'content-type': 'application/json'});
  res.write(JSON.stringify(data));
  res.end();
};

// Helper functions
var returnErrorJson = function (res, data, code) {
  code = code || 400;
  res.writeHead(code, {'content-type': 'application/json'});
  res.write(JSON.stringify(data));
  res.end();
};

var srtToText = function (srtText) {
  var srtData = srtText.split(/\n\n/g),
      writeData = "";
  srtData.forEach(function (srCluster) {
    if (srCluster) {
      writeData += srCluster.split("\n").slice(2).join(". ");
      writeData += "\n";
    }
  });
  return writeData;
};

  

/**
 * Returns the editor js template (TODO consider bootstraping data)
 */
exports.getEditor = function(req, res) {
  res.render('editor', {
    title: 'Video Digest Editor'
  });
};

/**
 * Returns the readyness/processing status of the video digest
 */
exports.getStatus = function(req, res) {
  var uparsed = url.parse(req.url),
      did = uparsed.query && querystring.parse(uparsed.query).id;

  VDigest.findById(did, function (err, vd) {
    var vstatus = 0;
    var msg = "";
    console.log(vd.state);
    if (err || !vd) {
      msg = "unable to load the video digest";
    }
    else if (vd.isProcessing()) {
      vstatus = 3;
      msg = "video digest is processing";
    }
    else if (vd.isReady()) {
      vstatus = 1;
      msg = "video digest is ready for editing";
    }
    res.writeHead(200, {"content-type": "application/json"});
    res.end(JSON.stringify({"status": vstatus, "message": msg}));
  });
};

/**
 * Returns the digest data needed for the editor /digestdata/:vid
 */
exports.getDigestData = function (req, res, next) {
  var vdid = req.params.vdid;
  if (cache.get(vdid)) {
   console.log("using vdid cache for: " + vdid);
      res.writeHead(200, {"content-type": "application/json"});
      return res.end(cache.get(vdid));
  }

  VDigest.findById(vdid, function (err, vd) {
    if (err || !vd) {
      returnError(res, "unable to load the specified video digest data", next);
    }
    else if (vd.isProcessing()) {
      returnError(res, "the video digest is currently processing", next);
    }
    else if (!vd.isReady()) {
      returnError(res, "the transcript did not upload correctly: please create the video digest from scratch", next);
    } else {
      res.writeHead(200, {"content-type": "application/json"});
      var jsonStrResp = JSON.stringify({"digest": vd.digest, "transcript": vd.alignTrans, "ytid": vd.ytid, "videoLength": vd.videoLength});
      res.end(jsonStrResp);
      cache.put(vdid, jsonStrResp, 10000000);
    }
  });
};


/**
 * Post to the digest data /digestdata/:vid
 */
exports.postPublishDigest = function(req, res, next) {
  var vdid = req.params.vdid;
  if (req.user.vdigests.indexOf(vdid) === -1) {
    returnError(res, "you do not have the access to publish this digest", next);
    return;
  }

  VDigest.findById(vdid, function (err, vd) {
    if (err || !vd) {
      returnError(res, "unable to save the video digest data", next);
      return;
    }
    if (!vd.pubdisplay) {
      vd.pubdisplay = true;
      vd.puburl = "http://vis.berkeley.edu/videodigests/view/" + slug(vd.digest.title + " " + vd.id);
      vd.save();
    }
    res.writeHead(200, {"content-type": "application/json"});
    res.end(JSON.stringify({"status": "success", "message": "published the video digest", puburl: vd.puburl}));
  });
};

/**
 * Post to the digest data /digestdata/:vid
 */
exports.postDigestData = function(req, res, next) {
  var vdid = req.params.vdid;


  VDigest.findById(vdid, function (err, vd) {
    if (err || !vd) {
      returnError(res, "unable to save the video digest data", next);
      return;
    }
      
      // TODO remove audioName check used for VD experiment
      if ((!req.user || req.user.vdigests.indexOf(vdid) === -1) && vd.audioName != 'Fpz-stC1uh8') {
	  returnError(res, "you do not have the access to change this digest", next);
	  return;
      }

    vd.digest = req.body.object;
    vd.save(function (err) {
      // TODO check that the the user can save the data
      if (err) {
        returnError(res, "unable to save the video digest data", next);
        return;
      }
      res.writeHead(200, {"content-type": "application/json"});
      res.end(JSON.stringify({"status": "success", "message": "saved the video digest data"}));
    });
  });
};


// multipart process for loading a new video
exports.postNewVD = function(req, res, next) {
  req.assert('yturl', 'YouTube URL is not a valid URL').isURL();

  if (!req.user) {
    returnError(res, "You must be logged in to create a video digest", next);
    return;
  }

  // 5 minute timeout should allow most youtube videos to download
  req.setTimeout(300000);

  var form = new multiparty.Form({
    maxFilesSize: settings.maxTransUploadSize,
    uploadDir: spaths.rawTrans
  });

  form.parse(req, function (err, fields, files) {
    if (err) {
      returnError(res, err.message, next);
      return;
    }

    var ytparsed = url.parse(fields.yturl && fields.yturl[0]),
        ytid = ytparsed.query && querystring.parse(ytparsed.query).v;
    if (!(ytparsed.hostname === "youtube.com" || ytparsed.hostname === "www.youtube.com") || !ytid) {
      //  TODO return informative messages to the user (how to do this?)
      returnError(res, "you must proivde a YouTube url in the format: http://www.youtube.com/watch?v=someIdValue", next);
      return;
    }
    var ytaddr = "https://www.youtube.com/watch?v=" + ytid;

    if (files.tranupload || (fields.usegtrans && fields.usegtrans[0])) {

      var vidFile = pathUtils.getVideoFile(ytid);
      var sendGoodResponse = function () {
        // read the text so we can store it into
        var vlencmd = "nice -n 20 ffprobe -loglevel error -show_streams " + vidFile + " | grep duration= | cut -f2 -d= | head -n 1";
        exec(vlencmd, function (err, vlen) {
          if (err) {
            returnError(res, "unable to determine video length", next);
            return;
          }
          var tfname,
              rawTransFile;
          if (fields.usegtrans) {
            tfname = ytid + ".srt";
            // TODO convert SRT to text and move to appropo location
            fs.readFile(path.join(spaths.videos, ytid + ".en.srt"), "utf8", function (err, data) {
              if (err) {
                return returnError(res, "unable to get YouTube transcript");
              }
              var writeData = srtToText(data);
              tfname = ytid + ".txt";
              rawTransFile = path.join(spaths.rawTrans, ytid + ".txt");
              fs.writeFile(rawTransFile, writeData, function (err) {
                if (err) {
                  return returnError(res, "unable to get YouTube transcript");
                }
                saveVD();
                // now call the ready function
              });
            });
          } else {
            var fp = files.tranupload[0].path.split(path.sep);
            tfname = fp[fp.length - 1];
            saveVD();
          }

          function saveVD () {
            var vd = new VDigest({ytid: ytid, rawTransName: tfname, videoName: ytid, videoLength: vlen, digest: {title: fields.yttitle[0]}});
            vd.save(function (err) {
              if (err) {
		            console.log(err);
                returnError(res, "problem saving video digest to the database -- please try again", next);
                return;
              } else {
                res.writeHead(200, {'content-type': 'application/json'});
                res.write('{"intrmid":"' + vd._id +'"}');
                res.end();
                return;
              }
            });            
          };
        });
      }; // end sendGoodResponse

      // download the yt video
      var downloading = false;
      fs.exists(vidFile, function (exists) {
        if (downloading) {
          return;
        }
        else {

          // first download the video transcript if necessary
          var ytdl_cmd = "youtube-dl -f mp4 --write-auto-sub -o '" + path.join(spaths.videos, ytid) + ".%(ext)s'" + " " + ytaddr;
          
          
          //var vidWS = fs.createWriteStream(vidFile);
          ytdl.getInfo(ytaddr, function(err, info) {
            if (info.length_seconds > settings.max_yt_length || err) {
              returnError(res, (err && err.message) || ("Video length exceeds " + Math.floor(settings.max_yt_length/60) + " minutes"), next);
              return;
            }

            downloading = true;
            console.log("cmd: " + ytdl_cmd);
            exec(ytdl_cmd, function (error, stdout, stderr) {
              downloading = false;
              if (error) {
                console.log("error: " + error);
                console.log("stderror: " + stderr);
                return returnError(res, "unable to load YouTube video properly");
              }
              sendGoodResponse();
            });
          });
        }
      });

    } else if (fields.intrmid && fields.intrmid[0]) {
      if (!Number(fields.createdigest[0])) {
        returnError(res, "you must select 'yes' to continue", next);
        return;
      }

      var intrmid = fields.intrmid[0];
      // set the state to 2
      // first clean the text
      VDigest.findById(intrmid, function (err1, vdigest) {
        if (err1 || !vdigest || !vdigest.rawTransName || ! vdigest.videoName) {
          returnError(res, "encountered a problem loading the video digest data: please try resubmitting", next);
          return;
        }
        vdigest.state = 2;
        vdigest.save();

        var vname = vdigest.videoName,
            aname = vname,
            inVideoFile = vdigest.getVideoFile(),
            outAudioFile = pathUtils.getAudioFile(aname),
            outAlignTrans = path.join(spaths.tmp, aname + "_aligned.json"),
            state = 0;

        //
        // Clean up the text
        //
        var rtxtfile = path.join(spaths.rawTrans, vdigest.rawTransName);
        fs.readFile(rtxtfile, 'utf8', function (err2, data) {
          if (err2) {
            returnError(res, "encountered a problem processing the transcript: is it a plain text file?", next);
            return;
          }

          // convert if it's an srt file
          var newLineData = data.split("\n");
          if (newLineData.length > 2 && newLineData[0] == "1" && /-->/.test(newLineData[1])) {
            data = srtToText(data);
            fs.writeFile(rtxtfile, data);
          }

          var paragraphs = data.split("."),
              out = [],
              line,
              spkct = 0;
          paragraphs.forEach(function (para, i) {
            if ((i + 1) % 4 == 0) {
              spkct += 1;
            }
            para = para.replace("\n", " ");
            para = para.replace(/[^-\w\d,.?!\(\)' ]/g, "");
            para = para.replace(/\s+[^\w]+\s+/g, "");
            para = para.replace(/\s+/g, " ");
            if (para.replace(/\s+/g, "") !== "") {
              line = {
                speaker: "" + spkct,
                "line": para
              };
              out.push(line);
            }
          });
          vdigest.preAlignTrans = out;
          vdigest.save(function (err) {
            if (err) {
              returnError(res, "encountered a problem processing the transcript: is it a plain text file?", next);
              return;
            }
            console.log("transcript is finished");
            if (state === 3) {
              alignTranscript();
            } else {
              state = 3;
              vdigest.state = state;
              vdigest.save();
            }
          });
        });

        //
        // Extract the audio from the video in the appropriate format
        //
        var child,
            cmd;
        cmd = "nice -n 20 ffmpeg -i " + inVideoFile + " -acodec pcm_s16le -y " + outAudioFile;
        console.log(cmd);
        // executes `pwd`
        child = exec(cmd, function (error, stdout, stderr) {
          if (error !== null) {
            returnError(res, "error processing the video", next);
            console.log('exec error: ' + error);
            return;
          }
          vdigest.audioName = aname;
          vdigest.save();
          console.log("audio is finished");
          if (state === 3) {
            alignTranscript();
          } else {
            state = 3;
            vdigest.state = state;
            vdigest.save();
          }
        });


        var alignTranscript = function () {
          var outPreFile = path.join(spaths.tmp, vdigest.videoName + ".json");
          fs.writeFile(outPreFile, JSON.stringify(vdigest.preAlignTrans), function (err) {
            if (err) {
              returnError(res, "error parsing video transcript", next);
              return;
            }

            // make a temporary working dir for the alignment process
            var tmpAlignDir = path.join(spaths.tmp, vname);
            mkdirp(tmpAlignDir, function (err0) {
              if (err0 !== null) {
                console.log('exec error: ' + err0);
                returnError(res, "system error creating the aligned transcript", next);
                return;
              }

              res.writeHead(200, {'content-type': 'application/json'});
              res.write('{"readyid":"' + vdigest._id +'"}');
              res.end();

              var alignCmd = "nice -n 20 python " + spaths.alignpy + " "
                    + outAudioFile + " " + outPreFile + " " + outAlignTrans
                    + " > " + outAlignTrans + "-output";
              console.log("starting alignment command");
              console.log(alignCmd);

              // get the user account
              User.findById(req.user.id, function(err, user) {
                if (err) return next(err);
                if (!~user.vdigests.indexOf(vdigest.id)) {
                  user.vdigests.push(vdigest.id);
                  user.save();
                }
              });

              // add this video digest to their account
              child = exec(alignCmd, {cwd: tmpAlignDir}, function (error, stdout, stderr) {
                if (error !== null) {
                  console.log('exec error: ' + error);
                  returnError(res, "error creating the aligned transcript", next);
                  return;
                }

                console.log("finished processing vdigest");
                fs.readFile(outAlignTrans, 'utf8', function (err2, data) {
                  console.log("done reading the aligned transcript");
                  var alignTrans = JSON.parse(data);
                  // TODO why do we have this first word error?
                  alignTrans.words[0].speaker = "0";
                  vdigest.alignTrans = alignTrans;
                  vdigest.state = 1;
                  vdigest.save(function (err) {
                    if (err) {
                      console.log("unable to save the video digest");
                      console.log(err);
                      return;
                    }

                    // now generate the sentences
                    var sentCall = "python add_sentences " + vdigest.id;
                    exec(sentCall, {cwd: spaths.analysis}, function () {
                      // send email to user
                      var from = "video.digests@vis.berkeley.edu";
                      var name = "video-digest admin";
                      var body = "Hello " + req.user.profile.name +",\n\n"
                            + "The transcript-video alignment is finished and you may now edit your video digest at: http://vis.berkeley.edu/videodigests/editor#edit/" + vdigest._id + "\n\n"
                            + "Best wishes,\n -Friendly Neighborhood Video Digest Bot";

                      var to = req.user.email;
                      var subject = 'Video Digests: Video-transcript alignment complete';

                      var mailOptions = {
                        to: to,
                        from: from,
                        subject: subject,
                        text: body
                      };

                      smtpTransport.sendMail(mailOptions, function(err) {
                        if (err) {
                          console.log(err);
                        }
                      });
                    });
                  });
                });
              });// end align command
            }); // end make temporary directory
          });
        };
      });
    } else {
      // No files: first upload
      // TODO check/handle for existing transcript
      // obtain video info and save to DB if video does not exist
      // TODO handle incorrect urls ? what happens?
      ytdl.getInfo(ytaddr, function(err, info) {
        if (err && err.message) {
          returnError(res, "unable to find a YouTube Video with the given URL", next);
          return;
        }
        res.writeHead(200, {'content-type': 'application/json'});
        res.write(JSON.stringify(info));
        res.end();
      });
    }
  });
  return;
};


exports.getAutoSeg = function (req, res, next) {
  // get the transcript
  VDigest.findById(req.params.vdid, function (err, vdigest) {
    if (err || !vdigest) {
      return returnErrorJson(res, err);
    }

    if (!vdigest.rawTransName) {
      var transText = vdigest.alignTrans.words.map(function (wrd) {
        return wrd.word;
      }).join(" ").replace(" {p}", "");
      vdigest.rawTransName = Math.random().toString(36).substr(6) + ".txt";
      var outfile = path.join(spaths.rawTrans, vdigest.rawTransName);
      fs.writeFile(outfile, transText, function (err) {
        if (err) {
          return returnErrorJson(res, err, 500);
        }
        doSysCall();
      });
    } else {
      doSysCall();
    }

    function doSysCall() {
      var rtxtfile = vdigest.getSSFile();
      var segSysCall = "python adv_seg.py eval " + spaths.segConfigFile + " " + rtxtfile;
      // execute system call
      if (!vdigest.sentSepTransName) {
        console.log("trying to generate separated transcript");
        var scmd = "python add_sentences.py " + vdigest.id;
        console.log( scmd );

        exec(scmd, {cwd: spaths.utils}, function (err, stdout, stderr) {
	   console.log("error: " + err);
           console.log("error: " + stderr);
          if (err || !vdigest.sentSepTransName) {
           return returnErrorJson(res, {msg: "error processing transcript - please try again later"}, 500);
          } else {
            doSysCall();
          }
        });
      } else {
        console.log(segSysCall);
        var segProc = exec(segSysCall, {cwd: spaths.analysis}, function (error, stdout, stderr) {
          console.log("finished segmentation");
	  console.log("error: " + error)
	  console.log("stderror: " + stderr)
	  console.log("stdout: " + stdout)
          // get sentence breaks from stdout
	  if (error || stderr) {
	      return returnErrorJson(res, {"msg": "Segmentation error -- please try again: " + stderr});
          }
          try{
            var sps = stdout.split("\n");
            var sentBreaks = sps[sps.length-4];
            return returnJson(res, {breaks: sentBreaks});
          } catch (e) {
            return returnErrorJson(res, {"msg": "Segmentation error -- please try again"});
          }
          // read results from system call or return error
          // return the word/sentence numbers
        });
      }
    }
  });


};
