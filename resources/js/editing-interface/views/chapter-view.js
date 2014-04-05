
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/chapter-template.html", "editing-interface/views/compound-view", "editing-interface/views/section-view", "editing-interface/views/collection-view"], function (Backbone, _, $, tmpl, CompoundBackboneView, SectionView, CollectionView) {

  var consts = {
    sectionWrapClass: "summary-column",
    viewClass: "chapter row"
  };

  return CompoundBackboneView.extend({
    template: _.template(tmpl),
    className: consts.viewClass,

    initialize: function () {
      var thisView = this;
      thisView.listenTo(thisView.model.get("sections"), "add", thisView.render);
    },


    /**
     * return the {selector: rendered element} object used in the superclass render function
     */
    getAssignedObject: function () {
      var thisView = this;

      // prep the subviews
      // prep the subviews TODO iterate over all chapters
      thisView.sectionsView = thisView.sectionsView || new CollectionView({model: thisView.model.get("sections")});
      thisView.sectionsView.ComponentView = SectionView;

      // now add the digest and transcript view components to the editor template shell using the assign method
      var assignObj = {};
      assignObj["." + consts.sectionWrapClass] = thisView.sectionsView;

      return assignObj;
    }
  });
});
