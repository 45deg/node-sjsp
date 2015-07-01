#!/usr/bin/env node

var program = require('commander');
var fs = require('fs');
var injector = require('./lib/injector');

program
  .version('0.0.1')
  .usage('<filepath>')
  .option('-i, --interval <num>', "interval time of logging the result in seconds (default 10)")
  .option('-p, --print', "print out the compiled result to stdout")
  .parse(process.argv);


if(!program.args.length) {
    program.help();
} else {
    var interval = program.interval || 10;
    var files = program.args;
    var isStdout = program.print;

    files.forEach(function(fileName){
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
