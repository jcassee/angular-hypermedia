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
});
