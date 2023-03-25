import { Main } from './Main.mjs';
import CustomError from './CustomError.mjs';
import util from 'util'
import colors from 'colors'
import program from 'commander';


export default async function() {
  var action, run;

  const MainInst = await Main()

  colors.setTheme({
    error: 'red'
  });

  Object.defineProperty(String.prototype, 'maybe', {
    get: function() {
      if (typeof options !== "undefined" && options !== null ? options.color : void 0) {
        return this;
      } else {
        return this.stripColors;
      }
    }
  });


  /*
  *
   */

  run = function() {
    var err, error;
    program.version('0.0').usage('[options] <file ...>')
      .option('--no-pretty', 'no pretty formatting')
      .option('--no-color', 'no color')
      .option('-m, --max-length <n>', "max length", parseInt)
      .option('-r, --root <path>', 'set dot notated root field')
      .option('-f, --fields <fields>', 'comma separated fields')
      .option('-q, --query <expr>', 'query data with expr (ala mongo)')
    program.parse(process.argv);
    action();
  };


  /*
  *
   */

  action = function() {
    var err, error, main, options;
    options = {};
    options.color = program.color;
    options.pretty = program.pretty;
    options.root = program.root;
    options.fields = program.fields;
    options.query = program.query;
    if (program.maxLength != null) {
      options.maxLength = program.maxLength;
    }
    try {
      main = new MainInst(options);
      main.command(program.args);
    } catch (error) {
      err = error;
      switch (true) {
        case err instanceof CustomError:
          util.puts(("ERROR: " + err.message).error.maybe);
          program.outputHelp();
          process.exit(1);
          break;
        case err instanceof SyntaxError:
          util.puts("ERROR: Invalid JSON".error.maybe);
          throw err;
          break;
        default:
          throw err;
      }
    }
  };

  return run;

}
