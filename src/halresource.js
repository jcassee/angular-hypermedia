'use strict';

angular.module('hypermedia')

  /**
   * @ngdoc type
   * @name HalResource
   * @description
   *
   * HAL resource.
   */
  .factory('HalResource', ['$log', 'HypermediaUtil', 'Resource', function ($log, HypermediaUtil, Resource) {
    var forArray = HypermediaUtil.forArray;

    /**
     * HAL resource.
     *
     * @constructor
     * @param {string} uri the resource URI
     * @param {ResourceContext} context the context object
     */
    function HalResource(uri, context) {
      return Resource.call(this, uri, context);
    }

    // Prototype properties
    HalResource.prototype = Object.create(Resource.prototype, {
      constructor: {value: HalResource},

      /**
       * Create a $http GET request configuration object.
       *
       * @function
       * @param {object} [params] additional GET parameters
       * @returns {object}
       */
      $getRequest: {value: function (params) {
        var config = {
          method: 'get',
          url: this.$uri,
          headers: {'Accept': 'application/hal+json'}
        };
        if (params) config.params = params;
        return config;
      }},

      /**
       * Update the resource with new data.
       *
       * @function
       * @param {object} data
       * @param {object} [links]
       * @returns all updated resources
       */
      $update: {value: function (data, links) {
        links = links || {};
        var selfHref = ((data._links || {}).self || {}).href;
        if (!selfHref) selfHref = (links.self || {}).href;
        if (selfHref != this.$uri) {
          throw new Error("Self link href differs: expected '" + this.$uri + "', was " + angular.toJson(selfHref));
        }

        return extractAndUpdateResources(data, links, this);
      }}
    });

    return HalResource;


    /**
     * Recursively extract embedded resources and update them in the context, then update the resource itself.
     *
     * @param {object} data
     * @param {object} [links]
     * @param {Resource} self
     */
    function extractAndUpdateResources(data, links, self) {
      var resources = [];

      // Extract links
      angular.extend(links, data._links);
      delete data._links;

      // Extract and update embedded resources
      Object.keys(data._embedded || []).forEach(function (rel) {
        var embeds = data._embedded[rel];

        // Add link to embedded resource if missing
        if (!(rel in links)) {
          links[rel] = forArray(embeds, function (embedded) {
            return {href: embedded._links.self.href};
          });
        }
        // Recurse into embedded resource
        forArray(embeds, function (embedded) {
          resources = resources.concat(extractAndUpdateResources(embedded, {}, self));
        });
      });
      delete data._embedded;

      // Update resource
      var resource = self.$context.get(links.self.href, self.constructor);
      Resource.prototype.$update.call(resource, data, links);
      resources.push(resource);

      return resources;
    }
  }])

;
