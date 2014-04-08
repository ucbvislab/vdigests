
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/section-template.html"], function (Backbone, _, $, tmpl) {
  var consts = {
    className: "row section-row",
    keyframeClass: "keyframe-col",
    thumbClass: "section-thumbnail"
  };

  return Backbone.View.extend({
    template: _.template(tmpl),
    id: function () {
      return this.model.cid;
    },
    className: consts.className,

    events: {
      'keyup .abs-summary': "summaryKeyUp",
      "click .remove-section": "removeSection"
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

      // remove the view if the underlying model is removed
      thisView.listenTo(thisModel, "remove", function (mdl) {
        thisView.remove();
        thisModel.get("startWord").set("startSection", false);
        thisModel.get("startWord").set("startChapter", false);
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
        thisModel.collection.remove(thisModel);
        console.log("deleted");
      }
    }
  });
});
