
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/collections/section-collection", "editing-interface/models/section-model"], function (Backbone, _, $, SectionCollection, SectionModel) {

  return Backbone.Model.extend({
    defaults: function () {
      return {
        sections: new SectionCollection(),
        video: null,
        title: ""
      };
    },

    initialize: function () {
      var thisModel = this;
      // each chapter should have at least one section
      if (thisModel.get("sections").length === 0) {
        thisModel.get("sections").add(new SectionModel());
      }
    }
  });

});
