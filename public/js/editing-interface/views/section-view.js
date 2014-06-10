
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/section-template.html"], function (Backbone, _, $, tmpl) {
  var consts = {
    className: "section-row",
    keyframeClass: "keyframe-col",
    thumbClass: "section-thumbnail",
    takeThumbClass: "take-thumbnail-image",
    summaryDivClass: "abs-summary",
    activeClass: "active"
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
          thisView.$el.find("." + consts.summaryDivClass)[0].focus();
        }, 200);
      });

      // remove the view if the underlying model is removed
      thisView.listenTo(thisModel, "remove", function (mdl) {
        thisView.remove();
      });
    },

    render: function () {
      var thisView = this;
      thisView.$el.html(thisView.template(thisView.model.toJSON()));
      // apply the dynamic classname
      thisView.$el.attr('class', _.result(this, 'className'));
      return thisView;
    },

    blurSummary: function () {
      this.$el.attr('class', _.result(this, 'className'));
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
    },

    removeSection: function (evt) {
      var thisView = this,
          thisModel = thisView.model;
      // TODO for now, make sure it's not the first section
      if (window.confirm("Are you sure you want to remove this section?")) {
        thisModel.get("startWord").set("startSection", false);
        console.log("section deleted");
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

    clickSection: function (evt) {
      var thisView = this,
          startWord = thisView.model.get("startWord"),
          $tar = $(evt.target);

      if ($tar.hasClass(consts.takeThumbClass)) {
        thisView.takeThumbnailImage(evt);
      } else if ($tar.hasClass(consts.thumbClass) || window.viewing) {
        thisView.startVideo();
      } else {
        startWord.trigger("focus", startWord);
        thisView.$el.find("." + consts.summaryDivClass).focus();
      }
    }
  });
});
