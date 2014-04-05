
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
      var thisModel = this;
      thisModel.listenTo(thisModel.get("chapters"), "add", function (newChap) {
        window.setTimeout(function(){newChap.get("startWord").set("startSection", true);}, 200);
      });
    }
  });
});
