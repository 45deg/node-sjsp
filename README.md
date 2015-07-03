# node-sjsp  - Simple JavaScript Profiler

[![Build Status](https://secure.travis-ci.org/45deg/node-sjsp.png?branch=master)](http://travis-ci.org/45deg/node-sjsp)

## What is it

This is a JavaScript profiler implemented in Node.js, inspired by [sjsp](https://github.com/itchyny/sjsp), which is implemented in Haskell.

## How to install

```
npm -g install node-sjsp
```

## Usage

If you want to inject profiling code into `something.js`, run
```
sjsp something.js
```
and then sjsp generates `something.sjsp.js` in the same directory.
(you can use wildcard characters such that `sjsp *.js`)

Next, rewrite your HTML code using `something.js` like below.
```html
<!-- <script src="something.js"></script> -->
<script src="something.sjsp.js"></script>
```

Open the page with your browser and you can see profiles in the JavaScript console every 10 seconds. (you can change this interval by -i option)
```
========== SORT BY TIME ==========
time:    0.60sec   count:    1777    something.js          test1   (line:   7, col:  0)   function test1(){
time:    0.60sec   count:    1701    something.js          test0   (line:   1, col:  0)   function test0(){
time:    0.58sec   count:    1601    something.js          test4   (line:  25, col:  0)   function test4(){
time:    0.57sec   count:    1703    something.js          test2   (line:  13, col:  0)   function test2(){
time:    0.54sec   count:    1632    something.js          test3   (line:  19, col:  0)   function test3(){
time:    0.53sec   count:    1586    something.js          test5   (line:  31, col:  0)   function test5(){
========== SORT BY COUNT ==========
time:    0.60sec   count:    1777    something.js          test1   (line:   7, col:  0)   function test1(){
time:    0.57sec   count:    1703    something.js          test2   (line:  13, col:  0)   function test2(){
time:    0.60sec   count:    1701    something.js          test0   (line:   1, col:  0)   function test0(){
time:    0.54sec   count:    1632    something.js          test3   (line:  19, col:  0)   function test3(){
time:    0.58sec   count:    1601    something.js          test4   (line:  25, col:  0)   function test4(){
```

For details, see [original document](https://github.com/itchyny/sjsp#usage)

## How it works

See [original document](https://github.com/itchyny/sjsp#how-it-works)

## Limitation

This profiling is available for browser only now.

## Author

45deg ([Twitter](https://twitter.com/___zoj))

## LICENSE

MIT
