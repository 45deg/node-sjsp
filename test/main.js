var assert = require('assert');
var esprima = require('esprima');
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var profiler = require('../lib/profiler');
var injection = require('../lib/injector');

describe("lib/profiler", function(){
    it("setInterval argument should be SECONDS * 1000", function(){
        var sec = 10;
        var body = profiler(sec);
        // wrap as a program
        var ast = {
            "type": "Program",
            body: body
        };

        // get the second argument of setInterval
        estraverse.traverse(ast, { enter: function(node){
            if(node.type === "CallExpression" && node.callee.name === "setInterval") {
                var secondArg = node.arguments[1];
                var rawCode = escodegen.generate(secondArg);
                assert.equal(eval(rawCode), sec * 1000);
            }
        }});
    });
});

