
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/section-template.html"], function (Backbone, _, $, tmpl) {
  var consts = {
    className: "section-row",
    keyframeClass: "keyframe-col",
    thumbClass: "section-thumbnail",
    takeThumbClass: "take-thumbnail-image",
    summaryDivClass: "abs-summary",
    activeClass: "active",
    secWordClass: "secword",
    splitDownClass: "split-down",
    mergeUpClass: "merge-up"

  };

  return Backbone.View.extend({
    template: _.template(tmpl),
    id: function () {
      return this.model.cid;
    },
    className: function () {
      var retName =  consts.className  + (this.model.get("active") ? " " + consts.activeClass : "");
      retName += this.model.get("summary").length ? "" : " empty";
      return retName;
    },

    events: {
      'keyup .abs-summary': "summaryKeyUp",
      "click .remove-section": "removeSection",
      "blur .abs-summary": "blurSummary",
      "focus .abs-summary": "focusSummary",
      "click" : "clickSection"
    },

    initialize: function () {
      var thisView = this,
          thisModel = thisView.model;

      // listen for thumbnail changes
      thisView.listenTo(thisModel, "change:thumbnail", function (mdl) {
        var $img = $("<img>");
        $img.addClass(consts.thumbClass);
        $img.attr("src", mdl.get("thumbnail").get("data"));
        var $kfel = thisView.$el.find("." + consts.keyframeClass);
        $kfel.find('img').remove();
        $kfel.prepend($img);
      });

      thisView.listenTo(thisModel, "change:active", function (chp, val) {
        if (val) {
          thisView.$el.addClass(consts.activeClass);
        } else {
          thisView.$el.removeClass(consts.activeClass);
        }
      });


      thisView.listenTo(thisModel, "change:summary", function (mdl, val) {
        thisView.$el.find("." + consts.summaryDivClass).html(val);
      });

      thisView.listenTo(thisModel, "gainfocus", function (mdl, val) {
        window.setTimeout(function () {
          thisView.$el.focus();
        }, 600);
      });

      // remove the view if the underlying model is removed
      thisView.listenTo(thisModel, "remove", function (mdl) {
        thisView.remove();
      });
    },

    render: function () {
      var thisView = this;
      thisView.$el.html(thisView.template(thisView.model.attributes));
      // apply the dynamic classname
      thisView.$el.attr('class', _.result(this, 'className'));
      window.setTimeout(function () {
        thisView.el.focus();
      }, 500);
      return thisView;
    },

    blurSummary: function () {
      var thisView = this,
          startWord = thisView.model.get("startWord");
      thisView.$el.removeClass("focused");
      thisView.$el.attr('class', _.result(thisView, 'className'));
      startWord.trigger("unhighlight-section", startWord);
    },

    focusSummary: function (evt) {
      var thisView = this,
          startWord = thisView.model.get("startWord");
      thisView.$el.addClass("focused");
      startWord.trigger("unhighlight-section", startWord);
      startWord.trigger("highlight-section", startWord);
    },

    summaryKeyUp: function (evt) {
      var thisView = this,
      $curTar = $(evt.currentTarget),
      text = $curTar.text();
      if (text !== thisView.model.get("summary")) {
        thisView.model.set("summary", text);
        // USE STATS
        window.vdstats.nSummaryEdits.push((new Date()).getTime());
      }
      //this.$el.attr('class', _.result(this, 'className'));
    },

    removeSection: function (evt) {
      var thisView = this,
          thisModel = thisView.model;
      // TODO for now, make sure it's not the first section
      if (window.confirm("Are you sure you want to remove this section?")) {
        thisModel.get("startWord").set("startSection", false);
      }
    },

    takeThumbnailImage: function (evt) {
      var thisView = this,
          thisModel = thisView.model;
      thisModel.trigger("captureThumbnail", thisModel);
      evt.stopPropagation();

      // USE STATS
      window.vdstats.nKeyFrameChanges.push((new Date()).getTime());
    },

    startVideo: function () {
      var thisView= this,
          thisModel = thisView.model;
      thisModel.trigger("startVideo", thisModel.get("startWord").get("start"));
    },

    mergeSectionUp: function() {
      if (window.transView) {
        var thisView = this,
            stWord = thisView.model.get("startWord"),
            pchapModel = stWord.getPrevChapterStart(true);


        // TODO have to get chapter start, change it
        window.vdstats.nChap2Sec.push((new Date()).getTime());
        window.changingSecChap = true;

        // make sure we're not changing the first chapter
        if (pchapModel.getPrevSectionStart()) {
          pchapModel.set("startChapter", false);
          window.transView.changeStartSection(pchapModel, true);
          // USE STATS
          window.changingSecChap = false;
        }

        // get the next section (if it exists and change to a chapter)
        var nxtSecWord = stWord.getNextSectionStart();
        if (nxtSecWord) {
          window.transView.changeStartSection(nxtSecWord, false);
          nxtSecWord.set("startChapter", true);
        }

      } else {
        alert("unable to split chapter -- transcript object did not load correctly. Try saving then reloading.");
      }

    },

    splitSectionDown: function () {
        if (window.transView) {
          var thisView = this,
              stWordModel = thisView.model.get("startWord");

          // USE STATS
          window.vdstats.nSec2Chap.push((new Date()).getTime());
          window.changingSecChap = true;

          window.transView.changeStartSection(stWordModel, false);
          stWordModel.set("startChapter", true);
        } else {
          alert("unable to split chapter -- transcript object did not load correctly. Try saving then reloading.");
        }
    },

    clickSection: function (evt) {
      var thisView = this,
          startWord = thisView.model.get("startWord"),
          $tar = $(evt.target);

      if ($tar.hasClass(consts.takeThumbClass)) {
        thisView.takeThumbnailImage(evt);
      } else if ($tar.hasClass(consts.thumbClass) || window.viewing) {
        thisView.startVideo();
      } else if ($tar.hasClass(consts.splitDownClass)) {
        thisView.splitSectionDown();
      } else if ($tar.hasClass(consts.mergeUpClass)) {
        thisView.mergeSectionUp();
      } else {
        startWord.trigger("focus", startWord);
        thisView.$el.find("." + consts.summaryDivClass).focus();
      }
    }
  });
});
