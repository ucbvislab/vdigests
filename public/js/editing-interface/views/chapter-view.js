
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/chapter-template.html", "editing-interface/views/compound-view", "editing-interface/views/section-view", "editing-interface/views/collection-view", "editing-interface/utils/utils", "editing-interface/models/thumbnail-model", "editing-interface/utils/player"], function (Backbone, _, $, tmpl, CompoundBackboneView, SectionView, CollectionView, Utils, ThumbnailModel, Player) {

  var consts = {
    sectionWrapClass: "summary-column",
    activeClass: "active",
    viewClass: "chapter",
    absSummaryClass: "abs-summary",
    chapHeaderClass: "chapter-header",
    videoWrapClass: "video-wrap",
    imgHeight: 312,
    imgWidth: 566
  };

  return CompoundBackboneView.extend({
    template: _.template(tmpl),
    className: consts.viewClass,

    events: {
      'keyup .chapter-header input': function (evt) {
        var thisView = this,
            $curTar = $(evt.currentTarget);
        thisView.typing = true;
        thisView.model.set("title", $curTar.val());
        // USE STATS
        window.vdstats.nSubtitleEdits.push((new Date()).getTime());
        thisView.typing = false;
      }
    },

    /**
     * Override
     */
    postRender: function () {
      var thisView = this,
          vel = thisView.$el.find("." + consts.videoWrapClass)[0],
          startTime = thisView.model.getStartTime();
      Player.inputVideo(vel, thisView.model.get("ytid"), thisView.model, Math.floor(startTime), startTime, "ytplayer");
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

      thisView.listenTo(thisModel, "change:title", function (mdl, val) {
        if (!thisView.typing) {
          thisView.$el.find("." + consts.chapHeaderClass + " input").val(val);
        }
      });

      // add screenshotes for existing sections
      secs.each(function (sec) {
        if (!sec.get("thumbnail")) {
          // TODO DRY
          window.setTimeout(function () {
            thisView.$el.find("#" + sec.cid + " ." + consts.absSummaryClass).focus();
            var $vid = thisView.$el.find("video");
            thisView.placeThumbnailInSec(sec);
          }, 200);
        };
      });

      // MODEL LISTENERS
      thisView.listenTo(thisModel, "destroy", function (chp) {
        thisView.remove();
      });

      thisView.listenTo(thisModel, "change:active", function (chp, val) {
        if (val) {
          thisView.$el.addClass(consts.activeClass);
        } else {
          thisView.$el.removeClass(consts.activeClass);
        }
      });

      // 'add' section listener
      thisView.listenTo(secs, "add", function (newSec) {
        thisView.assign(thisView.getAssignedObject());
        console.log("adding a section in the chapter view");
        if (!thisView.model.swapping) {
          thisView.placeThumbnailInSec(newSec);
        }
        newSec.handleGainFocus();
      });

      // 'remove' section listener
      thisView.listenTo(secs, "remove", function (remSec) {
        var nsecs = secs.length;
        if (nsecs === 0) {
          // we're out of sections: delete the chapter
          thisView.model.ytplayer
            && thisView.model.ytplayer.stopVideo
            && thisView.ytplayer.stopVideo();
          // TODO move this
          thisModel.get("startWord").set("startChapter", false);
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
      thisView.listenTo(thisView.model, "startVideo", thisView.startVideo);
      thisView.listenTo(thisView.model.get("sections"), "startVideo", thisView.startVideo);

      // listen for screenshot capture requests from sections
      thisView.listenTo(secs, "captureThumbnail", function (secModel) {
        var time = thisModel.ytplayer && thisModel.ytplayer.getCurrentTime && thisModel.ytplayer.getCurrentTime();
        thisView.placeThumbnailInSec(secModel, time);
      });

      // listen to transcript progression from the video
      window.setTimeout(function () {
        var $elvid = thisView.$el.find("video"),
            elvid = $elvid[0];

        // USE  STATS
        $elvid.on("seeked", function () {
          if (!window.startFromTran && !window.imgSeek) {
            window.vdstats.nVideoStartsFromVideo.push((new Date()).getTime());
          }
        });
        $elvid.on("play", function () {

          // USE STATS
          if (!window.startFromTran) {
            window.vdstats.nVideoStartsFromVideo.push((new Date()).getTime());
          }
        });

        window.prevPlayVid = thisView.model.ytplayer;
      });
    },

    /**
     * Place a thumbnail in the given section at the given time (optional time)
     */
    placeThumbnailInSec: function (sec, time) {
      var thisView = this;
      time = time || sec.getStartTime();
      window.setTimeout(function () {
        thisView.$el.find("#" + sec.cid + " ." + consts.absSummaryClass).focus();
      }, 200);

      Utils.getScreenShot(thisView.model.get("ytid"), time, function (newImgData) {
        sec.set("thumbnail", new ThumbnailModel({data: newImgData, image_time: time}));
      }, consts.imgWidth, consts.imgHeight);
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
    },

    startVideo: function (stTime) {
      var thisView = this;
      thisView.model.ytplayer.seekTo(stTime);
      thisView.model.ytplayer.playVideo();
    }
  });
});
