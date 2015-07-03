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

    describe("start & end injection", function(){
        it("sjsp__start in FunctionDeclaration", function(){
            var fname = "test";
            var source = "function " + fname + "(){}";
            var injected = injector.inject(dummyFileName, source, 0);
            var ast = esprima.parse(injected).body[offsetExpression].body;
            assertCallStart(ast, fname,
                [dummyFileName, 1, 0, fname, source]);
        });

        it("sjsp__end in FunctionDeclaration", function(){
            var fname = "test";
            var source = "function " + fname + "(){}";
            var injected = injector.inject(dummyFileName, source, 0);
            var ast = esprima.parse(injected).body[offsetExpression].body;
            assertCallEnd(ast);
        });

        it("sjsp__start in AnonymousFunction", function(){
            var fname = "anonymous";
            var source = "(function(){})";
            var injected = injector.inject(dummyFileName, source, 0);
            var ast = esprima.parse(injected).body[offsetExpression].expression.body;
            assertCallStart(ast, fname,
                [dummyFileName, 1, 1, fname, source]);
        });

        it("sjsp__end in AnonymousFunction", function(){
            var fname = "anonymous";
            var source = "(function(){})";
            var injected = injector.inject(dummyFileName, source, 0);
            var ast = esprima.parse(injected).body[offsetExpression].expression.body;
            assertCallEnd(ast);
        });

        it("sjsp__start in VariableFunction", function(){
            var fname = "test";
            var source = "var " + fname + " = function(){};";
            var injected = injector.inject(dummyFileName, source, 0);
            var varDecl = esprima.parse(injected).body[offsetExpression].declarations;
            var ast = varDecl[0].init.body;
            assertCallStart(ast, fname,
                [dummyFileName, 1, 11, fname, source]);
        });

        it("sjsp__end in VariableFunction", function(){
            var fname = "test";
            var source = "var " + fname + " = function(){};";
            var injected = injector.inject(dummyFileName, source, 0);
            var varDecl = esprima.parse(injected).body[offsetExpression].declarations;
            var ast = varDecl[0].init.body;
            assertCallEnd(ast);
        });

        it("sjsp__start in MemberFunction", function(){
            var fname = "a.b.c";
            var source = fname + " = function(){};";
            var injected = injector.inject(dummyFileName, source, 0);
            var ast = esprima.parse(injected).body[offsetExpression].expression.right.body;
            assertCallStart(ast, fname,
                [dummyFileName, 1, 8, fname, source]);
        });

        it("sjsp__end in MemberFunction", function(){
            var fname = "a.b.c";
            var source = fname + " = function(){};";
            var injected = injector.inject(dummyFileName, source, 0);
            var ast = esprima.parse(injected).body[offsetExpression].expression.right.body;
            assertCallEnd(ast);
        });
    });

    describe("wrapping return statement", function(){
        var source, origRetVal, injected, body, returnArg, callee;

        before(function(){
            source = "(function(){ return 1+1; })";
            origRetVal = esprima.parse(source).body[0].expression.body.body[0].argument;

            injected = injector.inject(dummyFileName, source, 0);
            body = esprima.parse(injected).body[offsetExpression].expression.body.body;
            returnArg = body[1].argument;
            callee = returnArg.callee;
        });

        it("(...).call(this, arguments)", function(){
            assert.equal(returnArg.type, "CallExpression");
            assert.equal(callee.property.name, "call");

            var args = returnArg.arguments;
            assert.equal(args[0].type, "ThisExpression");
            assert.equal(args[1].name, "arguments");
        });

        it("return (function(arguments){ ...", function(){
            var func = callee.object;
            assert.equal(func.params[0].name, "arguments");
        });

        it("node type of statements", function(){
            var func = callee.object;
            var body = func.body.body;
            // check node types
            assert.equal(body[0].type, "VariableDeclaration");
            assert.equal(body[1].type, "ExpressionStatement");
            assert.equal(body[1].expression.type, "CallExpression");
            assert.equal(body[2].type, "ReturnStatement");
        });
    });

    /*
     * assert start(); injection
     */
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
    /*
     * assert end(); injection
     */
    function assertCallEnd(ast){
        var lastExpr = ast.body[ast.body.length-1].expression;
        // assert "sjsp__end(...)"
        assert.equal(lastExpr.type, "CallExpression");
        assert.equal(lastExpr.callee.name, "sjsp__end");
        // assert the argument is "sjsp__state"
        assert.equal(lastExpr.arguments.length, 1);
        assert.equal(lastExpr.arguments[0].name, "sjsp__state");
    }
});

