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
      constructor: {value: HalResource}
    });

    HypermediaUtil.defineProperties(HalResource.prototype, {
      /**
       * Create a $http GET request configuration object.
       *
       * @function
       * @returns {object}
       */
      $getRequest: {value: function () {
        return {
          method: 'get',
          url: this.$uri,
          headers: {'Accept': 'application/hal+json'}
        };
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
        return extractAndUpdateResources(data, links, this, this);
      }}
    });

    return HalResource;


    /**
     * Recursively extract embedded resources and update them in the context, then update the resource itself.
     *
     * @param {object} data
     * @param {object} [links]
     * @param {Resource} rootResource
     * @param {Resource} resource
     */
    function extractAndUpdateResources(data, links, rootResource, resource) {
      var resources = [];

      var selfHref = ((data._links || {}).self || {}).href;
      if (!selfHref) {
        throw new Error('Self link href expected but not found');
      }

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
          resources = resources.concat(extractAndUpdateResources(embedded, {}, rootResource, null));
        });
      });
      delete data._embedded;

      // Update resource
      if (!resource) resource = rootResource.$context.get(links.self.href, rootResource.constructor);
      Resource.prototype.$update.call(resource, data, links);
      resources.push(resource);

      return resources;
    }
  }])

;
