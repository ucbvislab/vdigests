
/*global define*/
define(["backbone", "editing-interface/models/chapter-model"], function(Backbone, ChapterModel){
  return Backbone.Collection.extend({
    model: ChapterModel
  });
});
