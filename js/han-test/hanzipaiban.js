(function($, undefined){

var script_path = (function(){
    var js = document.getElementsByTagName('script');
    return js[js.length - 1].getAttribute('src').match(/(.*)(?:^|\/|\\)hanzipaiban.js$/)[1];
})();

// 轉移 hanzipaiban => conf
var conf = {};
if (window.hanzipaiban) {
    for (var i in window.hanzipaiban) conf[i] = window.hanzipaiban[i];
    delete(window.hanzipaiban);
}

/* 載入需要的 js */
loadJQuery();

function loadJQuery() {
    $ = window.jQuery;
    if (!$) loadJS(script_path + '/jquery.js', loadHanziPaiban);
    else loadHanziPaiban();
}

function loadHanziPaiban() {
    $ = window.jQuery;
    if (!$.hanzipaiban) loadJS(script_path + '/jquery.hanzipaiban.js', init);
    else init();
}

function init() {
    $(function(){
        $.hanzipaiban.setup(conf);
        $.hanzipaiban();
    });
}

/**
 * 公用函數
 */
/* $.getScript 本機端無法執行，且不便除錯 */
function loadJS() {
    var head = document.getElementsByTagName('head')[0],
        args = arguments,
        loaded = {},
        callback = args[args.length - 1];

    if (typeof callback !== 'function') callback = null;
    else delete(args[args.length - 1]);

    for (var i in args) {
        var js = document.createElement('script'), url = args[i];
        loaded[url] = false;
        if (callback) {
            js.onload = checkonload;  // most browsers
            js.onreadystatechange = checkonreadystatechange;  // IE 6 & 7
        }
        js.src = url;
        head.appendChild(js);
        // head.removeChild(js);
    }

    function checkonreadystatechange() {
        var url = this.getAttribute('src');
        if (this.readyState == 'complete' && !loaded[url]) {
            loaded[url] = true;
            checkcallback();
        }
    }

    function checkonload() {
        var url = this.getAttribute('src');
        if (!loaded[url]) {
            loaded[url] = true;
            checkcallback();
        }
    }

    function checkcallback() {
        var fail = false;
        for (var i in loaded) {
            if (!loaded[i]) {
                fail = true;
                break;
            }
        }
        if (!fail) {
            callback();
        }
    }
}

})();