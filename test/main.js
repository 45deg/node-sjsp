var assert = require('assert');
var esprima = require('esprima');
var estraverse = require('estraverse');
var escodegen = require('escodegen');
var profiler = require('../lib/profiler');
var injector = require('../lib/injector');
var fs = require("fs");
var path = require("path");

describe("fixture tests", function() {
    const fixturesDir = path.join(__dirname, "fixtures");
    const TEST_INTERVAL = 1;
    const profileBody = profiler(TEST_INTERVAL);
    const profileCode = escodegen.generate({
        type: "Program",
        body: profileBody
    });
    const dummyFileName = "example.js";
    fs.readdirSync(fixturesDir).map(caseName => {
        it(`should inject profiler for ${caseName.replace(/-/g, " ")}`, () => {
            const fixtureDir = path.join(fixturesDir, caseName);
            const actualPath = path.join(fixtureDir, "input.js");
            const actual = injector.inject(dummyFileName, fs.readFileSync(actualPath, "utf-8"), TEST_INTERVAL);
            const expected = fs.readFileSync(path.join(fixtureDir, "output.js"), "utf-8");
            const profileWithExpected = profileCode + "\n"+ expected;
            assert.deepStrictEqual(actual.trim(), profileWithExpected.trim(), actual);
        });
    });
});

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
                [dummyFileName, 1, 16, fname, source]);
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
                [dummyFileName, 1, 12, fname, source]);
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
                [dummyFileName, 1, 22, fname, source]);
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
                [dummyFileName, 1, 19, fname, source]);
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

        it("return original expression", function(){
            var body = callee.object.body.body;

            assert.equal(body[1].type, "ExpressionStatement");
            assert.equal(body[2].type, "ReturnStatement");

            var varDecl = body[0].declarations[0];
            var tmpVarName = varDecl.id.name;
            var tmpVarExpr = varDecl.init;
            var retVarName = body[2].argument.name;

            assert.equal(tmpVarName, retVarName);
            assert.deepEqual(tmpVarExpr, origRetVal);
        });

        it("call sjsp__end", function(){
            var func = callee.object;
            var body = func.body.body;
            var expr = body[1].expression;
            // assert "sjsp__end(...)"
            assert.equal(expr.type, "CallExpression");
            assert.equal(expr.callee.name, "sjsp__end");
            // assert the argument is "sjsp__state"
            assert.equal(expr.arguments.length, 1);
            assert.equal(expr.arguments[0].name, "sjsp__state");
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

