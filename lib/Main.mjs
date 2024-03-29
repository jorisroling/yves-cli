import fs from 'fs'
import _ from 'lodash'
import yves from 'yves'
import OutputStream from './OutputStream.mjs'
import sift from 'sift'
import jsonic from 'jsonic'

export async function Main() {
  var Main;
  
  /*
  * Gets input, parses as JSON, and writes output to its stream.
   */

  Main = (function() {
    function Main(options) {
      if (options == null) {
        options = {};
      }
      this.options = _.defaults({}, options, {
        color: true
      }, yves.defaults);
      _.defaults(this.options.styles, yves.defaults.styles);
      this.outputStream = new (OutputStream())({
        color: this.options.color
      });
      this.outputFn = this.getOutputFn();
      return;
    }

    Main.prototype.getOutputFn = function() {
      return yves.inspector({
        styles: this.options.styles,
        maxLength: this.options.maxLength,
        pretty: this.options.pretty,
        hideFunctions: this.options.hideFunctions,
        stream: this.outputStream,
      });
    };

    Main.prototype.parse = function(json) {
      if (json.indexOf('{') >= 0 ) {
        return JSON.parse(json.substr(0, 5) === ")]}'," ? json.substr(5) : json);
      }
    };


    Main.prototype.doProcess = function (object) {
      const self = this;
      if (self.options.root) {
        object = _.get(object,self.options.root)
      }

      if (self.options.query) {
        if (Array.isArray(object)) {
          const expr = jsonic(self.options.query)
          debug('sift %y',expr)
          object = sift(expr, object)
        } else {
          console.error(`Data root is not of type array (but of type ${typeof object}), so query is not possible.`+(self.options.root?'':` Maybe --root can help?`))
          return;
        }
      }

      if (self.options.fields) {
        if (Array.isArray(object)) {
          const fields = self.options.fields.split(',')
          object = object.map(_.partialRight(_.pick, fields));
        } else {
          console.error(`Data root is not of type array (but of type ${typeof object}), so fields is not possible.`+(self.options.root?'':` Maybe --root can help?`))
          return;
        }
      }
      return self.outputFn(object);
    }

    /*
    	* Accept input from a list of filenames.
    	* Read, parse, and output each in sequence.
     */

    Main.prototype.forFiles = function(filenames) {
      var self;
      self = this;
      filenames.forEach(function(filename) {
        var buffer, object, string;
        buffer = fs.readFileSync(filename);
        string = buffer.toString();
        object = self.parse(string);
        return self.doProcess(object);
      });
    };


    /*
    	* Accept input from a stream, then parse and output.
     */

    Main.prototype.fromStream = function(stream) {
      var capture, self;
      self = this;
      capture = '';
      stream.on('data', function(chunk) {
        return capture += chunk;
      });
      stream.on('end', function() {
        var object;
        object = self.parse(capture);
        return self.doProcess(object);
      });
    };


    /*
    	* Called for the command-line.
     */

    Main.prototype.command = function(args) {
      this.outputStream.pipe(process.stdout);
      if (args.length > 0) {
        this.forFiles(args);
      } else {
        process.stdin.resume();
        this.fromStream(process.stdin);
      }
    };

    return Main;

  })();

  return Main;

}
