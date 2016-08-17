'use strict';

describe('HypermediaUtil', function () {
  beforeEach(module('hypermedia'));

  // Setup

  var HypermediaUtil;

  beforeEach(inject(function (_HypermediaUtil_) {
    HypermediaUtil = _HypermediaUtil_;
  }));


  describe('forArray', function () {

    // Setup

    var forArray;

    beforeEach(function () {
      forArray = HypermediaUtil.forArray;
    });

    // Tests

    it('silently ignores undefined', function () {
      var result = forArray(undefined, function (s) {
        return s.toUpperCase();
      });
      expect(result).toBeUndefined();
    });

    it('calls a function with a scalar', function () {
      var result = forArray('a', function (s) {
        return s.toUpperCase();
      });
      expect(result).toBe('A');
    });

    it('calls a function with an array', function () {
      var result = forArray(['a', 'b'], function (s) {
        return s.toUpperCase();
      });
      expect(result).toEqual(['A', 'B']);
    });

    it('descends only one level', function () {
      var result = forArray([['a', 'b'], ['c', 'd']], function (s) {
        return s.reverse();
      });
      expect(result).toEqual([['b', 'a'], ['d', 'c']]);
    });
  });

  describe('defineProperties', function () {
    // Setup

    var defineProperties;

    beforeEach(function () {
      defineProperties = HypermediaUtil.defineProperties;
    });

    // Tests

    it('should have added all properties', function () {
      var obj = {};

      var props = {
        "property1": {
          value: true
        },
        "property2": {
          value: "Hello"
        },
        "property3": {
          value: function () {}
        }
      };

      obj = defineProperties(obj, props);


      expect(obj.property1).toBeTruthy();
      expect(obj.property2).toBeTruthy();
      expect(obj.property3).toBeTruthy();

    });

    it('should add writable=true to all properties', function () {
      var obj = {};

      var props = {
            "property1": {
              value: true
            },
            "property2": {
              value: "Hello"
            }
          };

      obj = defineProperties(obj, props);

      // test if properties are writable
      obj.property1 = false;
      obj.property2 = "World";

      expect(obj.property1).toEqual(false);
      expect(obj.property2).toEqual("World");

    });

    it('should skip properties that already have a writable attribute', function () {
      var obj = {};

      var props = {
        "property1": {
          value: "mutable"
        },
        "property2": {
          value: "read-only",
          writable: false
        }
      };

      obj = defineProperties(obj, props);

      // test if properties are writable
      obj.property1 = "mutated";

      expect( function(){ obj.property2 = "written"; } ).toThrow(new TypeError("Attempted to assign to readonly property."));

      expect(obj.property1).toEqual("mutated");
      expect(obj.property2).toEqual("read-only");

    });

  });
});
