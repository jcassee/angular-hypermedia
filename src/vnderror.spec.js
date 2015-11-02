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
          'message': 'Invalide nummer',
          '_links': {'profile': {'href': 'http://nocarrier.co.uk/profiles/vnd.error/'}}
        }
      }
    };

    var error = new VndError(data);

    expect(error.message).toBe('Validatie fout');
    expect(error.errors.length).toBe(1);
  });
});
