
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/collections/section-collection", "editing-interface/models/section-model"], function (Backbone, _, $, SectionCollection, SectionModel) {

  return Backbone.Model.extend({
    defaults: function () {
      return {
        sections: new SectionCollection(),
        start_word: null,
        title: ""
      };
    },

    initialize: function () {
      // FIXME HACK
      this.set("vct", window.vct++);
    }
  });

});
