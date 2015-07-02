var esprima = require('esprima');

var profilerCode = [
    // This profiling code is copied from https://github.com/itchyny/sjsp/blob/master/src/Injector.hs
    // original author: itchyny
    "window.sjsp__result = window.sjsp__result || {};",
    "window.sjsp__state = { time: 0, line: 0, col: 0, name: '' };",
    "window.sjsp__start = function (fname, line, col, name, linestr) {",
    "    return {",
    "        time: Date.now(), line: line, col: col,",
    "        name: name, fname: fname, linestr: linestr",
    "    };",
    "};",
    "window.sjsp__end = function (x) {",
    "    if (!x.time) return;",
    "    var key = x.fname + ' :: ' + x.line + ' :: ' + x.col;",
    "    sjsp__result[key] = sjsp__result[key] || {",
    "        count: 0, time: 0, line: x.line, col: x.col,",
    "        name: x.name, fname: x.fname, linestr: x.linestr",
    "    };",
    "    sjsp__result[key].time += Date.now() - x.time;",
    "    sjsp__result[key].count += 1;",
    "};",
    "window.sjsp__print = function (x, n) {",
    "    return Array(Math.max(0, n - x.toString().length + 1)).join(' ') + x;",
    "};",
    "window.sjsp__result_time = [];",
    "window.sjsp__result_count = [];",
    "window.sjsp__format = function (x) {",
    "    return 'time: ' + sjsp__print((x.time / 100).toFixed(2), 7) + 'sec   count: ' + sjsp__print(x.count, 7) + ' ' + sjsp__print(x.fname, 15) + '  ' + sjsp__print(x.name, 13) + '  ' + ' (line:' + sjsp__print(x.line, 4) + ', col:' + sjsp__print(x.col, 3) + ')   ' + x.linestr;",
    "};",
    "if (window.hasOwnProperty('sjsp__interval')) {",
    "    clearInterval(window.sjsp__interval);",
    "}",
    "window.sjsp__interval = setInterval(function () {",
    "    console.log('========== SORT BY TIME ==========');",
    "    sjsp__result_time = Object.keys(sjsp__result).map(function (key) {",
    "        return sjsp__result[key];",
    "    }).sort(function (x, y) {",
    "        return y.time - x.time;",
    "    }).slice(0, 20).map(function (x) {",
    "        var y = sjsp__format(x);",
    "        console.log(y);",
    "        return y;",
    "    });",
    "    console.log('========== SORT BY COUNT ==========');",
    "    sjsp__result_count = Object.keys(sjsp__result).map(function (key) {",
    "        return sjsp__result[key];",
    "    }).sort(function (x, y) {",
    "        return y.count - x.count;",
    "    }).slice(0, 20).map(function (x) {",
    "        var y = sjsp__format(x);",
    "        console.log(y);",
    "        return y;",
    "    });",
    "}, INTERVAL * 1000);"
];

function profiler(interval){
    // rewrite interval number
    var last = profilerCode.length-1;
    profilerCode[last] = profilerCode[last].replace(/INTERVAL/, interval);

    return esprima.parse(profilerCode.join('')).body;
}

module.exports = profiler;
