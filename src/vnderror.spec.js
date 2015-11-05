'use strict';

describe('HalError', function () {
  beforeEach(module('hypermedia'));

  var VndError;

  beforeEach(inject(function (_VndError_) {
    VndError = _VndError_;
  }));

  it('can be constructed with embedded errors', function () {
    var data = {
      'message': 'Validatie fout',
      '_links': {'profile': {'href': 'http://nocarrier.co.uk/profiles/vnd.error/'}},
      '_embedded': {
        'errors': {
          'message': 'Invalid number',
          '_links': {'profile': {'href': 'http://nocarrier.co.uk/profiles/vnd.error/'}}
        }
      }
    };

    var error = new VndError(data);

    expect(error.message).toBe('Validatie fout');
    expect(error.$links.profile).toEqual({'href': 'http://nocarrier.co.uk/profiles/vnd.error/'});
    expect(error.$nested[0].message).toBe('Invalid number');
  });
});
