# yves-cli

> CLI JSON inspector with [yves][yves] from [Joris Röling][jorisroling]. Pretty colors!

## Install

```shell
$ npm install -g yves-cli
```

## Usage

```shell
$ yves --help
Usage: yves [options] <file ...>

  Options:

    -h, --help             output usage information
    -V, --version          output the version number
    --no-pretty            no pretty formatting
    --no-color             no color
    -m, --max-length <n>   max length
    -r, --root <path>      set dot notated root field
    -f, --fields <fields>  comma separated fields
    -q, --query <expr>     query data with expr (ala mongo)
    -h, --help             output usage information    
```

## Examples

### Sources

#### From file:
```shell
$ ls
package.json component.json

$ yves package.json
```

#### Or many files:
```shell
$ ls
package.json component.json

$ yves package.json component.json
```

#### Pipe from any source:
```shell
$ curl -s "https://api.github.com/users/adjohnson916" | yves
```

```shell
$ echo '{"foo": {"bar": 0}}' | yves 
{
    foo: { bar: 0 }
}
```

[yves]: https://github.com/jorisroling/yves
[jorisroling]: https://github.com/jorisroling/
