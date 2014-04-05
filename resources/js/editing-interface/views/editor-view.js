
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/editing-template.html", "editing-interface/views/compound-view", "editing-interface/views/digest-view",
  "editing-interface/views/transcript-view"], function (Backbone, _, $, tmpl, CompoundBackboneView, DigestView, TranscriptView) {

  var consts = {
    digestWrapClass: "digest-wrap",
    transWrapClass: "transcript-wrap",
    viewClass: "editor-wrap"
  };

  return CompoundBackboneView.extend({
    template: _.template(tmpl),

    className: consts.viewClass,

    /**
     * return the {selector: rendered element} object used in the superclass render function
     */
    getAssignedObject: function () {
      var thisView = this;

      // prep the subviews
      thisView.digestView = thisView.digestView || new DigestView({model: thisView.model.get("digest")});
      thisView.transView = thisView.transView || new TranscriptView({model: thisView.model.get("transcript")});

      // now add the digest and transcript view components to the editor template shell using the assign method
      var assignObj = {};
      assignObj["." + consts.digestWrapClass] = thisView.digestView;
      assignObj["." + consts.transWrapClass] = thisView.transView;

      return assignObj;
    }
  });
});
