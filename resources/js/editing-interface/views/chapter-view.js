
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/chapter-template.html", "editing-interface/views/compound-view", "editing-interface/views/section-view", "editing-interface/views/collection-view", "editing-interface/utils/utils", "editing-interface/models/thumbnail-model"], function (Backbone, _, $, tmpl, CompoundBackboneView, SectionView, CollectionView, Utils, ThumbnailModel) {

  var consts = {
    sectionWrapClass: "summary-column",
    viewClass: "chapter row",
    absSummaryClass: "abs-summary"
  };

  return CompoundBackboneView.extend({
    template: _.template(tmpl),
    className: consts.viewClass,

    events: {
      'keyup .chapter-header input': function (evt) {
        var thisView = this,
            $curTar = $(evt.currentTarget);
        thisView.set("title", $curTar.val());
      }
    },

    initialize: function () {
      var thisView = this,
          thisModel = thisView.model;
      thisView.listenTo(thisView.model.get("sections"), "add", function (newSec) {
        thisView.assign(thisView.getAssignedObject());
        window.setTimeout(function () {
          thisView.$el.find("#" + newSec.cid + " ." + consts.absSummaryClass).focus();

          var $vid = thisView.$el.find("video");
          Utils.seekThenCaptureImgTime($vid, newSec.get("startWord").get("start"), function (newImgData) {
            newSec.set("thumbnail", new ThumbnailModel({data: newImgData}));
          });
        }, 200);
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
