# yves-cli

> CLI JSON inspector with [yves][yves] from [Joris Röling][jorisroling]. Pretty colors!

## Install

```shell
$ npm install -g yves-cli
```

## Usage

```shell
$ yves --help
Usage: yves [options] [files...]

Options:
  -V, --version          output the version number
  --no-pretty            no pretty formatting
  --no-color             no color
  -m, --max-length <n>   max length
  -r, --root <path>      set dot notated root field
  -f, --fields <fields>  comma separated fields
  -q, --query <expr>     query data with expr (ala mongo)
  --no-json              disable JSON output
  -h, --help             display help for command
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
$ curl -s "https://api.github.com/users/jorisroling" | yves
```

```shell
$ echo '{"foo": {"bar": 0}}' | yves
{
    "foo": { "bar": 0 }
}
```

Output is JSON by default. Use `--no-json` for yves-style formatting:

```shell
$ echo '{"foo": {"bar": 0}}' | yves --no-json
{
    foo: { bar: 0 }
}
```

### Navigate with --root

Use dot notation to drill into nested data:

```shell
$ echo '{"response": {"data": {"name": "Joris"}}}' | yves --root response.data
{
    "name": "Joris"
}
```

### Filter with --query

Query arrays using MongoDB-style expressions. Supports [jsonic](https://github.com/rjrodger/jsonic) relaxed syntax — no braces or quotes needed:

```shell
# strict JSON
$ cat data.json | yves --query '{"status": "active"}'

# jsonic shorthand (equivalent)
$ cat data.json | yves --query status:active

# multiple conditions
$ cat data.json | yves --query 'status:active,role:admin'

# $in operator
$ cat data.json | yves --query 'id:{$in:[1,2,3]}'
```

### Pick fields with --fields

Select specific fields from array items:

```shell
$ cat data.json | yves --fields id,name,email
```

### Combine options

```shell
$ cat response.json | yves --root results --query 'status:published' --fields id,title
```

[yves]: https://github.com/jorisroling/yves
[jorisroling]: https://github.com/jorisroling/
