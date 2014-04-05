
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/digest-template.html", "editing-interface/views/compound-view", "editing-interface/views/collection-view", "editing-interface/views/chapter-view"], function (Backbone, _, $, tmpl, CompoundBackboneView, CollectionView, ChapterView) {

  var consts = {
    chapterWrapClass: "digest-chapters-wrap"
  };

  return CompoundBackboneView.extend({
    template: _.template(tmpl),

    initialize: function () {
      var thisView = this;
      thisView.listenTo(thisView.model.get("chapters"), "add", thisView.render);
    },

    /**
     * return the {selector: rendered element} object used in the superclass render function
     */
    getAssignedObject: function () {
      var thisView = this;

      // prep the subviews TODO iterate over all chapters
      thisView.chaptersView = thisView.chaptersView || new CollectionView({model: thisView.model.get("chapters")});
      thisView.chaptersView.ComponentView = ChapterView;

      // now add the digest and transcript view components to the editor template shell using the assign method
      var assignObj = {};
      assignObj["." + consts.chapterWrapClass] = thisView.chaptersView;

      return assignObj;
    }
  });
});
