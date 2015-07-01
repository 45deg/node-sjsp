function test1(){
    return 1;
}

function test2(){
    // no return
}

function test3(x){
    if(x > 0) {
        return x;
    } else if (x < 0) {
        return -x;
    }
    return 0;
}

function test4(x){
    if(x > 0) {
        // very heavy addition
        return [1+1, 2+2, 3+3];
    }

    return [4+4, 5+5, 6+6];
}

var test5 = function(){};

var test6 = function(){
    return function(){
        return "anonymous";
    };
};

var testobj = {};

testobj.member = function(){};
var x = testobj.member = function(){};
