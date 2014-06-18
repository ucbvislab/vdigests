
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/models/digest-model", "editing-interface/models/transcript-model", "editing-interface/models/chapter-model", "editing-interface/models/section-model", "editing-interface/utils/utils", "editing-interface/models/thumbnail-model"], function (Backbone, _, $, DigestModel, TranscriptModel, ChapterModel, SectionModel, Utils, ThumbnailModel) {

  var addThumbnails = function (toAddThumbs) {
    if (toAddThumbs.length === 0) {
      return;
    }
    var addThumb = toAddThumbs.pop();
    if (addThumb.data) {
      // thumbnail data already present
      _postAddThumb(addThumb.data, addThumb, toAddThumbs);
    } else {
      // capture the thumbnail
      Utils.seekThenCaptureImgTime(addThumb.$vid, addThumb.time, function (data) {
        _postAddThumb(data, addThumb, toAddThumbs);
      });
    }
  };

    var _postAddThumb = function (data, addThumb, toAddThumbs) {
    addThumb.addSec.set("thumbnail", new ThumbnailModel({data: data, image_time: addThumb.time}));
    addThumbnails(toAddThumbs);
  };

  return Backbone.Model.extend({
    defaults: function () {
      return {
        digest: new DigestModel(),
        transcript: new TranscriptModel(),
        ytid: ""
      };
    },

    url: function () {
      return "/digestdata?id=" + this.id;
    },

    initialize: function () {
      var thisModel = this;

      // USE STATS
      window.editorModel = thisModel;
    },

    /**
     * Make sure we have at least one chapter in our digest and transcript
     */
    postInit: function () {
      var thisModel = this;

      // setup appropriate event listeners
      thisModel.listenTo(thisModel.get("transcript").get("words"),
                         "change:startSection", thisModel.handleSectionChange);
      thisModel.listenTo(thisModel.get("transcript").get("words"),
                         "change:startChapter", thisModel.handleChapterChange);

      // mark the first chapter if no chapters are present
      var chaps = thisModel.get("digest").get("chapters");
      if (!chaps.length) {
        console.log("postinit");
        var fw = thisModel.get("transcript").get("words").first();
        fw.set("startChapter", true);
      }
    },

    /**
     * Listen for an event corresponing to a chapter change
     */
    handleChapterChange: function (chWord, newVal) {
      var thisModel = this,
          chaps = thisModel.get("digest").get("chapters"),
          chWordStTime = chWord.get("start");

      // USE STATS
      if (!window.changingSecChap) {
        if (newVal) {
          window.vdstats.nChapCreation.push((new Date()).getTime());
        }
      }

      if (newVal) {
        console.log( "new chapter in editor model" );
        var sec2Chap = chWord.get("startSection");
        // we're creating a new chapter
        var newChap = new ChapterModel({ytid: thisModel.get("ytid"), startWord: chWord, sec2Chap: sec2Chap}),
            prevChWord = chWord.getPrevChapterStart();

        if (prevChWord) {
          var prevChap = chaps.findWhere({startWord: prevChWord});
          var addSecs = prevChap.get("sections").filter(function (sec) {
            var sw = sec.get("startWord");
            return sw.get("start") >= chWordStTime;
          });
          prevChap.get("sections").remove(addSecs);
          newChap.get("sections").add(addSecs);
        }
        chaps.add(newChap);

      } else {
        console.log("editor model false chapter");
      }
    },

    /**
     * Listen for an event corresponing to a section change
     */
    handleSectionChange: function (chWord, newVal) {
      var thisModel = this,
          chaps = thisModel.get("digest").get("chapters");

      if (!window.changingSecChap) {
        // USE STATS
        if (newVal) {
          window.vdstats.nSecCreation.push((new Date()).getTime());
        } else {
          window.vdstats.nSecDeletion.push((new Date()).getTime());
        }
      }

      if (newVal) {
        // we're adding a section
        var prevChapStWord = chWord.getPrevChapterStart(),
            prevSecStWord = chWord.getPrevSectionStart();

        if (chWord.get("startChapter")) {
          prevChapStWord = chWord;
        }
        if (!prevChapStWord) {
          throw Error("section marked without a chapter existing");
        }

        var prevChap = chaps.findWhere({startWord: prevChapStWord}),
            newSection = new SectionModel({startWord: chWord});
        prevChap.get("sections").add(newSection);

      } else {
          // we're removing a section TODO FIXME
          console.log("editor model false section");
      }
    },

    parse: function (inpData) {
      var thisModel = this,
          output = _.extend(thisModel.defaults(), thisModel.attributes);
      output["transcript"] = new TranscriptModel({words: inpData.transcript.words}, {parse: true});
      output["ytid"] = inpData.ytid;
      return output;
    },

    useJSONData: function (inpData) {
      // parse the segment data
      var thisModel = this,
          words = thisModel.get("transcript").get("words"),
          chaps = {};

      var vid = $("video").get(0),
          $vid = $(vid);

      // reset the transcript
      thisModel.get("transcript").resetState();

      if (inpData.title) {
        thisModel.get("digest").set("title", inpData.title);
      }

      _.each(inpData.chapters || inpData, function (inobj) {
        var chasn = inobj.group,
            sec = {summary: inobj.text[0], startWord: null, image_time: inobj.image_time, image_data: inobj.image_data};
            // find the start word
            var closestWord = null,
                closestDist = Infinity,
                compTime = inobj.start_time;
            words.each(function (wrd) {
              var dist = Math.abs(wrd.get("start") - compTime);
              if (dist < closestDist) {
                closestDist = dist;
                closestWord = wrd;
              }
            });
            sec.startWord = closestWord;

        chaps[chasn] = chaps[chasn] || {"sections": [], startWord: null, title: inobj.group_title};
        chaps[chasn].sections.push(sec);
      });

      _.each(chaps, function (chp) {
        chp.sections = chp.sections.sort(function (s1, s2) {
          return s1.startWord.get("start") - s2.startWord.get("start");
        });
        chp.startWord = chp.sections[0].startWord;
      });
      chaps = $.map(chaps, function (ch) {
        return ch;
      }).sort(function (c1, c2) {
        return c1.startWord.get("start") - c2.startWord.get("start");
      });

      var modelChaps = thisModel.get("digest").get("chapters"),
          toAddThumbs = [];
      // set the start word of the chapter
      _.each(chaps, function (chp) {
        var mchp;
        _.each(chp.sections, function (sec, i) {
          var addSec = null;
          if (i === 0) {
            sec.startWord.set("startChapter", true);
            mchp = modelChaps.findWhere({startWord: sec.startWord});
            // FIXME hack
            mchp.swapping = true;
            mchp.set("title", chp.title);
            // chapter has been created
          } else {
            sec.startWord.set("startSection", true);
          }
          addSec = mchp.get("sections").findWhere({startWord: sec.startWord});
          if (addSec) {
            addSec.set("summary", sec.summary);
          } else {
            throw Error("unable to find section matching start word");
          }
          toAddThumbs.push({$vid: $vid, time:  sec.image_time, addSec: addSec, data: sec.image_data});
        });
        mchp.swapping = false;
      });
      addThumbnails(toAddThumbs);
    },

    getOutputJSON: function () {
      var thisModel = this,
          chapters = {},
          ij = 0;
      thisModel.get("digest").get("chapters").each(function (chap, i) {
        chap.get("sections").each(function (sec, j) {
          // TODO use actual image data once new MV* framework is inplace
          var secjson = {
            group: i,
            group_title: chap.get("title"),
            text: [sec.get("summary")],
            start_time: sec.get("startWord").get("start"),
            text_change: false,
            image_change: false,
            image_data: sec.get("thumbnail").get("data"),
            image_id: sec.get("thumbnail").cid,
            image_time: sec.get("thumbnail").get("image_time")
          };

          if (ij) {
            chapters[ij-1].end_time = secjson.start_time;
          }
          chapters[ij++] = secjson;
        });
      });
      var words = thisModel.get("transcript").get("words");
      chapters[ij-1].end_time = words.at(words.length - 1).get("end");
      var outjson = {
        title: thisModel.get("digest").get("title"),
        author: thisModel.get("digest").get("author"),
        chapters: chapters
      };
      return outjson;
    }
  });
});