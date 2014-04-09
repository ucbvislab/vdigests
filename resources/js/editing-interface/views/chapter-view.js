
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/chapter-template.html", "editing-interface/views/compound-view", "editing-interface/views/section-view", "editing-interface/views/collection-view", "editing-interface/utils/utils", "editing-interface/models/thumbnail-model"], function (Backbone, _, $, tmpl, CompoundBackboneView, SectionView, CollectionView, Utils, ThumbnailModel) {

  var consts = {
    sectionWrapClass: "summary-column",
    viewClass: "chapter row",
    absSummaryClass: "abs-summary"
  };

  var playOneVideo = function (vid, time) {
    vid.currentTime = time;
    $(document.body).find("video").each(function (i, vid) {
      vid.pause();
    });
    console.log(vid);
    vid.play();
  };

  return CompoundBackboneView.extend({
    template: _.template(tmpl),
    className: consts.viewClass,

    events: {
      'keyup .chapter-header input': function (evt) {
        var thisView = this,
            $curTar = $(evt.currentTarget);
        thisView.model.set("title", $curTar.val());
      }
    },

    /**
     * Only render the summaries (avoid re-rendering the video)
     */
    renderSummariesOnly: function () {
      var thisView = this;
      thisView.assign(thisView.getAssignedObject());
    },

    initialize: function () {
      var thisView = this,
          thisModel = thisView.model,
          secs = thisModel.get("sections");

      // add screenshotes for existing sections
      secs.each(function (sec) {
        if (!sec.get("thumbnail")) {
          // TODO DRY
          window.setTimeout(function () {
            thisView.$el.find("#" + sec.cid + " ." + consts.absSummaryClass).focus();
            var $vid = thisView.$el.find("video");
            thisView.placeThumbnailInSec(sec);
          }, 500);
        };
      });

      thisView.listenTo(thisModel, "destroy", function (chp) {
        thisView.remove();
      });

      // 'add' section listener
      thisView.listenTo(secs, "add", function (newSec) {
        thisView.assign(thisView.getAssignedObject());
        console.log("adding a section in the chapter view");
        // pause to let other events finish
        window.setTimeout(function () {
            thisView.placeThumbnailInSec(newSec);
        }, 200);
      });

      // 'remove' section listener
      thisView.listenTo(secs, "remove", function (remSec) {
        var nsecs = secs.length;
        if (nsecs === 0) {
          // we're out of sections: delete the chapter
          thisView.$el.find("video").get(0).pause();
          // TODO move this
          thisModel.get("startWord").set("startChapter", false);
          //thisModel.collection.remove(thisModel);
          // thisModel.get("startWord").set("startChapter", false);
          // thisModel.get("startWord").set("startSection", false);
          // TODO should this go here?
          thisView.remove();
        } else if (remSec.get("startWord").cid === thisModel.get("startWord").cid){
          // we deleted the leading section but have another section that we can make the leading section
          var newStartWord = thisModel.get("sections").models[0].get("startWord"),
              oldStartWord = thisModel.get("startWord");
          newStartWord.set("startChapter", true, {silent: true});
          // inform listeners that the word has changed from a section start to a chapter start
          newStartWord.trigger("sectionToChapter", newStartWord);
          oldStartWord.trigger("change:switchStartWord", oldStartWord, newStartWord);
        }
      });

      // listen for play events from the underlying chapter
      thisView.listenTo(thisView.model, "startVideo", function (stTime) {
        var $vid = thisView.$el.find("video"),
            vid = $vid[0];
        try {
          playOneVideo(vid, stTime);
        } catch (e) {
          $vid.one("canplay", function () {
            playOneVideo(vid, stTime);
          });
        }
      });

      // listen for screenshot capture requests from sections
      thisView.listenTo(secs, "captureThumbnail", function (secModel) {
        var time = thisView.$el.find("video")[0].currentTime;
        thisView.placeThumbnailInSec(secModel, time);
      });

      // listen to transcript progression from the video
      window.setTimeout(function () {
        var $elvid = thisView.$el.find("video"),
            elvid = $elvid[0];
        // only play one video at a time
        $elvid.on("play", function () {
          $("video").each(function (i, vid) {
            if (vid != elvid){
              vid.pause();
            }
          });
        });
        $elvid.on("timeupdate", function () {
          var ct = $elvid.get(0).currentTime + 0.1, // add 0.1 so the transcript update appears instant
              words = thisModel.get("startWord").collection;
          // TODO this is baaad architecture
          var hlWords = words.each(function (wrd) {
            wrd.set("highlight", wrd.get("start") < ct && wrd.get("end") > ct);
          });
        });
      }, 300);
    },

    /**
     * Place a thumbnail in the given section at the given time (optional time)
     */
    placeThumbnailInSec: function (sec, time) {
      var thisView = this;
      time = time || sec.get("startWord").get("start");
      thisView.$el.find("#" + sec.cid + " ." + consts.absSummaryClass).focus();
      var $vid = thisView.$el.find("video");
      Utils.seekThenCaptureImgTime($vid, time, function (newImgData) {
        sec.set("thumbnail", new ThumbnailModel({data: newImgData, time: time}));
      });
    },

    /**
     * return the {selector: rendered element} object used in the superclass render function
     */
    getAssignedObject: function () {
      var thisView = this;

      // prep the subviews
      // prep the subviews TODO iterate over all chapters
      thisView.sectionsView = thisView.sectionsView || new CollectionView({model: thisView.model.get("sections")});
      thisView.sectionsView.ComponentView = SectionView;

      // now add the digest and transcript view components to the editor template shell using the assign method
      var assignObj = {};
      assignObj["." + consts.sectionWrapClass] = thisView.sectionsView;

      return assignObj;
    }
  });
});
