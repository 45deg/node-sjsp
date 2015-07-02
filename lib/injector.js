var esprima = require('esprima');
var escodegen = require('escodegen');
var estraverse = require('estraverse');
var fs = require('fs');

/**
 * inject profile
 * @param fileName {String} target file name
 * @param source {String} target source code
 * @param interval {Number} interval to output a profile
 * @return {String} profile-injected source code
 */
function inject(fileName, source, interval){
    var srcLines = source.split(/\r?\n/);
    var ast = esprima.parse(source, {loc: true});

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
                 var funcPos = node.loc.start;
                 var funcBody = node.body.body;

                 // prepend
                 funcBody.unshift(
                     start(fileName, funcPos.line, funcPos.column, funcName, srcLines[funcPos.line-1])
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

function profiler(interval){
    // This profiling code is copied from https://github.com/itchyny/sjsp/blob/master/src/Injector.hs
    // author: itchyny
    return esprima.parse("window.sjsp__result = window.sjsp__result || {}; sjsp__state = { time: 0, line: 0, col: 0, name: '' };sjsp__start = function(fname, line, col, name, linestr) {  return { time: Date.now(), line: line, col: col, name: name, fname: fname, linestr: linestr };};sjsp__end = function(x) {  if (!x.time) return;  var key = x.fname + ' :: ' + x.line + ' :: ' + x.col;   sjsp__result[key] = sjsp__result[key] || { count: 0, time: 0, line: x.line, col: x.col, name: x.name, fname: x.fname, linestr: x.linestr };   sjsp__result[key].time += (Date.now() - x.time);   sjsp__result[key].count += 1; }; sjsp__print = function(x, n) { return Array(Math.max(0, n - x.toString().length + 1)).join(' ') + x; }; sjsp__result_time = []; sjsp__result_count = []; sjsp__format = function(x) { return 'time: ' + sjsp__print((x.time / 100).toFixed(2), 7) + 'sec   count: ' + sjsp__print(x.count, 7) + ' ' + sjsp__print(x.fname, 15) + '  ' + sjsp__print(x.name, 13) + '  ' + ' (line:' + sjsp__print(x.line, 4) + ', col:' + sjsp__print(x.col, 3) + ')   ' + x.linestr; }; if (window.hasOwnProperty('sjsp__interval')) {   clearInterval(window.sjsp__interval);}window.sjsp__interval = setInterval(function() {   console.log('========== SORT BY TIME ==========');   sjsp__result_time = Object.keys(sjsp__result).map(function(key) { return sjsp__result[key]; }).sort(function(x, y) { return y.time - x.time; }).slice(0, 20).map(function(x){ var y = sjsp__format(x); console.log(y); return y});   console.log('========== SORT BY COUNT ==========');   sjsp__result_count = Object.keys(sjsp__result).map(function(key) { return sjsp__result[key]; }).sort(function(x, y) { return y.count - x.count; }).slice(0, 20).map(function(x){ var y = sjsp__format(x); console.log(y); return y}); }, " + interval + " * 1000);").body;
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

    returnStmt.argument = wrapperFunc;
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
