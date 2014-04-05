
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/collections/chapter-collection", "editing-interface/models/chapter-model"], function (Backbone, _, $, ChapterCollection, ChapterModel) {

  return Backbone.Model.extend({
    defaults: function () {
      return {
        title: "",
        chapters: new ChapterCollection()
      };
    },

    initialize: function () {
      var thisView = this;
      // make sure each digest has at least 1 chapter
      if (thisView.get("chapters").length === 0) {
        thisView.get("chapters").add(new ChapterModel());
      }
    }
  });

});
