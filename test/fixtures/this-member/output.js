function fn() {
    var sjsp__state = sjsp__start('example.js', 1, 15, 'fn', 'function fn() {');
    this.method = function () {
        var sjsp__state = sjsp__start('example.js', 2, 30, 'this.method', '    this.method = function() {');
        return function (arguments) {
            var sjsp__return = 1;
            sjsp__end(sjsp__state);
            return sjsp__return;
        }.call(this, arguments);
        sjsp__end(sjsp__state);
    };
    sjsp__end(sjsp__state);
}
