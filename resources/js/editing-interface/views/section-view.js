
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/section-template.html"], function (Backbone, _, $, tmpl) {
  var consts = {
    className: "row section-row",
    keyframeClass: "keyframe-col",
    thumbClass: "section-thumbnail",
    summaryDivClass: "abs-summary"
  };

  return Backbone.View.extend({
    template: _.template(tmpl),
    id: function () {
      return this.model.cid;
    },
    className: consts.className,

    events: {
      'keyup .abs-summary': "summaryKeyUp",
      "click .remove-section": "removeSection",
      "click .take-thumbnail-image": "takeThumbnailImage",
      "click .keyframe-col": "startVideo"
    },

    initialize: function () {
      var thisView = this,
          thisModel = thisView.model;

      // listen for thumbnail changes
      thisView.listenTo(thisModel, "change:thumbnail", function (mdl) {
        var $img = $("<img>");
        $img.addClass(consts.thumbClass);
        $img.attr("src", mdl.get("thumbnail").get("data"));
        thisView.$el.find("." + consts.keyframeClass).html($img);
      });

      thisView.listenTo(thisModel, "change:summary", function (mdl, val) {
        thisView.$el.find("." + consts.summaryDivClass).html(val);
      });

      // remove the view if the underlying model is removed
      thisView.listenTo(thisModel, "remove", function (mdl) {
        thisView.remove();
      });
    },

    render: function () {
      var thisView = this;
      thisView.$el.html(thisView.template(thisView.model.toJSON()));
      return thisView;
    },

    summaryKeyUp: function (evt) {
      var thisView = this,
      $curTar = $(evt.currentTarget);
      thisView.model.set("summary", $curTar.text());
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
      console.log("capturing thumbnail image.");
    },

    startVideo: function () {
      var thisView= this,
          thisModel = thisView.model;
      thisModel.trigger("startVideo", thisModel.get("startWord").get("start"));
    }
  });
});
