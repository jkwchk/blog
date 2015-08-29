/**
 * jQuery HanziPaiban (漢字排版) Plugin 1.0.0
 *
 * @Requires  jquery (tested on 1.10.2)
 * @License   MIT License
 * @Author    Danny Lin <danny0838@gmail.com>
 */
(function( $, undefined ){
    /**
     * Variables
     */
    var rHighlightFrame = /i?frame/i,
        rHighlightExclude = /script|style|textarea|pre/i,
        rHanzi = /[\u4E00-\u9FFF\uF900-\uFADF\uFE30-\uFE4F\u3400-\u4DBF]/,
        rNonHanzi = /[\u0000-\u2DFF]/;

    /**
     * Configs
     */
    var conf = {
        debug: 0,  // 偵錯模式
        justifyOnly: 0  // 只處理 text-align: justify 的元素
    };

    /**
     * Init
     */
    $.extend({
        // 處理元素，預設 document.body, false
        hanzipaiban: function( object, mode ) {
            if (!mode) {  // 0, false, undefined
                processObject(object || document.body, true);
                return true;
            }
            return false;
        }
    });

    $.extend( $.hanzipaiban, {
        // 配置 hanzipaiban
        setup: function( key, value ) {
            if (typeof key === 'string') {
                conf[key] = value;
            }
            else {
                $.extend( conf, key );
            }
        }
    });

    $.fn.extend({
        hanzipaiban: function( mode ) {
            return this.each(function(){
                $.hanzipaiban( this, mode );
            });
        }
    });

    /**
     * 操作函數
     */
    function processObject(node, includeFrames) {
        var list = [node];  // 待處理陣列，由後往前，0-based
        var i = 0;
        var baseBlock = null;
        var baseBlockAlign = null;
        var baseHanziWidth = null;
        do {
            node = list[i];
            if (node.nodeType === 3) {  // text node
                // 偵測 text node 中的非漢字字元，調整寬度
                if ((baseBlockAlign == 'justify') || (!conf.justifyOnly)) {
                    var nextNode = replaceTextNode(node);
                    if (nextNode) list[i++] = nextNode;
                }
            }
            else if (node.nodeType === 1) {  // normal node
                var nodename = node.nodeName.toLowerCase();
                if (rHighlightFrame.test(nodename)) {
                    if (includeFrames) {
                        var nb = node.contentDocument.body;
                        if (nb) arguments.callee(nb, includeFrames);
                    }
                }
                else if (node.childNodes && !rHighlightExclude.test(nodename)) {
                    var $node = $(node);
                    switch ($node.css('display')) {
                        // 為 block (p, div, ... 等等)，設定標準字體大小的基準
                        // 以內如有大小不同，皆視為非標準，並動態調整寬度
                        case 'block':
                        case 'list-item':
                        case 'table':
                        case 'table-caption':
                        case 'table-header-group':
                        case 'table-footer-group':
                        case 'table-row-group':
                        case 'table-column-group':
                        case 'table-row':
                        case 'table-column':
                        case 'table-cell':
                            baseBlock = node;
                            baseBlockAlign = $(node).css('text-align');
                            baseHanziWidth = getHanziWidth(node);
                            adjustElement(node);
                            var childs = node.childNodes, j = childs.length;
                            while(j) { list[i++] = childs[--j]; }
                            break;
                        // 需要調整寬度的 inline, inline-block 等物件
                        // default:
                            // if ($node.css('position') != 'absolute'){
                                // if ((baseBlockAlign == 'justify') || (!conf.justifyOnly)) {
                                    // adjustWidth(node, baseHanziWidth);
                                // }
                            // }
                            // break;
                    }
                }
            }
        } while (i--);

        function replaceTextNode(node) {
            var
                currentText,
                currentTop,
                currentNonHanzi = [],
                lastTop = 0,
                s;
            while ((s = node.data)) {
                // 將字元一一放入 <span> 並偵測位置
                // node => spanNode, nextNode
                var currentText = s.charAt(0), u = currentText.charCodeAt(0);
                if (u >= 0xD800 && u <= 0xDBFF) currentText += s.charAt(1);  // UTF-16 雙字元字
                var nextNode = node.splitText(currentText.length);  // Y=X.splitText(index) 後X為前面Y為後面
                var textNode = node;
                var spanNode = $('<span/>').text(currentText).get(0);
                textNode.parentNode.replaceChild(spanNode, textNode);
                node = nextNode;

                // 檢查位置及寬度
                var currentTop = spanNode.offsetTop;
                // -- 換行
                if (currentTop != lastTop) {
                    adjustNonHanzi(true);
                }
                // -- 非漢字
                if (!isHanzi(currentText)) {
                    currentNonHanzi.push(textNode);
                }
                // -- 漢字
                else {
                    adjustNonHanzi();
                }

                // 還原為 text node，記錄變數供下次比對
                spanNode.parentNode.replaceChild(textNode, spanNode);
                lastTop = currentTop;
            }
            // adjustNonHanzi();
            // return nextNode;

            function isHanzi(text) {
                var u = text.charCodeAt(0);
                if ( rHanzi.test(text) ) return true;
                if ( rNonHanzi.test(text) ) return false;
                return getTextWidth(text) == baseHanziWidth;
            }

            function adjustNonHanzi(linefeed) {
                if (!currentNonHanzi.length) return false;
                var parent = currentNonHanzi[0].parentNode;
                var baseNode = currentNonHanzi[0];
                if (linefeed) {
                    baseNode = document.createElement('br');
                    parent.insertBefore(baseNode, currentNonHanzi[0]);
                }

                // 建立 span 元素
                // 逐一減去尾部字元，直至少一個漢字寬
                var currentNonHanziText = '';
                for (var i=0, I=currentNonHanzi.length; i<I; ++i) {
                    currentNonHanziText += currentNonHanzi[i].data;
                }
                var $span = $('<span/>');
                var span = $span.get(0);
                span.textContent = currentNonHanziText;
                parent.insertBefore(span, baseNode);
                var totalNonHanziWidth = span.offsetWidth;
                var reducedNonHanziWidth = Math.ceil(totalNonHanziWidth / baseHanziWidth) * baseHanziWidth;
                if (linefeed) reducedNonHanziWidth -= baseHanziWidth;
                while (span.offsetWidth > reducedNonHanziWidth) {
// alert(span.offsetWidth + ' => ' + reducedNonHanziWidth + ' ; ' + span.textContent);
                    span.textContent = currentNonHanziText.substring(0, span.textContent.length-1);
                }
                var delta = reducedNonHanziWidth - span.offsetWidth;
                var right = Math.floor(delta / 2);
                var left = delta - right;
                $span.css({
                    'padding-left': left + 'px',
                    'padding-right': right + 'px'
                });
                if (conf.debug) {
                     $span.css('background-color', '#FFFF99');
 // $span.attr({
    // 'data-currentNonHanziText': currentNonHanziText,
    // 'data-totalNonHanziWidth': totalNonHanziWidth,
    // 'data-reducedNonHanziWidth': reducedNonHanziWidth,
    // 'data-newNonHanziWidth': reducedNonHanziWidth - delta
 // });
                }
                // 取代原來的 text nodes
                var remainChars = $span.text().length;  // 使用的字元數 (其餘留至下一行)
                for (var i=0, I=remainChars; i<I; ++i) {
                    parent.removeChild(currentNonHanzi[i]);
                }
                // 刪除原陣列元素
                currentNonHanzi = currentNonHanzi.slice(remainChars);
                return true;
            }
        }
    }

    /**
     * 排版調整主函數
     */
    function getTextWidth(str, parent, hanziWidth) {
        if (!hanziWidth) hanziWidth = getHanziWidth(parent);
        return getTextWidthSimple('一'+str+'一') - 2 * hanziWidth;
    }

    function getHanziWidth(parent) {
        return getTextWidthSimple('一', parent);
    }

    function getTextWidthSimple(str, parent) {
        var $parent = $(parent);
        var $span = $('<span/>').css({
            'font-size': $parent.css('font-size'),
            'font-family': $parent.css('font-family'),
            'font-weight': $parent.css('font-weight'),
            'padding-top': $parent.css('padding-top'),
            'padding-right': $parent.css('padding-right'),
            'padding-bottom': $parent.css('padding-bottom'),
            'padding-left': $parent.css('padding-left'),
            'white-space': 'nowrap'
        }).text(str);
        $(document.body).append($span);
        var width = $span.width();
        $span.remove();
        return width;
    }

    /* 根據標準漢字字寬，調整元素的寬度 */
    function adjustWidth(element, hanziWidth) {
        var $element = $(element);
        var width = $element.outerWidth(true);
        var delta = (hanziWidth - width % hanziWidth) % hanziWidth;
        if (delta) {
            var right = Math.floor(delta / 2);
            var left = delta - right;
            var pl = $element.css('padding-left'); pl = pl.substring(0, pl.length-2);
            var pr = $element.css('padding-right'); pr = pr.substring(0, pr.length-2);
            $element.css({
                'padding-left': parseInt(pl) + left + 'px',
                'padding-right': parseInt(pr) + right + 'px'
            });
            if (conf.debug) {
                 $element.css('background-color', '#FFFF99');
            }
                
        }
    }

    /* 設定元素的對齊模式（中文不避頭點，英文一律切斷） */
    function adjustElement(element) {
        var $element = $(element);
        if ($element.css('word-break') != 'break-all') {
            $element.css('word-break', 'break-all');
        }
    }

})( jQuery );
