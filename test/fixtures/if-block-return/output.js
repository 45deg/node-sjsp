function fn() {
    var sjsp__state = sjsp__start('example.js', 1, 15, 'fn', 'function fn() {');
    if (true) {
        return function (arguments) {
            var sjsp__return = 1;
            sjsp__end(sjsp__state);
            return sjsp__return;
        }.call(this, arguments);
    }
    sjsp__end(sjsp__state);
}
