
/*global define */
define(["backbone", "underscore", "jquery"], function (Backbone, _, $) {
  return Backbone.Model.extend({
    defaults: function () {
      return {
        data: "",
        image_time: -1
      };
    }
  });
});
