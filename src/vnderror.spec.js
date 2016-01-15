'use strict';

describe('HalError', function () {
  beforeEach(module('hypermedia'));

  var VndError;

  beforeEach(inject(function (_VndError_) {
    VndError = _VndError_;
  }));

  it('can be constructed with embedded errors', function () {
    var data = {
      'message': 'Validation failed',
      'logref': 42,
      'path': '/username',
      '_links': {'profile': {'href': 'http://nocarrier.co.uk/profiles/vnd.error/'}},
      '_embedded': {
        'errors': {
          'message': 'Invalid number',
          '_links': {'profile': {'href': 'http://nocarrier.co.uk/profiles/vnd.error/'}}
        }
      }
    };

    var error = new VndError(data);

    expect(error.message).toBe('Validation failed');
    expect(error.logref).toBe(42);
    expect(error.path).toBe('/username');
    expect(error.$links.profile).toEqual({'href': 'http://nocarrier.co.uk/profiles/vnd.error/'});
    expect(error.$nested[0].message).toBe('Invalid number');
  });

  it('can be constructed without embedded errors', function () {
    var data = {
      'message': 'Validation failed',
      '_links': {'profile': {'href': 'http://nocarrier.co.uk/profiles/vnd.error/'}}
    };

    var error = new VndError(data);

    expect(error.$nested.length).toBe(0);
  });
});
