
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/editing-template.html", "editing-interface/views/compound-view", "editing-interface/views/digest-view",
        "editing-interface/views/transcript-view", "editing-interface/models/chapter-model", "editing-interface/models/section-model", "editing-interface/utils/utils", "toastr"], function (Backbone, _, $, tmpl, CompoundBackboneView, DigestView, TranscriptView, ChapterModel, SectionModel, Utils, toastr) {

          var consts = {
            digestWrapId: "digest-wrap",
            transWrapId: "transcript-wrap",
            viewClass: "editor-wrap",
            RETURN_KEY_CODE: 13,
            ESCAPE_KEYCODE: 27,
            F1_KEYCODE: 112,
            F2_KEY_CODE:113,
            SPACE_KEYCODE: 32
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
              },
              "click #preview-vdigest": "previewVDigest",
              "click #save-vdigest": "saveVDigest",
              "click #publish-vdigest": "publishVDigest",
              "click #to-edit-vdigest": "toEditVDigest"
            },

            initialize: function () {
              var thisView = this;

              $(document.body).on("keyup", function (evt) {
                if (evt.keyCode === consts.ESCAPE_KEYCODE) {
                  var wasPlaying = false;
                  $("video").each(function (i, vid) {
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
                      var thevid = $("video")[0];
                      thevid && thevid.play();
                    }
                  }
                } else if (evt.keyCode === consts.F1_KEYCODE) {
                  var blob = new window.Blob([window.JSON.stringify(thisView.model.getOutputJSON())], {type: "text/plain;charset=utf-8"});
                  window.saveAs(blob, "video-digest.json");
                } else if (evt.keyCode === consts.F2_KEY_CODE) {
                  $('input[type=file]').one("change", function() {
                    thisView.handleUpload(this);
                  });
                  $('input[type=file]').trigger('click');
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
                var el = thisView.$el.find("#" + consts.transWrapId).jScrollPane({autoReinitialise: true, autoReinitialiseDelay: 2000});

                // TODO bad globals
                window.jspApi = el.data("jsp");

                $('.editor-wrap').contextPopup({
                  items: [
                    {label:'auto-segment',
                     action: function() {
                      if (confirm("Are you sure you want to auto-segment this video digest? This will erase all of your current edits.")) {
                        // show loading screen
                        var loadDiv = document.createElement("div");
                        loadDiv.className = "full-cover-loading";
                        loadDiv.innerHTML = "Segmenting...";
                        window.document.body.appendChild(loadDiv);
                        $.get("/autoseg/" + window.dataname)
                        .success(function (resp) {
                          if (resp.breaks) {
                            var sbreaks = eval(resp.breaks);
                            // remove all current sections
                            // iterate over the transcript and place breaks when appropriate
                            var sentCount = 1,
                                nextWordIsSec = false,
                                curSent = 0;
                            thisView.model.get("transcript").get("words").each(function (wrd, i) {
                              if (i > 0) {
                                wrd.set("startChapter", false);
                                if (wrd.prev.get("sentenceNumber") !== wrd.get("sentenceNumber") && sbreaks.indexOf(wrd.get("sentenceNumber")) > -1) {
                                  wrd.set("startSection", true);
                                } else {
                                  wrd.set("startSection", false);
                                }
                              }
                            });

                          }
                          console.log(resp);
                        })
                        .error(function () {
                        })
                        .complete(function () {
                          loadDiv.parentElement.removeChild(loadDiv);
                        });
                      }
                    } },
                    {label:'auto-summarize',    action:function() {  } }
                  ]});
              }, 100);

              // split section components
            },

            /**
             * return the {selector: rendered element} object used in the superclass render function
             */
            getAssignedObject: function () {
              var thisView = this;

              // prep the subviews
              thisView.digestView = thisView.digestView || new DigestView({model: thisView.model.get("digest")});
              thisView.transView = thisView.transView || new TranscriptView({model: thisView.model.get("transcript")});
              window.transView = thisView.transView;

              // now add the digest and transcript view components to the editor template shell using the assign method
              var assignObj = {};
              assignObj["#" + consts.digestWrapId] = thisView.digestView;
              assignObj["#" + consts.transWrapId] = thisView.transView;

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

                filereader.onload = function(){
                  var txtRes = filereader.result;
                  var jsonObj = JSON.parse(txtRes);
                  thisView.model.useJSONData(jsonObj);
                  window.setTimeout(function () {
                    $("#" + consts.digestWrapId).scrollTop(0);
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
              var locSplit = window.location.hash.split("/");
              window.location.hash = "preview/" + locSplit.slice(1).join("/");
            },

            publishVDigest: function () {
              var thisView = this;
              if (window.confirm("are you ready to publish this digest?")) {
                $.ajax({
                    url: "/digestpublish/" + window.dataname,
                    data: JSON.stringify({"publish": true, _csrf: window._csrf}),
                    type: "post",
                    contentType: "application/json",
                    success: function (resp) {
                      toastr.success("published!");
                      if (resp && resp.puburl ) {
                        window.open(resp.puburl, "_blank");
                      }
                    },
                  error: function (resp) {
                    toastr.error((resp && resp.responseJSON && resp.responseJSON.error) || "unable to publish -- please try again");
                  }
                });
              }
            },

            toEditVDigest: function () {
              var locSplit = window.location.hash.split("/");
              window.location.hash = "edit/" + locSplit.slice(1).join("/");
            },

            saveVDigest: function () {
              var thisView = this,
                  outpjson = {};
              outpjson.object = thisView.model.get("digest").toJSON();
              outpjson["_csrf"] = window._csrf;
              $.ajax({
                url: "/digestdata/" + window.dataname,
                data: JSON.stringify(outpjson),
                type: "post",
                contentType: "application/json",
                success: function () {
                  toastr.success("save successful");
                },
                error: function (resp) {
                  toastr.error((resp && resp.responseJSON && resp.responseJSON.error) || "unable to save -- please try again");
                }
              });
            }
          });
        });
