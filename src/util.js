'use strict';

angular.module('hypermedia')

  /**
   * @ngdoc object
   * @name HypermediaUtil
   * @description
   *
   * Utility functions used in the hypermedia module.
   */
  .factory('HypermediaUtil', function () {
    return {

      /**
       * Call a function on an argument or every element of an array.
       *
       * @param {Array|*|undefined} arg the variable or array of variables to apply 'func' to
       * @param {function} func the function
       * @param {object} [context] object to bind 'this' to when applying 'func'
       * @returns {Array|*|undefined} the result of applying 'func' to 'arg'; undefined if 'arg' is undefined
       */
      forArray: function forArray(arg, func, context) {
        if (angular.isUndefined(arg)) return undefined;
        if (Array.isArray(arg)) {
          return arg.map(function (elem) {
            return func.call(context,  elem);
          });
        } else {
          return func.call(context,  arg);
        }
      },
      defineProperties: function defineProperties(obj, props) {
        for (var propertyName in props) {
          if (props.hasOwnProperty(propertyName)) {
            var writable = true;
            var property = props[propertyName];
            if (property.hasOwnProperty('writable')) {
              writable = property.writable;
            }
            obj = Object.defineProperty(obj, propertyName, {
              value: property.value,
              writable: writable
            });
          }
        }
        return obj;
      }
    };
  })

;
