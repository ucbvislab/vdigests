
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/digest-template.html", "editing-interface/views/compound-view", "editing-interface/views/collection-view", "editing-interface/views/chapter-view"], function (Backbone, _, $, tmpl, CompoundBackboneView, CollectionView, ChapterView) {

  var consts = {
    chapterWrapClass: "digest-chapters-wrap",
    chapterClass: "chapter"
  };

  return CompoundBackboneView.extend({
    template: _.template(tmpl),

    events: {
      "keyup .digest-title-wrap h1": function (evt) {
          var thisView = this;
        thisView.model.set("title", $(evt.currentTarget).text());
      }
    },

    initialize: function () {
      var thisView = this,
          chaps = thisView.model.get("chapters");

      // add chapters
      thisView.listenTo(chaps, "add", function (newChap) {
        var cindex = chaps.indexOf(newChap),
            $chapEls = thisView.$el.find("." + consts.chapterClass),
            newChapView = new ChapterView({model: newChap}),
            $newEl = newChapView.render().$el;
        if (cindex > 0) {
          $chapEls.eq(cindex-1).after($newEl);
        } else {
          thisView.$el.find("." + consts.chapterWrapClass).prepend($newEl);
        }
      });

      // remove chapters
      thisView.listenTo(chaps, "remove", function (removedChap) {
        thisView.$el.find("#" + removedChap.cid).remove();
      });
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
