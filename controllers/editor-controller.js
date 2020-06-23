/**
 * GET /editing-interface
 * Video digest editing interface
 */
/*global require exports*/

var fs = require("fs").promises,
  mkdirp = require("mkdirp"),
  ytdl = require("ytdl-core"),
  multiparty = require("multiparty"),
  url = require("url"),
  sys = require("sys"),
  exec = require("child_process").exec,
  User = require("../models/User"),
  util = require("util"),
  slug = require("slug"),
  querystring = require("querystring"),
  path = require("path"),
  VDigest = require("../models/VDigest"),
  settings = require("../config/settings"),
  spaths = settings.paths,
  pathUtils = require("../utils/fpaths"),
  returnError = require("../utils/errors").returnError,
  cache = require("memory-cache");

var nodemailer = require("nodemailer");
var secrets = require("../config/secrets");
var smtpTransport = nodemailer.createTransport("SMTP", {
  service: "Mailgun",
  auth: {
    user: secrets.mailgun.user,
    pass: secrets.mailgun.password,
  },
});

// Helper functions
var returnJson = function (res, data, code) {
  code = code || 200;
  res.writeHead(code, { "content-type": "application/json" });
  res.write(JSON.stringify(data));
  res.end();
};

// Helper functions
var returnErrorJson = function (res, data, code) {
  code = code || 400;
  res.writeHead(code, { "content-type": "application/json" });
  res.write(JSON.stringify(data));
  res.end();
};

function youtubeUrlFromId(ytid) {
  return `https://www.youtube.com/watch?v=${ytid}`;
}

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

const cardTimingRegex = /^(\d\d):(\d\d):(\d\d\.\d\d\d) --> (\d\d):(\d\d):(\d\d\.\d\d\d)/;

function getTextForCurrentCard(cardText) {
  // Skip all VTT cards that contain a cue <c> tag, for now as the transcript is duplicated
  // in those cards
  if (cardText.indexOf("<c>") >= 0 || cardText.length === 0) {
    return "";
  }
  cardText = `${cardText.charAt(0).toUpperCase()}${cardText.slice(1)}`;
  if (!cardText.endsWith(".")) {
    cardText += ".";
  }
  return cardText;
}

function vttToText(vttText) {
  const vttLines = vttText.split("\n");
  let result = "";

  let foundFirstTiming = false;
  let currentCard = "";

  for (const line of vttLines) {
    const timingMatch = line.match(cardTimingRegex);
    if (timingMatch) {
      foundFirstTiming = true;
      result += getTextForCurrentCard(currentCard);
      currentCard = "";
    } else if (foundFirstTiming) {
      currentCard += line + "\n";
    }
  }
  result += getTextForCurrentCard(currentCard);
  return result;
}

function getAlignmentForVtt(vttText) {
  const vttLines = vttText.split("\n");
  const words = [];
  let cardStart = 0;
  let cardEnd = 0;
  let sentenceNumber = 0;
  for (const line of vttLines) {
    const timingMatch = line.match(cardTimingRegex);
    if (timingMatch) {
      const [
        ,
        fromHours,
        fromMinutes,
        fromSeconds,
        toHours,
        toMinutes,
        toSeconds,
      ] = timingMatch;
      cardStart =
        parseInt(fromHours, 10) * 60 * 60 +
        parseInt(fromMinutes, 10) * 60 +
        parseFloat(fromSeconds);
      cardEnd =
        parseInt(toHours, 10) * 60 * 60 +
        parseInt(toMinutes, 10) * 60 +
        parseFloat(toSeconds);
    } else if (cardStart !== cardEnd && line.indexOf("<c>") >= 0) {
      let wordStart = cardStart;
      let wordEnd = cardStart;
      console.log(line);
      for (const part of line.split("<c>")) {
        const match = part.match(/([^<>]+)(<\/c>)?(<(\d\d):(\d\d):(\d\d\.\d\d\d)>)?/);
        let word = part.trim();
        if (match) {
          const [, w, , , hours, minutes, seconds] = match;
          word = w.trim();
          if (hours && minutes && seconds) {
            wordEnd =
              parseInt(hours, 10) * 60 * 60 +
              parseInt(minutes, 10) * 60 +
              parseFloat(seconds);
          }
        } else {
          wordEnd = cardEnd;
        }
        words.push({
          word,
          alignedWord: word.toUpperCase(),
          start: wordStart,
          end: wordEnd,
          speaker: 0,
          sentenceNumber,
        });
        wordStart = wordEnd;
        console.log(words[words.length - 1])
      }
      sentenceNumber++; // crude...
    }
  }
  return { words };
}

async function createVideoDigest(res, {
  userId,
  ytid,
  tfname,
  videoLength,
  title,
  imageUrl,
  alignTrans,
}) {
  const vd = new VDigest({
    ytid,
    rawTransName: tfname,
    videoName: ytid,
    videoLength,
    digest: { title },
    alignTrans,
    state: 1,
  });

  try {
    await vd.save();
  } catch (err) {
    returnError(
      res,
      "problem saving video digest to the database -- please try again",
      next
    );
  }

  // add video digest to this user's account
  User.findById(userId, async function (err, user) {
    if (err) return next(err);
    if (user.vdigests.indexOf(vd.id) === -1) {
      user.vdigests.push(vd.id);
      await user.save();
    }

    const payload = { intrmid: vd._id, iurl: imageUrl, title, };

    res.writeHead(200, { "content-type": "application/json" });
    res.write(JSON.stringify(payload));
    res.end();
  });
}

async function getTranscriptAndCreateDigest({ res, userId, title, imageUrl, videoLength, ytid, next }) {
  // read the text so we can store it into
  var tfname, rawTransFile, alignTrans;

  tfname = ytid + ".srt";

  let data = undefined;
  let writeData = undefined;
  try {
    console.log(
      "Looking for ",
      path.join(spaths.videos, ytid + ".en.vtt")
    );
    data = await fs.readFile(
      path.join(spaths.videos, ytid + ".en.vtt"),
      "utf8"
    );
    writeData = vttToText(data);

    alignTrans = getAlignmentForVtt(data);
  } catch (err) {
    console.log(err);
    console.log("No downloaded VTT transcript available", err);
    return returnError(res, "unable to get YouTube transcript");
  }

  tfname = ytid + ".txt";
  rawTransFile = path.join(spaths.rawTrans, ytid + ".txt");
  try {
    await fs.writeFile(rawTransFile, writeData);
  } catch (err) {
    console.log(err);
    return returnError(res, "unable to get YouTube transcript");
  }

  createVideoDigest(res, {
    userId,
    ytid,
    tfname,
    videoLength,
    title,
    alignTrans,
    imageUrl,
    next
  });
}

// async function getAlignmentFromYoutubeVTT(ytid) {
//   let data = undefined;
//   let writeData = undefined;
//   try {
//     console.log(
//       "Looking for ",
//       path.join(spaths.videos, ytid + ".en.vtt")
//     );
//     data = await fs.readFile(
//       path.join(spaths.videos, ytid + ".en.vtt"),
//       "utf8"
//     );
//     writeData = vttToText(data);

//     alignTrans = getAlignmentForVtt(data);
//   } catch (err) {
//     console.log(err);
//     console.log("No downloaded VTT transcript available", err);
//     return returnError(res, "unable to get YouTube transcript");
//   }
//   return alignTrans;
// }

async function getTranscript({ res, userId, title, imageUrl, videoLength, next, ytid }) {
  console.log("Trying to get video file for: " + ytid);

  // download the video transcript
  var ytdlCommand =
    "youtube-dl --skip-download --write-auto-sub -o '" +
    path.join(spaths.videos, ytid) +
    ".%(ext)s'" +
    " " +
    youtubeUrlFromId(ytid);

  if (videoLength > settings.max_yt_length) {
    returnError(
      res,
      "Video length exceeds " +
      Math.floor(settings.max_yt_length / 60) +
      " minutes",
      next
    );
    return;
  }

  downloading = true;
  console.log("cmd: " + ytdlCommand);
  exec(ytdlCommand, function (error, stdout, stderr) {
    downloading = false;
    if (error) {
      console.log("error: " + error);
      console.log("stderror: " + stderr);
      return returnError(res, "unable to load YouTube video properly");
    }
    getTranscriptAndCreateDigest({ res, userId, title, ytid, imageUrl, videoLength, next });
  });
}

/**
 * Returns the editor js template (TODO consider bootstraping data)
 */
exports.getEditor = function (req, res) {
  res.render("editor", {
    title: "Video Digest Editor",
  });
};

/**
 * Returns the readyness/processing status of the video digest
 */
exports.getStatus = function (req, res) {
  var uparsed = url.parse(req.url),
    did = uparsed.query && querystring.parse(uparsed.query).id;

  VDigest.findById(did, function (err, vd) {
    var vstatus = 0;
    var msg = "";
    console.log(vd.state);
    if (err || !vd) {
      msg = "unable to load the video digest";
    } else if (vd.isProcessing()) {
      vstatus = 3;
      msg = "video digest is processing";
    } else if (vd.isReady()) {
      vstatus = 1;
      msg = "video digest is ready for editing";
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: vstatus, message: msg }));
  });
};

/**
 * Returns the digest data needed for the editor /digestdata/:vid
 */
exports.getDigestData = function (req, res, next) {
  console.log('Getting digest data...');

  var vdid = req.params.vdid;
  if (cache.get(vdid)) {
    console.log("using vdid cache for: " + vdid);
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(cache.get(vdid));
  }

  VDigest.findById(vdid, function (err, vd) {
    if (err || !vd) {
      returnError(res, "unable to load the specified video digest data", next);
    } else if (vd.isProcessing()) {
      returnError(res, "the video digest is currently processing", next);
    } else if (!vd.isReady()) {
      returnError(
        res,
        "the transcript did not upload correctly: please create the video digest from scratch",
        next
      );
    } else {
      res.writeHead(200, { "content-type": "application/json" });
      var jsonStrResp = JSON.stringify({
        digest: vd.digest,
        transcript: vd.alignTrans,
        ytid: vd.ytid,
        videoLength: vd.videoLength,
      });
      res.end(jsonStrResp);
      cache.put(vdid, jsonStrResp, 10000000);
    }
  });
};

/**
 * Post to the digest data /digestdata/:vid
 */
exports.postPublishDigest = function (req, res, next) {
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
      vd.puburl =
        "/view/" +
        slug(vd.digest.title + " " + vd.id);
      vd.save();
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        status: "success",
        message: "published the video digest",
        puburl: vd.puburl,
      })
    );
  });
};

/**
 * Post to the digest data /digestdata/:vid
 */
exports.postDigestData = function (req, res, next) {
  var vdid = req.params.vdid;

  VDigest.findById(vdid, function (err, vd) {
    if (err || !vd) {
      returnError(res, "unable to save the video digest data", next);
      return;
    }

    // TODO remove audioName check used for VD experiment
    if (
      (!req.user || req.user.vdigests.indexOf(vdid) === -1) &&
      vd.audioName != "Fpz-stC1uh8"
    ) {
      returnError(
        res,
        "you do not have the access to change this digest",
        next
      );
      return;
    }

    vd.digest = req.body.object;
    vd.save(function (err) {
      // TODO check that the the user can save the data
      if (err) {
        returnError(res, "unable to save the video digest data", next);
        return;
      }

      // update memory cache
      var jsonStrResp = JSON.stringify({
        digest: vd.digest,
        transcript: vd.alignTrans,
        ytid: vd.ytid,
        videoLength: vd.videoLength,
      });
      cache.put(vdid, jsonStrResp, 10000000);

      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          status: "success",
          message: "saved the video digest data",
        })
      );
    });
  });
};

// multipart process for loading a new video
exports.postNewVD = function (req, res, next) {
  console.log("Trying to print url");
  console.log(req.yturl);

  req.assert("yturl", "YouTube URL is not a valid URL").isURL();

  if (!req.user) {
    returnError(res, "You must be logged in to create a video digest", next);
    return;
  }

  // 5 minute timeout should allow most youtube videos to download
  req.setTimeout(300000);

  var form = new multiparty.Form({
    maxFilesSize: settings.maxTransUploadSize,
    uploadDir: spaths.rawTrans,
  });

  form.parse(req, async function (err, fields, files) {
    if (err) {
      returnError(res, err.message, next);
      return;
    }

    var ytparsed = url.parse(fields.yturl && fields.yturl[0]),
      ytid = ytparsed.query && querystring.parse(ytparsed.query).v;

    if (
      !(
        ytparsed.hostname === "youtube.com" ||
        ytparsed.hostname === "www.youtube.com"
      ) ||
      !ytid
    ) {
      //  TODO return informative messages to the user (how to do this?)
      returnError(
        res,
        "You must provide a YouTube url in the format: https://www.youtube.com/watch?v=someIdValue",
        next
      );
      return;
    }

    if (files.tranupload || (fields.usegtrans && fields.usegtrans[0])) {
      await getTranscript({ res, fields, next, ytid });
    } else if (fields.intrmid && fields.intrmid[0]) {
      // no longer possible
      returnError(
        res,
        "Unknown error! Please try again",
        next
      );
    } else {
      // No files: first upload
      // TODO check/handle for existing transcript
      // obtain video info and save to DB if video does not exist
      // TODO handle incorrect urls ? what happens?

      let info = undefined;
      try {
        info = await ytdl.getBasicInfo(youtubeUrlFromId(ytid));
      } catch (err) {
        console.log(err);
        console.log(err.message);
        returnError(
          res,
          "Unable to find a YouTube Video with the given URL",
          next
        );
        return;
      }

      const { videoDetails } = info.playerResponse;
      const imageUrl = videoDetails.thumbnail.thumbnails[0].url;
      const { title, lengthSeconds } = videoDetails;

      // TODO: some escape hatch if the video doesn't have a transcript

      const userId = req.user.id;

      await getTranscript({ res, userId, title, imageUrl, videoLength: parseInt(lengthSeconds, 10), next, ytid });
    }
  });

  return;
};

exports.getAutoSeg = function (req, res, next) {
  // get the transcript
  VDigest.findById(req.params.vdid, async function (err, vdigest) {
    if (err || !vdigest) {
      return returnErrorJson(res, err);
    }

    if (!vdigest.rawTransName) {
      var transText = vdigest.alignTrans.words
        .map(function (wrd) {
          return wrd.word;
        })
        .join(" ")
        .replace(" {p}", "");
      vdigest.rawTransName = Math.random().toString(36).substr(6) + ".txt";
      var outfile = path.join(spaths.rawTrans, vdigest.rawTransName);
      try {
        await fs.writeFile(outfile, transText);
      } catch (err) {
        return returnErrorJson(res, err, 500);
      }
    }
    doSysCall();

    function doSysCall() {
      var rtxtfile = vdigest.getSSFile();
      var segSysCall =
        "python adv_seg.py eval " + spaths.segConfigFile + " " + rtxtfile;
      // execute system call
      if (!vdigest.sentSepTransName) {
        console.log("trying to generate separated transcript");
        var scmd = "python add_sentences.py " + vdigest.id;
        console.log(scmd);

        exec(scmd, { cwd: spaths.utils }, function (err, stdout, stderr) {
          console.log("error: " + err);
          console.log("error: " + stderr);
          if (err || !vdigest.sentSepTransName) {
            return returnErrorJson(
              res,
              { msg: "error processing transcript - please try again later" },
              500
            );
          } else {
            doSysCall();
          }
        });
      } else {
        console.log(segSysCall);
        var segProc = exec(segSysCall, { cwd: spaths.analysis }, function (
          error,
          stdout,
          stderr
        ) {
          console.log("finished segmentation");
          console.log("error: " + error);
          console.log("stderror: " + stderr);
          console.log("stdout: " + stdout);
          // get sentence breaks from stdout
          if (error || stderr) {
            return returnErrorJson(res, {
              msg: "Segmentation error -- please try again: " + stderr,
            });
          }
          try {
            var sps = stdout.split("\n");
            var sentBreaks = sps[sps.length - 4];
            return returnJson(res, { breaks: sentBreaks });
          } catch (e) {
            return returnErrorJson(res, {
              msg: "Segmentation error -- please try again",
            });
          }
          // read results from system call or return error
          // return the word/sentence numbers
        });
      }
    }
  });
};
