
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/collections/section-collection", "editing-interface/models/section-model"], function (Backbone, _, $, SectionCollection, SectionModel) {

  return Backbone.Model.extend({
    defaults: function () {
      return {
        sections: new SectionCollection(),
        startWord: null,
        title: ""
      };
    },

    initialize: function () {
      var thisModel = this;
      // FIXME HACK to keep track of videos
      thisModel.set("vct", window.vct++);
      thisModel.listenTo(thisModel.get("startWord"), "change:switchStartWord", function (oldWord, newWord) {
        thisModel.set("startWord", newWord);
      });
    }
  });
});
