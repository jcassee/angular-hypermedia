'use strict';

describe('BlobResource', function () {
  beforeEach(module('hypermedia'));

  // Setup

  var $log, $q, $rootScope, BlobResource, mockContext, uri, resource;

  beforeEach(inject(function (_$log_, _$q_, _$rootScope_, _BlobResource_) {
    $log = _$log_;
    $q = _$q_;
    $rootScope = _$rootScope_;
    BlobResource = _BlobResource_;
    mockContext = jasmine.createSpyObj('mockContext', ['get', 'httpGet', 'httpPut', 'httpDelete', 'httpPost']);
    uri = 'http://example.com';
    resource = new BlobResource(uri, mockContext);
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

  it('creates HTTP GET request', function () {
    expect(resource.$getRequest()).toEqual({
      method: 'get',
      url: 'http://example.com',
      headers: {Accept: '*/*'},
      responseType: 'blob',
      addTransformResponse: jasmine.any(Function)
    });
  });

  it('creates HTTP PUT request using the data media type', function () {
    resource.data = new Blob(['test'], {type: 'text/plain'});
    expect(resource.$putRequest()).toEqual({
      method: 'put',
      url: 'http://example.com',
      data: resource.data,
      headers: {'Content-Type': 'text/plain'}
    });
  });

  it('creates HTTP PUT request using binary/octet-stream media type if data has no type', function () {
    resource.data = new Blob(['test']);
    expect(resource.$putRequest()).toEqual({
      method: 'put',
      url: 'http://example.com',
      data: resource.data,
      headers: {'Content-Type': 'binary/octet-stream'}
    });
  });

  it('transforms HTTP GET response data into "data" property', function () {
    var request = resource.$getRequest();
    var data = new Blob(['test']);
    expect(request.addTransformResponse(data)).toEqual({data: data});
  });

  it('does not support HTTP PATCH request', function () {
    expect(resource.$patchRequest).toThrowError('BlobResource does not support the PATCH method');
  });
});
