
/*global define*/
define(["backbone", "editing-interface/models/section-model"], function(Backbone, SectionModel){
  return Backbone.Collection.extend({
    model: SectionModel
  });
});
