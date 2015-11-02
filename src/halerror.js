'use strict';

angular.module('hypermedia')

  .run(function ($q, ResourceContext, HalError) {
    var vndErrorHandler = function (response) {
      response.error = new HalError(response.data);

      return $q.reject(response);
    };

    ResourceContext.registerErrorHandler('application/vnd+error', vndErrorHandler);
  })

  .factory('HalError', function () {
    var HalError = function (data) {
      var self = this;
      this.message = data.message;
      this.errors = [];

      var embeds = (data._embedded ? data._embedded['ilent:error'] : undefined);
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
