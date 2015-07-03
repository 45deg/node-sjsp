#!/usr/bin/env node

var program = require('commander');
var fs = require('fs');
var injector = require('./lib/injector');
var packageJson = require('./package.json');

program
  .version(packageJson.version)
  .usage('<filepath>')
  .option('-i, --interval <num>', "interval time of logging the result in seconds (default 10)")
  .option('-p, --print', "print out the compiled result to stdout")
  .parse(process.argv);


if(!program.args.length) {
    program.help();
} else {
    var interval = parseInt(program.interval) || 10;
    var files = program.args;
    var isStdout = program.print;

    files.forEach(function(fileName){
        if(fileName.match(/sjsp.js$/)) return;

        var targetFileName = fileName.replace(/js$/, 'sjsp.js');

        fs.readFile(fileName, 'utf8', function(err, source){
            if(err) throw err;

            var injected = injector.inject(fileName, source, interval);
            if(isStdout){
                process.stdout.write(injected);
            } else {
                fs.writeFile(targetFileName, injected, function (err) {
                  if (err) throw err;
                });
            }
        });

    });
}
