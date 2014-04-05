
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
      'keyup .abs-summary': "summaryKeyUp"
    },

    initialize: function () {
      var thisView = this;
      thisView.listenTo(thisView.model, "change:thumbnail", function (mdl) {
        var $img = $("<img>");
        $img.addClass(consts.thumbClass);
        $img.attr("src", mdl.get("thumbnail").get("data"));
        thisView.$el.find("." + consts.keyframeClass).html($img);
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
    }

  });
});
