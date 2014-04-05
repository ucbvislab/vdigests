
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/editing-template.html", "editing-interface/views/compound-view", "editing-interface/views/digest-view",
        "editing-interface/views/transcript-view", "editing-interface/models/chapter-model", "editing-interface/models/section-model"], function (Backbone, _, $, tmpl, CompoundBackboneView, DigestView, TranscriptView, ChapterModel, SectionModel) {

          var consts = {
            digestWrapClass: "digest-wrap",
            transWrapClass: "transcript-wrap",
            viewClass: "editor-wrap",
            RETURN_KEY_CODE: 13
          };

          return CompoundBackboneView.extend({
            template: _.template(tmpl),

            className: consts.viewClass,

            events: {
              "keydown": function (evt) {
                if (evt.keyCode === consts.RETURN_KEY_CODE) {
                  // enter should always blur
                  evt.target.blur();
                  evt.stopPropagation();
                  evt.preventDefault();
                }
              }
            },

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
