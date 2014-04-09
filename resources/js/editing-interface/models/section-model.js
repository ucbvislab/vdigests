
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/collections/section-collection"], function (Backbone, _, $, SectionCollection) {

  return Backbone.Model.extend({
    defaults: function () {
      return {
        summary: "",
        startWord: null,
        thumbnail: null
      };
    },

    initialize: function () {
      var thisModel = this,
          startWord = thisModel.get("startWord");
      thisModel.switchStartWordListeners(null, startWord);
    },

    switchStartWordListeners: function (oldWord, newWord) {
      var thisModel = this;
      thisModel.set("startWord", newWord);
      thisModel.listenToOnce(newWord, "change:switchStartWord", thisModel.switchStartWord);
      thisModel.listenTo(newWord, "change:startSection", thisModel.handleSectionChange);
      if (oldWord) {
        thisModel.stopListening(oldWord);
      }
    },

    handleSectionChange: function () {
      var thisModel = this;
      thisModel.destroy();
    }
  });
});
