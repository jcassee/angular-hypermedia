'use strict';

describe('HalResource', function () {
  beforeEach(module('hypermedia'));

  // Setup

  var $log, $q, $rootScope, HalResource, mockContext, uri, resource;

  beforeEach(inject(function (_$log_, _$q_, _$rootScope_, _HalResource_) {
    $log = _$log_;
    $q = _$q_;
    $rootScope = _$rootScope_;
    HalResource = _HalResource_;
    mockContext = jasmine.createSpyObj('mockContext', ['get', 'httpGet', 'httpPut', 'httpDelete', 'httpPost']);
    uri = 'http://example.com';
    resource = new HalResource(uri, mockContext);
  }));

  // Tests

  it('is initialized correctly', function () {
    expect(resource.$uri).toBe(uri);
    expect(resource.$context).toBe(mockContext);
    expect(resource.$links).toEqual({self: {href: uri}});
    expect(resource.$syncTime).toBeNull();
    expect(resource.$profile).toBeNull();
  });

  // HTTP

  it('creates HTTP GET request for HAL data', function () {
    expect(resource.$getRequest()).toEqual({
      method: 'get',
      url: 'http://example.com',
      headers: {Accept: 'application/hal+json'}
    });
  });

  it('creates HTTP GET request for HAL data with additional GET parameters', function () {
    var params = {name: 'John'};
    expect(resource.$getRequest(params)).toEqual({
      method: 'get',
      url: 'http://example.com',
      params: params,
      headers: {Accept: 'application/hal+json'}
    });
  });

  it('creates HTTP PUT request with JSON data', function () {
    expect(resource.$putRequest()).toEqual({
      method: 'put',
      url: 'http://example.com',
      data: resource,
      headers: {'Content-Type': 'application/json'}
    });
  });

  // Updates

  it('requires a link with the "self" relation in the data', function () {
    expect(function () {
      resource.$update({foo: 'bar'});
    }).toThrowError("Self link href expected but not found");
  });

  it('extracts links', function () {
    mockContext.get.and.returnValue(resource);
    var links = {
      self: {href: 'http://example.com'},
      profile: {href: 'http://example.com/profile'}
    };
    resource.$update({
      foo: 'bar',
      _links: links
    });
    expect(resource.$links).toEqual(links);
    expect(resource._links).toBeUndefined();
  });

  it('extracts and links embedded resources', function () {
    var resource1 = new HalResource('http://example.com/1', mockContext);
    mockContext.get.and.callFake(function (uri) {
      switch (uri) {
        case resource.$uri:  return resource;
        case resource1.$uri: return resource1;
      }
    });

    resource.$update({
      _links: {
        self: {href: 'http://example.com'},
        profile: {href: 'http://example.com/profile'}
      },
      _embedded: {
        'next': {
          foo: 'bar',
          _links: {
            self: {href: 'http://example.com/1'}
          }
        }
      }
    });
    expect(resource.$links.next.href).toBe(resource1.$uri);
    expect(resource1.foo).toBe('bar');
    expect(resource._embedded).toBeUndefined();
  });

  it('extracts and links embedded resources for custom resource type', function () {
    var MyResource = function (uri, context) {
      return HalResource.call(this, uri, context);
    };
    MyResource.prototype = Object.create(HalResource.prototype, {
      constructor: {value: MyResource}
    });
    var resource2 = new MyResource(uri, mockContext),
      resource3 = new MyResource('http://example.com/1', mockContext);
    mockContext.get.and.callFake(function (uri) {
      switch (uri) {
        case resource2.$uri:  return resource2;
        case resource3.$uri: return resource3;
      }
    });

    resource2.$update({
      _links: {
        self: {href: 'http://example.com'},
        profile: {href: 'http://example.com/profile'}
      },
      _embedded: {
        'next': {
          foo: 'bar',
          _links: {
            self: {href: 'http://example.com/1'}
          }
        }
      }
    });

    expect(mockContext.get).toHaveBeenCalledWith(resource3.$uri, MyResource);
  });
});
