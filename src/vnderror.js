'use strict';

angular.module('hypermedia')

  .run(function ($q, ResourceContext, VndError) {
    var vndErrorHandler = function (response) {
      return new VndError(response.data);
    };

    ResourceContext.registerErrorHandler('application/vnd+error', vndErrorHandler);
  })

  .factory('VndError', function () {
    var HalError = function (data) {
      var self = this;
      this.message = data.message;
      this.errors = [];

      var embeds = (data._embedded ? data._embedded.errors : undefined);
      if (embeds) {
        if (!Array.isArray(embeds)) {
          embeds = [embeds];
        }
        embeds.forEach(function (embed) {
          self.errors.push(new HalError(embed));
        });
      }
    };

    return HalError;
  })


;
