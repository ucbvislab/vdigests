/*global define*/
define(["backbone", "underscore", "jquery", "toastr", "text!templates/ytinfo-template.html"], function (Backbone, _, $, toastr, ytinfoTemplate) {
    var consts = {
      viewId: "video-form",
      pageHeaderClass: "page-header",
      firstFormClass: "first-form",
      secondFormClass: "second-form",
      thirdFormClass: "third-form",
      loadingClass: "loading",
      tranUploadId: "tranupload",
      processingFormClass: "processing-form",
      finalUrlClass: "finalurl",
      intrmId: "intrmid",
      yttitleId: "yttitle"
    };
    return Backbone.View.extend({
      el: document.getElementById(consts.viewId),

      initialize: function (inp) {
        this.router = inp.router;
      },

      render: function () {
        var thisView = this;
        thisView.$el.find("form").ajaxForm({
          beforeSubmit: function () {
            thisView.$el.addClass(consts.loadingClass);
          },
          complete: function () {
            thisView.$el.removeClass(consts.loadingClass);
          },
          success: function () {
            thisView.handleFormSuccess.apply(thisView, arguments);
          },
          error: function () {
            thisView.handleFormError.apply(thisView, arguments);
          }
        });
      },

      handleFormSuccess: function (resobj) {
        var thisView = this,
            $el = thisView.$el;
        if ($el.hasClass(consts.firstFormClass)) {
          var ytinfoHtml = _.template(ytinfoTemplate, resobj);
          thisView.$el.find("." + consts.pageHeaderClass).html(ytinfoHtml);
          thisView.$el.find("#" + consts.yttitleId).val(resobj.title);
          thisView.$el.removeClass(consts.firstFormClass);
          thisView.$el.addClass(consts.secondFormClass);
        } else if ($el.hasClass(consts.secondFormClass)){
          if (resobj.intrmid) {
            thisView.intrmid = resobj.intrmid;
            thisView.$el.removeClass(consts.secondFormClass);
            thisView.$el.addClass(consts.thirdFormClass);
            var $finalUrls = thisView.$el.find("." + consts.finalUrlClass),
            finalHref = window.location.href + "#edit/" + resobj.intrmid;
            thisView.finalHref = finalHref;
            $finalUrls.each(function (i, el) {
                el.innerHTML = finalHref;
                el.href = finalHref;
            });
            $("#" + consts.tranUploadId).val("");
            $("#" + consts.intrmId).val(resobj.intrmid);
          } else {
            toastr.error("unable to process request correctly: try resubmitting");
          }
          // thisView.router.navVideoId(resobj.contentid);
        } else {
          thisView.$el.removeClass(consts.thirdFormClass);
          thisView.$el.addClass(consts.processingFormClass);
          // final class -- check the status until it is finished
          var checkStatus = function () {
            window.setTimeout(function () {
              $.get("/checkstatus?id=" + thisView.intrmid, function (resp) {
                if (resp.status == 1) {
                  thisView.$el.removeClass(consts.processingFormClass);
                  thisView.$el.hide();
                  window.location = thisView.finalHref;
                } else {
                  //still waiting
                  checkStatus();
                }
              });
            }, 10000);
          };
          checkStatus();
        }
      },

      handleFormError: function (errResp) {
        var thisView = this;
        toastr.error( (errResp.responseJSON && errResp.responseJSON.error) || "error processing the form" );
      }
    });
});
