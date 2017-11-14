var esprima = require('esprima');

var profilerCode = [
    // This profiling code is copied from https://github.com/itchyny/sjsp/blob/master/src/Injector.hs
    // original author: itchyny
    "window.sjsp__result = window.sjsp__result || {};",
    "window.sjsp__state = window.sjsp__state || { time: 0, line: 0, col: 0, name: '' };",
    "window.sjsp__start = window.sjsp__start || function (fname, line, col, name, linestr) {",
    "    return {",
    "        start: Date.now(), line: line, col: col,",
    "        name: name, fname: fname, linestr: linestr",
    "    };",
    "};",
    "window.sjsp__end = window.sjsp__end || function (x) {",
    "    if (!x.start) return;",
    "    var key = x.fname + ' :: ' + x.line + ' :: ' + x.col;",
    "    sjsp__result[key] = sjsp__result[key] || {",
    "        count: 0, time: 0, line: x.line, col: x.col,",
    "        name: x.name, fname: x.fname, linestr: x.linestr",
    "    };",
    "    sjsp__result[key].time += Date.now() - x.start;",
    "    sjsp__result[key].count += 1;",
    "};",
    "if (!window.hasOwnProperty('sjsp__interval'))",
    "    window.sjsp__interval = setInterval(function () {",
    "        var sjsp__print = function (x, n) {",
    "            return Array(Math.max(0, n - x.toString().length + 1)).join(' ') + x;",
    "        };",
    "        var sjsp__format = function (x) {",
    "            return 'time: ' + sjsp__print((x.time / 1000).toFixed(2), 7) + 'sec   count: ' + sjsp__print(x.count, 7) + ' ' + sjsp__print(x.fname, 15) + '  ' + sjsp__print(x.name, 13) + '  ' + ' (line:' + sjsp__print(x.line, 4) + ', col:' + sjsp__print(x.col, 3) + ')   ' + x.linestr;",
    "        };",
    "        var sjsp__result_time = Object.keys(sjsp__result).map(function (key) {",
    "            return sjsp__result[key];",
    "        }).sort(function (x, y) {",
    "            return y.time - x.time;",
    "        }).slice(0, 20).map(function (x) {",
    "            return sjsp__format(x);",
    "        });",
    "        var sjsp__result_count = Object.keys(sjsp__result).map(function (key) {",
    "            return sjsp__result[key];",
    "        }).sort(function (x, y) {",
    "            return y.count - x.count;",
    "        }).slice(0, 20).map(function (x) {",
    "            return sjsp__format(x);",
    "        });",
    "        console.log('========== SORT BY TIME ==========\\n' +",
    "                    sjsp__result_time.join(\"\\n\") +",
    "                    '\\n========== SORT BY COUNT ==========\\n' +",
    "                    sjsp__result_count.join(\"\\n\")",
    "                   );",
    "    }, INTERVAL * 1000);",
];

function profiler(interval){
    // rewrite interval number
    var copiedProfileCode = profilerCode.slice();
    var last = copiedProfileCode.length-1;
    copiedProfileCode[last] = copiedProfileCode[last].replace(/INTERVAL/, String(interval));

    return esprima.parse(copiedProfileCode.join('')).body;
}

module.exports = profiler;
