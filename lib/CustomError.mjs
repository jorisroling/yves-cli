/*
* A custom error. Doesn't do much.
 */

export default function init() {
  var CustomError,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  CustomError = (function(superClass) {
    extend(CustomError, superClass);

    function CustomError(msg) {
      var err;
      err = new Error();
      this.name = 'MyError';
      this.message = msg || err.message;
    }

    return CustomError;

  })(Error);

  return CustomError;

}
