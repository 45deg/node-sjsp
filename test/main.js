var assert = require('assert');
var esprima = require('esprima');
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var profiler = require('../lib/profiler');
var injector = require('../lib/injector');

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

describe("lib/injector", function(){
    // offset to injected profiling code
    var offsetExpression;
    var dummyFileName = "example.js";

    before(function(){
        offsetExpression = profiler(0).length;
    });

    it("sjsp__start in FunctionDeclaration", function(){
        var fname = "test";
        var source = "function " + fname + "(){}";
        var injected = injector.inject(dummyFileName, source, 0);
        var ast = skipProfiler(esprima.parse(injected).body)[0].body;
        assertCallStart(ast, fname,
            [dummyFileName, 1, 0, fname, source]);
    });

    it("sjsp__end in FunctionDeclaration", function(){
        var code = esprima.parse("function test(){}").body;
        assertCallEnd(code);
    });

    function skipProfiler(ast){
        return ast.slice(offsetExpression);
    }

    function assertCallStart(ast, filename, args){
        var firstExpr = ast.body[0];
        // assert "var ... = ...;"
        assert.equal(firstExpr.type, "VariableDeclaration");
        var decl = firstExpr.declarations[0];
        // assert "var sjsp__state = ..."
        assert.equal(decl.id.name, "sjsp__state");
        // assert "var sjsp__state = sjsp__start(...);"
        assert.equal(decl.init.type, "CallExpression");
        assert.equal(decl.init.callee.name, "sjsp__start");
        // assert arguments
        assert.deepEqual(
            decl.init.arguments.map(function(a){ return a.value; }),
            args
        );
    }
    function assertCallEnd(){
    }

    function getArgsOfCallExpr(node){
        return node.arguments.map(function(arg){
            return arg.value;
        });
    }
    describe("lib/injector/test", function(){
        it("getArgsOfCallExpr returns arguments", function(){
            var callExpr = esprima.parse("foo(1, 2, '3')").body[0].expression;
            assert.deepEqual(getArgsOfCallExpr(callExpr), [1, 2, '3']);
        });
    });
});

