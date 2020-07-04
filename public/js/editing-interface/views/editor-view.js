/*global define */
define([
  'backbone',
  'underscore',
  'jquery',
  'text!templates/editing-template.html',
  'editing-interface/views/compound-view',
  'editing-interface/views/digest-view',
  'editing-interface/views/transcript-view',
  'editing-interface/models/chapter-model',
  'editing-interface/models/section-model',
  'editing-interface/utils/utils',
  'toastr',
  'micromodal',
], function (
  Backbone,
  _,
  $,
  tmpl,
  CompoundBackboneView,
  DigestView,
  TranscriptView,
  ChapterModel,
  SectionModel,
  Utils,
  toastr,
  micromodal
) {
  var consts = {
    digestWrapId: 'digest-wrap',
    transWrapId: 'transcript-wrap',
    viewClass: 'editor-wrap',
    RETURN_KEY_CODE: 13,
    ESCAPE_KEYCODE: 27,
    F1_KEYCODE: 112,
    F2_KEY_CODE: 113,
    SPACE_KEYCODE: 32,
    S_KEYCODE: 83,
  };

  return CompoundBackboneView.extend({
    template: _.template(tmpl),
    className: consts.viewClass,
    events: {
      keydown: function (evt) {
        if (evt.keyCode === consts.RETURN_KEY_CODE && !evt.shiftKey) {
          // enter should always blur
          evt.target.blur();
          evt.stopPropagation();
          evt.preventDefault();
        }
      },
      'click #preview-vdigest': 'previewVDigest',
      'click #save-vdigest': 'saveVDigest',
      'click #publish-vdigest': 'showPublishModal',
      'click #to-edit-vdigest': 'toEditVDigest',
    },

    initialize: function () {
      var thisView = this;

      $('#publish-modal-publish').off('click');
      $('#publish-modal-publish').on('click', function (evt) {
        thisView.publishVDigest();
      });

      $('#publish-modal-unpublish').off('click');
      $('#publish-modal-unpublish').on('click', function (evt) {
        thisView.unpublishVDigest();
      });

      $(document.body).on('keydown', function (evt) {
        if (evt.keyCode === consts.ESCAPE_KEYCODE) {
          var wasPlaying = false;
          $('video').each(function (i, vid) {
            if (!vid.paused) {
              wasPlaying = true;
              vid.pause();
            }
          });
          if (!wasPlaying) {
            if (window.prevPlayVid) {
              window.prevPlayVid.play();
              evt.stopPropagation();
            } else {
              var thevid = $('video')[0];
              thevid && thevid.play();
            }
          }
        } else if (evt.keyCode === consts.F1_KEYCODE) {
          var blob = new window.Blob(
            [window.JSON.stringify(thisView.model.getOutputJSON())],
            { type: 'text/plain;charset=utf-8' }
          );
          window.saveAs(blob, 'video-digest.json');
        } else if (evt.keyCode === consts.F2_KEY_CODE) {
          $('input[type=file]').one('change', function () {
            thisView.handleUpload(this);
          });
          $('input[type=file]').trigger('click');
        } else if (
          evt.keyCode === consts.S_KEYCODE &&
          (evt.metaKey || evt.ctrlKey)
        ) {
          thisView.saveVDigest();
          evt.stopPropagation();
          evt.preventDefault();
        }
      });
    },

    /**
     * Add the custom scrollbar after the rendering
     */
    postRender: function () {
      var thisView = this;
      // FIXME jScrollPane needs to be called after DOM insertion?
      window.setTimeout(function () {
        var el = thisView.$el
          .find('#' + consts.transWrapId)
          .jScrollPane({ autoReinitialise: true, autoReinitialiseDelay: 2000 });

        // TODO bad globals
        window.jspApi = el.data('jsp');

        // TODO add the right-click functionality
        // $('#transcript-wrap').contextPopup({
        //   items: [
        //     {label:'auto-segment',
        //      action: function() {
        //       if (confirm("Are you sure you want to auto-segment this video digest? This will erase all of your current edits.")) {
        //         // show loading screen
        //         var loadDiv = document.createElement("div");
        //         loadDiv.className = "full-cover-loading";
        //         loadDiv.innerHTML = "Segmenting...";
        //         window.document.body.appendChild(loadDiv);
        //         $.get("/autoseg/" + window.dataname)
        //         .success(function (resp) {
        //           if (resp.breaks) {
        //             var sbreaks = eval(resp.breaks);
        //             // remove all current sections
        //             // iterate over the transcript and place breaks when appropriate
        //             var sentCount = 1,
        //                 nextWordIsSec = false,
        //                 curSent = 0;
        //             thisView.model.get("transcript").get("words").each(function (wrd, i) {
        //               if (i > 0) {
        //                 wrd.set("startChapter", false);
        //                 if (wrd.prev.get("sentenceNumber") !== wrd.get("sentenceNumber") && sbreaks.indexOf(wrd.get("sentenceNumber")) > -1) {
        //                   wrd.set("startSection", true);
        //                 } else {
        //                   wrd.set("startSection", false);
        //                 }
        //               }
        //             });

        //           }
        //           console.log(resp);
        //         })
        //         .error(function () {
        //         })
        //         .complete(function () {
        //           loadDiv.parentElement.removeChild(loadDiv);
        //         });
        //       }
        //     } },
        //     {label:'auto-summarize',    action:function() {  } }
        //   ]});
      }, 100);

      // split section components
    },

    /**
     * return the {selector: rendered element} object used in the superclass render function
     */
    getAssignedObject: function () {
      var thisView = this;

      // prep the subviews
      thisView.digestView =
        thisView.digestView ||
        new DigestView({ model: thisView.model.get('digest') });
      thisView.transView =
        thisView.transView ||
        new TranscriptView({ model: thisView.model.get('transcript') });
      window.transView = thisView.transView;

      // now add the digest and transcript view components to the editor template shell using the assign method
      var assignObj = {};
      assignObj['#' + consts.digestWrapId] = thisView.digestView;
      assignObj['#' + consts.transWrapId] = thisView.transView;

      return assignObj;
    },

    /**
     * Handle uploading vdigest data
     */
    handleUpload: function (uploadEl) {
      var thisView = this;

      if (window.File && window.FileReader && window.FileList && window.Blob) {
        var uploadFile = uploadEl.files[0];
        var filereader = new window.FileReader();

        filereader.onload = function () {
          var txtRes = filereader.result;
          var jsonObj = JSON.parse(txtRes);
          thisView.model.useJSONData(jsonObj);
          window.setTimeout(function () {
            $('#' + consts.digestWrapId).scrollTop(0);
          }, 500);
        };
        filereader.readAsText(uploadFile);
      } else {
        alert("Your browser won't let you upload a file...");
      }
    },

    /**
     * Transition to vdigest preview
     */
    previewVDigest: function () {
      var locSplit = window.location.hash.split('/');
      window.location.hash = 'preview/' + locSplit.slice(1).join('/');
    },

    unpublishVDigest: async function () {
      try {
        const resp = await $.ajax({
          url: '/digestpublish/' + window.dataname,
          data: JSON.stringify({
            publish: false,
            _csrf: window._csrf,
          }),
          type: 'post',
          contentType: 'application/json',
        });
        toastr.success('unpublished!');
      } catch (resp) {
        toastr.error(
          (resp && resp.responseJSON && resp.responseJSON.error) ||
            'unable to publish -- please try again'
        );
      }
    },

    publishVDigest: async function () {
      const unlisted = $('#publish-modal-unlisted').is(':checked');

      // save before publishing
      await this.saveVDigest();

      try {
        const resp = await $.ajax({
          url: '/digestpublish/' + window.dataname,
          data: JSON.stringify({
            publish: true,
            unlisted,
            _csrf: window._csrf,
          }),
          type: 'post',
          contentType: 'application/json',
        });
        toastr.success('published!');
        if (resp && resp.puburl) {
          window.open(`/view/${resp.puburl}`, '_blank');
        }
      } catch (resp) {
        toastr.error(
          (resp && resp.responseJSON && resp.responseJSON.error) ||
            'unable to publish -- please try again'
        );
      }
    },

    showPublishModal: function () {
      var thisView = this;
      micromodal.show('modal-1');
    },

    toEditVDigest: function () {
      var locSplit = window.location.hash.split('/');
      window.location.hash = 'edit/' + locSplit.slice(1).join('/');
    },

    saveVDigest: async function () {
      var thisView = this,
        outpjson = {};
      outpjson.object = thisView.model.get('digest').toJSON();
      outpjson['_csrf'] = window._csrf;
      try {
        await $.ajax({
          url: '/digestdata/' + window.dataname,
          data: JSON.stringify(outpjson),
          type: 'post',
          contentType: 'application/json',
        });
        toastr.success('save successful');
      } catch (resp) {
        toastr.error(
          (resp && resp.responseJSON && resp.responseJSON.error) ||
            'unable to save -- please try again'
        );
      }
    },
  });
});
