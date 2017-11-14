var esprima = require('esprima');
var escodegen = require('escodegen');
var estraverse = require('estraverse');
var fs = require('fs');
var profiler = require('./profiler');

/**
 * inject profile
 * @param fileName {String} target file name
 * @param source {String} target source code
 * @param interval {Number} interval(seconds) to output a profile
 * @return {String} profile-injected source code
 */
function inject(fileName, source, interval){
    var srcLines = source.split(/\r?\n/);
    var ast = esprima.parse(source, {loc: true});
    var lineLimit = 100;

    estraverse.traverse(ast, {
        enter: function (node, parent) {
            /*
             rewrite function
                 function foo(){ body } -> function() { start('foo'); body; end; }
                 function(){ body } -> function() { start('anonymous'); body; end; }
            */
            if(node.type === "FunctionDeclaration" ||
               node.type === "FunctionExpression"){

                 var funcName = node.id === null ? 'anonymous' : node.id.name;
                 var funcPos = node.body.loc.start;
                 var funcBody = node.body.body;

                 // prepend
                 funcBody.unshift(
                     start(fileName, funcPos.line, funcPos.column + 1,
                           funcName, srcLines[funcPos.line-1].substr(0, lineLimit))
                 );

                 // append
                 funcBody.push(
                     end()
                 );
             }
        },

        leave: function (node, parent) {
            /*
             rewrite return
                 return expr; -> return (function(arguments) { start(); var value = expr; end(); return value; }).call(this, arguments);
            */
            if(node.type === 'ReturnStatement') {
                wrapReturn(node);
            }

            /*
             rewrite var func
                var test = function() { body; }; -> function() { start("test"); body; end(); };
            */
            if(node.type === "VariableDeclarator") {
                if(node.init && node.init.type === "FunctionExpression") {
                    rewriteFuncName(node.init, node.id.name);
                }
            }

            /*
             rewrite assign func
                a.test = function() { body; }; -> function() { start("a.test"); body; end(); };
            */
            if(node.type === "AssignmentExpression") {
                if(node.right.type === "FunctionExpression") {
                    rewriteFuncName(node.right, getStaticName(node.left));
                }
            }
        }
    });

    ast.body = profiler(interval).concat(ast.body);

    return escodegen.generate(ast);
}

function start(fname, line, col, name, linestr){
    var template = parseStatement("var sjsp__state = sjsp__start()");
    template.declarations[0].init.arguments = Array.prototype.map.call(arguments, function(arg){
        return makeLiteral(arg);
    });
    return template;
}

function end(){
    return parseStatement("sjsp__end(sjsp__state)");
}

function wrapReturn(returnStmt){
    var wrapperFunc = parseStatement(
        "(function(arguments){" +
        "   var sjsp__return = __here__;" +
        "   sjsp__end(sjsp__state);" +
        "   return sjsp__return;" +
        "}).call(this, arguments);"
    );

    // rewrite __here__
    wrapperFunc.expression.callee.object.body.body[0].declarations[0].init =
    returnStmt.argument;

    // assign express to argument.
    returnStmt.argument = wrapperFunc.expression;
}

function rewriteFuncName(funcAst, funcName){
    var startArguments = funcAst.body.body[0].declarations[0].init.arguments;
    // argument[3]: function's name
    startArguments[3].value = funcName;
}

function getStaticName(expr){
    if(expr.type === "MemberExpression") {
        return getStaticName(expr.object) + '.' + expr.property.name;
    } else if(expr.type === "Identifier"){
        return expr.name;
    } else {
        throw "Invalid member expression";
    }
}

function parseStatement(code){
    return esprima.parse(code).body[0];
}

function makeLiteral(literal) {
    return {
        type: 'Literal',
        value: literal
    };
}

exports.inject = inject;
