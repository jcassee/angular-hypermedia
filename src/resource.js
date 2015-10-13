'use strict';

angular.module('hypermedia')

  /**
   * @ngdoc type
   * @name Resource
   * @description
   *
   * Hypermedia resource.
   */
  .factory('Resource', ['$log', '$q', 'HypermediaUtil', function ($log, $q, HypermediaUtil) {
    var forArray = HypermediaUtil.forArray;

    var registeredProfiles = {};

    /**
     * Resource.
     *
     * @constructor
     * @param {string} uri the resource URI
     * @param {ResourceContext} context the resource context
     */
    function Resource(uri, context) {
      // This constructor does not use the automatically created object but instantiate from a subclass instead

      // Intermediate prototype to add profile-specific properties to
      var prototype = Object.create(Object.getPrototypeOf(this));

      // Current profile(s)
      var profile = null;

      // Instantiated object
      return Object.create(prototype, {

        /**
         * The resource URI.
         *
         * @property {string}
         */
        $uri: {value: uri},

        /**
         * The resource context. Can be used to get related resources.
         *
         * @property {ResourceContext}
         */
        $context: {value: context},

        /**
         * Links to other resources.
         *
         * @property {object}
         */
        $links: {value: {}, writable: true},

        /**
         * The timestamp of the last successful GET or PUT request.
         *
         * @property {number} Resource.syncTime
         * @see ResourceContext#markSynced
         */
        $syncTime: {value: null, writable: true},

        /**
         * The resource profile URI(s). If profile properties have been registered for this URI (using
         * HalContextProvider.registerProfile or ResourceContext.registerProfile), the properties will be defined on the
         * resource.
         *
         * Setting the profile to 'undefined' or 'null' will remove the profile.
         *
         * @property {string|string[]}
         */
        $profile: {
          get: function () {
            return profile;
          },
          set: function (value) {
            // Remove old profile properties
            if (profile) {
              var oldProfiles = angular.isArray(profile) ? profile : [profile];
              oldProfiles.forEach(function (profile) {
                var properties = registeredProfiles[profile] || {};
                Object.keys(properties).forEach(function (key) {
                  delete prototype[key];
                });
              });
            }

            // Apply new profile properties
            if (value) {
              var newProfiles = angular.isArray(value) ? value : [value];
              newProfiles.forEach(function (profile) {
                var properties = registeredProfiles[profile] || {};
                Object.defineProperties(prototype, properties);
              });
            }

            profile = value;
          }
        }
      });
    }

    // Prototype properties
    Resource.prototype = Object.create(Object.prototype, {
      constructor: {value: Resource},

      /**
       * Resolve the href of a property.
       *
       * @function
       * @param {string} prop the property name
       * @param {object} [vars] URI template variables
       * @returns {string|string[]} the link href or hrefs
       */
      $propHref: {value: function (prop, vars) {
        return forArray(this[prop], function (uri) {
          if (vars) uri = new UriTemplate(uri).fillFromObject(vars);
          return uri;
        });
      }},

      /**
       * Follow a property relation to another resource.
       *
       * @function
       * @param {string} prop the property name
       * @param {object} [vars] URI template variables
       * @param {ResourceFactory} [factory] the factory for creating the resource
       * @returns {Resource|Resource[]} the linked resource or resources
       */
      $propRel: {value: function (prop, vars, factory) {
        if (angular.isFunction(vars)) {
          factory = vars;
          vars = undefined;
        }
        return forArray(this.$propHref(prop, vars), function (uri) {
          return this.$context.get(uri, factory);
        }, this);
      }},

      /**
       * Resolve the href of a link relation.
       *
       * @function
       * @param {string} rel the link relation
       * @param {object} [vars] URI template variables
       * @returns {string|string[]} the link href or hrefs
       */
      $linkHref: {value: function (rel, vars) {
        var templated = false;
        var nonTemplated = false;
        var deprecation = {};

        var linkHrefs = forArray(this.$links[rel], function (link) {
          if ('templated' in link) templated = true;
          if (!('templated' in link)) nonTemplated = true;
          if ('deprecation' in link) deprecation[link.deprecation] = true;

          var uri = link.href;
          if (vars) uri = new UriTemplate(uri).fillFromObject(vars);
          return uri;
        }, this);

        if (templated && !vars) {
          $log.warn("Following templated link relation '" + rel + "' without variables");
        }
        if (nonTemplated && vars) {
          $log.warn("Following non-templated link relation '" + rel + "' with variables");
        }
        var deprecationUris = Object.keys(deprecation);
        if (deprecationUris.length > 0) {
          $log.warn("Following deprecated link relation '" + rel + "': " + deprecationUris.join(', '));
        }

        return linkHrefs;
      }},

      /**
       * Follow a link relation to another resource.
       *
       * @function
       * @param {string} rel the link relation
       * @param {object} [vars] URI template variables
       * @param {ResourceFactory} [factory] the factory for creating the related resource
       * @returns {Resource|Resource[]} the linked resource or resources
       */
      $linkRel: {value: function (rel, vars, factory) {
        if (angular.isFunction(vars)) {
          factory = vars;
          vars = undefined;
        }
        return forArray(this.$linkHref(rel, vars), function (uri) {
          return this.$context.get(uri, factory);
        }, this);
      }},

      /**
       * Perform an HTTP GET request if the resource is not synchronized.
       *
       * @function
       * @returns a promise that is resolved to the resource
       * @see Resource#$syncTime
       */
      $load: {value: function () {
        if (this.$syncTime) {
          return $q.when(this);
        } else {
          return this.$context.httpGet(this);
        }
      }},

      /**
       * Load all resources reachable from a resource using one or more paths.
       * A path is on object hierarchy containing property or relation names.
       * If the name matches a property it is loaded, otherwise it is
       * interpreted as a link relation.
       *
       * Examples:
       *   context.loadPaths(resource, {team_url: {}})
       *   context.loadPaths(resource, {'http://example.com/owner': {}})
       *   context.loadPaths(resource, {
       *     home: {
       *       address: {}
       *     }
       *   })
       *   context.loadPaths(resource, {
       *     'ex:car': {},
       *     'ex:friends': {
       *       'ex:car': {}
       *     }
       *   })
       *
       * @function
       * @param {Resource} resource
       * @param {object} paths
       * @return {Promise} a promise that resolves to the resource once all
       *                   paths have been loaded
       */
      $loadPaths: {value: function (paths) {
        var self = this;
        return self.$load().then(function () {
          var promises = [];
          Object.keys(paths).forEach(function (key) {
            var uris = self.$propHref(key);
            if (!uris) uris = self.$linkHref(key);
            if (!uris) return;

            uris = angular.isArray(uris) ? uris : [uris];
            uris.forEach(function (uri) {
              var related = (typeof uri === 'string') ? self.$context.get(uri) : uri;
              promises.push(related.$loadPaths(paths[key]));
            });
          });
          return $q.all(promises);
        }).then(function () {
          return self;
        });
      }},

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
          headers: {'Accept': 'application/json'}
        };
      }},

      /**
       * Perform an HTTP GET request.
       *
       * @function
       * @returns a promise that is resolved to the resource
       */
      $get: {value: function () {
        return this.$context.httpGet(this);
      }},

      /**
       * Create a $http PUT request configuration object.
       *
       * @function
       * @returns {object}
       */
      $putRequest: {value: function () {
        return {
          method: 'put',
          url: this.$uri,
          data: this,
          headers: {'Content-Type': 'application/json'}
        };
      }},

      /**
       * Perform an HTTP PUT request with the resource state.
       *
       * @function
       * @returns a promise that is resolved to the resource
       */
      $put: {value: function () {
        return this.$context.httpPut(this);
      }},

      /**
       * Create a $http PATCH request configuration object.
       *
       * @function
       * @returns {object}
       */
      $patchRequest: {value: function (data) {
        return {
          method: 'patch',
          url: this.$uri,
          data: data,
          headers: {'Content-Type': 'application/merge-patch+json'}
        };
      }},

      /**
       * Perform an HTTP PATCH request with the resource state.
       *
       * @function
       * @returns a promise that is resolved to the resource
       */
      $patch: {value: function () {
        return this.$context.httpPatch(this);
      }},

      /**
       * Create a $http DELETE request configuration object.
       *
       * @function
       * @returns {object}
       */
      $deleteRequest: {value: function () {
        return {
          method: 'delete',
          url: this.$uri
        };
      }},

      /**
       * Perform an HTTP DELETE request.
       *
       * @function
       * @returns a promise that is resolved to the resource
       */
      $delete: {value: function () {
        return this.$context.httpDelete(this);
      }},

      /**
       * Create a $http POST request configuration object.
       *
       * @function
       * @param {*} data request body
       * @param {object} [headers] request headers
       * @param {ConfigHttp} [callback] a function that changes the $http request config
       * @returns {object}
       */
      $postRequest: {value: function (data, headers, callback) {
        callback = callback || angular.identity;
        return callback({
          method: 'post',
          url: this.$uri,
          data: data,
          headers: headers || {}
        });
      }},

      /**
       * Perform an HTTP POST request.
       *
       * @function
       * @param {*} data request body
       * @param {object} [headers] request headers
       * @param {ConfigHttp} [callback] a function that changes the $http request config
       * @returns a promise that is resolved to the response
       */
      $post: {value: function (data, headers, callback) {
        return this.$context.httpPost(this, data, headers, callback);
      }},

      /**
       * Update the resource with new data by clearing all existing properties
       * and then copying all properties from 'data'.
       *
       * @function
       * @param {object} data
       * @param {object} [links]
       * @returns the resource
       */
      $update: {value: function (data, links) {
        links = links || {};
        if (links.self && links.self.href !== this.$uri) {
          throw new Error('Self link href differs: expected "' + this.$uri + '", was ' +
              angular.toJson(links.self.href));
        }

        // Update state
        Object.keys(this).forEach(function (key) {
          delete this[key];
        }, this);
        Object.keys(data).forEach(function (key) {
          this[key] = data[key];
        }, this);

        // Update links
        this.$links = links;

        // Optionally apply profile(s)
        var profileUris = forArray(links.profile, function (link) {
          return link.href;
        });
        if (profileUris) this.$profile = profileUris;

        return this;
      }},

      /**
       * Merges the resource with new data following algorithm defined
       * in JSON Merge Patch specification (Rfc 7386, https://tools.ietf.org/html/rfc7386).
       *
       * @function
       * @param {object} data
       * @param {object} [links]
       * @returns the resource
       */
      $merge: {value: function (data){
        var mergePatch = function(target, patch){
          if (!angular.isObject(patch) || patch === null || Array.isArray(patch)) {
            return patch;
          }

          if (!angular.isObject(target) || target === null || Array.isArray(target)) {
            target = {};
          }

          Object.keys(patch).forEach(function (key) {
            var value = patch[key];
            if (value === null) {
              delete target[key];
            } else {
              target[key] = mergePatch(target[key], value);
            }
          });

          return target;
        };

        return mergePatch(this, data);
      }}
    });

    // Class properties
    Object.defineProperties(Resource, {

      /**
       * Register a profile.
       *
       * @function
       * @param {string} profile the profile URI
       * @param {object} properties a properties object as used in 'Object.defineProperties()'
       */
      registerProfile: {value: function (profile, properties) {
        // Make sure properties can be removed when applying a different profile
        var props = angular.copy(properties);
        angular.forEach(props, function (prop) {
          prop.configurable = true;
        });
        registeredProfiles[profile] = props;
      }},

      /**
       * Register profiles.
       *
       * @function
       * @param {object} profiles an object mapping profile URIs to properties objects as used in
       *                          'Object.defineProperties()'
       */
      registerProfiles: {value: function (profiles) {
        angular.forEach(profiles, function (properties, profile) {
          Resource.registerProfile(profile, properties);
        });
      }}
    });

    return Resource;
  }])

;

/**
 * A callback function used to change a $http config object.
 *
 * @callback ConfigHttp
 * @param {object} config the $http config object
 * @returns {object} the $http config object
 */
